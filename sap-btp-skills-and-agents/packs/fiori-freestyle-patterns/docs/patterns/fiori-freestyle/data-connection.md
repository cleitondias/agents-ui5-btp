# Data Connection — Two-Way Data Binding sobre `ODataModel` v4

> Padrão de acesso a dados. Ver [README.md](README.md) para o índice.

## CRUD direto no binding: o controller fala com `ListBinding`/`Context`, sem wrapper próprio

O `sap.ui.model.odata.v4.ODataModel` é **two-way data binding** nativo: a view declara o binding
(lista ou contexto) e o controller lê/escreve diretamente nos objetos de binding (`ListBinding`,
`Context`) devolvidos por ele — sem uma camada própria por cima do `ODataModel` reimplementando CRUD.

Referências oficiais: [Two-Way Binding](https://ui5.sap.com/#/topic/5de13cf4dd1f4a3480f7e2eaaee3f5b8) e
[`sap.ui.model.odata.v4.ODataModel`](https://ui5.sap.com/#/api/sap.ui.model.odata.v4.ODataModel%23overview).

**Por quê:** o v4 já resolve otimisticamente criação/edição/exclusão via `$batch` e expõe eventos
(`createCompleted`, `dataRequested`/`dataReceived`) para acompanhar o ciclo de vida — uma camada de
indireção extra só duplicaria isso com uma API própria, sem ganhar nada em troca. Controllers chamam
os métodos do próprio binding.

## Leitura: binding declarativo na view, nunca `fetch`/`read` manual

```xml
<t:Table
  id="alTableLevels"
  rows="{
    path: '/ApprovalLevels',
    parameters: {
        $expand: 'unit,jobRoleFrom,jobRoleTo',
        $orderby: 'requestType,fromAmount,toAmount'
    }
  }"
>
```

- O path, `$expand` e `$orderby` vivem na declaração do binding na `view.xml` — o controller nunca
  dispara uma leitura manual equivalente (`bindContext().requestObject()` etc.) só para popular a
  tela; a leitura acontece porque a `Table`/`List` está com aggregation binding montado.
- Filtro de tela (FilterBar, campo de busca) atua **sobre esse mesmo binding** via
  `getBinding("rows").filter(aFilters, FilterType.Application)` — nunca refaz a leitura do zero a
  cada busca.

## Reload após CRUD: rebind da aggregation, nunca `refresh()`

```js
// Espelha o binding declarado em "rows" na view, mais os filtros ativos da FilterBar.
_reloadLevelsTable() {
  return new Promise((resolve) => {
    this.byId("alTableLevels").bindRows({
      path: "/ApprovalLevels",
      parameters: {
        $expand: "unit,jobRoleFrom,jobRoleTo",
        $orderby: "requestType,fromAmount,toAmount"
      },
      filters: this._aActiveFilters || [],
      events: {
        dataReceived: () => resolve()
      }
    });
  });
}
```

`create()` sempre insere a linha nova no topo da lista, ignorando o `$orderby` do binding — e
`refresh()` não corrige isso: o contexto recém-criado fica "kept alive" na posição original (topo),
então o refresh mostra a linha nova **duplicada** (a antiga presa no topo + a relida na posição
correta) em vez de substituí-la. Rebindar a aggregation do zero (`bindRows`/`bindItems`, com o mesmo
path/parameters/filtros declarados na view) descarta esse binding/contexto obsoleto por completo.
Resolver a `Promise` no evento `dataReceived`, nunca logo após chamar `bindRows` (que é síncrono, mas
a leitura em si não é).

## Criação: `oListBinding.create()` é otimista — sempre esperar `createCompleted`

```js
const oListBinding = this.byId("alTableLevels").getBinding("rows");
const oContext = oListBinding.create(oPayload);
try {
  await this._waitForCreate(oListBinding, oContext);
} catch (oCreateError) {
  // Descarta a linha transiente localmente para um retry não deixar um registro fantasma
  // (nenhum request é enviado, já que ela nunca chegou a ser persistida).
  oContext.delete();
  throw oCreateError;
}
await this._reloadLevelsTable();

// oContext.created() não é rejeitada de forma confiável quando o backend devolve um erro de
// validação (ex.: req.error(400, ...) no CAP): https://github.com/UI5/openui5/issues/3401.
// O evento "createCompleted" do list binding é o sinal confiável de sucesso/falha.
_waitForCreate(oListBinding, oContext) {
  return new Promise((resolve, reject) => {
    const fnCompleted = (oEvent) => {
      if (oEvent.getParameter("context") !== oContext) return;
      oListBinding.detachCreateCompleted(fnCompleted);
      if (oEvent.getParameter("success")) resolve();
      else reject(this._getContextError(oContext));
    };
    oListBinding.attachCreateCompleted(fnCompleted);
  });
}
```

- Nunca tratar o retorno de `oListBinding.create(oData)` como sucesso — ele devolve o `Context`
  transiente imediatamente, antes do `$batch` ser confirmado pelo backend.
- Em caso de falha, `oContext.delete()` remove a linha transiente **sem** disparar request (ela
  nunca foi persistida) — é isso que evita a linha fantasma numa nova tentativa.

## Edição: `Context.setProperty()` direto — sem payload/`update()` genérico

```js
await Promise.all(
  Object.keys(oPayload).map((sKey) => this._oSelectedContext.setProperty(sKey, oPayload[sKey]))
);
// unit/jobRoleFrom/jobRoleTo são navigation properties $expand'ed; atualiza a linha para que
// os textos de descrição reflitam os valores que acabaram de ser gravados.
await this._oSelectedContext.requestSideEffects(["unit", "jobRoleFrom", "jobRoleTo"]);
```

- Cada campo alterado é escrito individualmente via `setProperty` no `Context` já obtido da seleção
  da tabela/linha (`oRow.getBindingContext()`, guardado em `onRowSelectionChange`) — o two-way
  binding já agrupa essas escritas no mesmo `$batch`, sem precisar de um `update({...})` genérico
  que monte o payload por fora.
- Depois de um `setProperty` que afeta campos derivados de navigation properties expandidas, chamar
  `oContext.requestSideEffects([...])` com os nomes das navigations afetadas — nunca assumir que o
  texto de descrição relacionado já está atualizado só porque o campo de chave foi salvo.

## Exclusão: `Context.delete()`

```js
onDeletePress(oEvent) {
  const oContext = oEvent.getParameter("row").getBindingContext();
  if (!oContext) return;
  MessageBox.confirm(sConfirmText, {
    onClose: async (sAction) => {
      if (sAction !== MessageBox.Action.OK) return;
      await oContext.delete();
    }
  });
}
```

`Context.delete()` já remove a linha do binding (e da UI) assim que o `$batch` confirma — não é
necessário recarregar a tabela manualmente depois de uma exclusão bem-sucedida (diferente do fluxo
de criação, que precisa de rebind por causa do `$orderby`).

## Erros de negócio: `getMessages(oContext)`, com fallback para mensagens não vinculadas

```js
// CAP levanta req.error(400, "...") sem "target" explícito (ex.: validação que depende de
// múltiplos campos) como mensagem não vinculada a nenhum contexto — ela não aparece em
// getMessages(oContext), só no model global de Messaging.
_getContextError(oContext) {
  let aMessages = this.getView().getModel().getMessages(oContext);
  if (!aMessages.length) {
    aMessages = Messaging.getMessageModel().getData().filter((oMsg) => !oMsg.getTargets().some(Boolean));
  }
  const oMessage = aMessages.find((oMsg) => oMsg.getType() === "Error") || aMessages[aMessages.length - 1];
  if (oMessage) Messaging.removeMessages(oMessage);
  return oMessage ? new Error(oMessage.getMessage()) : new Error("");
}
```

Mostrar o texto técnico do backend (`oError.message`) só atrás do "Ver detalhes" do `MessageBox`,
nunca como texto principal — a mensagem de erro do CAP é redação técnica, não copy voltada ao
usuário final.

## Actions/functions sem binding (download, geração de arquivo, endpoint custom): `fetch` + `resolveUri`

```js
async generateReport({ resourceId }) {
  const sPath = `main/GenerateReport(resource_ID='${resourceId}')`;
  const sURI = this.getOwnerComponent().getManifestObject().resolveUri(sPath);
  const signal = AbortSignal.timeout(60000); // 60s
  return fetch(sURI, { signal }).then((res) => res.json());
}
```

Para actions/functions OData que não fazem sentido modelar como list/context binding (retornam
binário, PDF, ou um payload que não é uma entidade navegável), usar `fetch` direto contra a URI
resolvida pelo manifest (`getManifestObject().resolveUri`) em vez de path hardcoded — resolve
automaticamente o prefixo correto do `dataSource` em qualquer ambiente (local/BTP). Sempre com
`AbortSignal.timeout(...)` explícito: uma function de geração de relatório/arquivo não deve travar
a UI indefinidamente se o backend não responder. Isso continua fora do binding two-way porque não há
entidade/contexto para ler ou escrever.

## Validação client-side: espelha as anotações do CDS, roda antes de qualquer escrita

```js
// Mirrors the CDS validations defined on payment.condition.request.ApprovalLevels
// (@mandatory fields, fromAmount >= 1 and toAmount > fromAmount). Overlap entre ranges é
// só validado server-side, pois depende de dados não disponíveis no cliente.
_getDialogValidationErrors(oData) {
  const aErrors = [];
  // ... checagem de obrigatoriedade + regras de negócio simples (min/max, comparação entre campos)
  return aErrors; // vazio quando válido
}
```

- Mantida como função pura (recebe dados, devolve lista de erros, sem side effect de UI) para
  poder ser reusada tanto no botão Salvar (`_validateDialog`, que também seta `valueState`/
  `valueStateText`) quanto na checagem "ao vivo" que habilita/desabilita o botão Salvar a cada
  mudança de campo (`_updateDialogValidity`).
- Ler o **texto exibido no controle** (`this.byId(sControlId).getValue()`) para validar números,
  não o valor já escrito no modelo via two-way binding: quando o texto digitado falha o parse do
  `Float`/`Integer` type binding (ex. `"abc"`), o framework marca o `Input` como inválido mas nunca
  chega a escrever no modelo — validar só pelo modelo deixaria passar esse caso.
- Validação de overlap/unicidade que depende de outros registros no backend nunca é replicada no
  cliente — só o servidor tem a visão completa; o client-side cobre exclusivamente o que já está
  anotado como regra local (`@mandatory`, `@assert.range`, comparação entre dois campos do mesmo
  formulário).

## Cache local de rascunho: buffer de mudanças em `localStorage`, com merge idempotente

Para telas de edição em lote onde o usuário acumula várias alterações antes de um "Enviar" único
(e a app precisa sobreviver a um refresh de página sem perder o que foi editado):

```js
updateDraftBuffer({ scopeId, version, oChange }) {
  const cache = this.getLocalStorage("draftBuffer") ?? { changes: [] };

  if (cache.scopeId !== undefined && cache.scopeId !== scopeId) {
    return { status: "error", message: "Rascunho pertence a outro escopo" };
  }

  const sChangeId = this.generateChangeId(oChange.type, oChange.newValue ?? oChange.oldValue);
  const iExisting = cache.changes.findIndex((c) => c.ID === sChangeId);
  const existing = cache.changes[iExisting];

  // usuário desfez a alteração manualmente => remove do buffer em vez de guardar um "no-op"
  const userRevertedChange = existing?.oldValue && this.compareObjectPropsIfEqual(oChange.newValue, existing.oldValue);

  if (userRevertedChange) cache.changes.splice(iExisting, 1);
  else if (!existing) cache.changes.push({ ID: sChangeId, ...oChange });
  else Object.assign(existing, { newValue: oChange.newValue });

  this.setLocalStorage("draftBuffer", { scopeId, version, modifiedAt: new Date().toISOString(), changes: cache.changes });
}
```

Pontos fixos desse padrão, reaplicáveis a qualquer tela de edição em lote:
- Um `ID` de mudança **determinístico** (hash/UUID v5 a partir do tipo + identidade do registro
  alterado), nunca um UUID aleatório — é o que permite detectar "essa célula já tem uma mudança
  pendente" e sobrescrever em vez de duplicar.
- Ao registrar uma nova edição sobre um campo já alterado, comparar o novo valor contra o valor
  original (`oldValue`) da primeira mudança registrada: se voltou ao original, remove a entrada do
  buffer em vez de manter um registro "mudou para o mesmo valor de antes".
- O buffer inteiro é escopado (`scopeId` — tenant, empresa, projeto) e a tela recusa continuar
  editando um rascunho de outro escopo — força o usuário a descartar ou trocar de contexto antes.
- Buffer expira por tempo (ver `utils/utils.js#getCacheStatus` — janelas de "auto-recovery" vs.
  "tempo máximo de cache") e, dentro da janela de recovery, a tela pergunta ao usuário se quer
  recuperar ou descartar ao reabrir — nunca restaura silenciosamente um rascunho antigo sem
  confirmação.

## `utils.js`: helpers puros de manipulação de array/objeto, sem estado e sem UI5

```js
mapArray: function (sKey, aArray) {
  return aArray.reduce((acc, curr, index) => {
    if (!curr.hasOwnProperty(sKey)) return acc;
    acc[curr[sKey]] = { data: curr, index };
    return acc;
  }, {});
},
compareObjectPropsIfEqual: function (oCompare, oBase) { /* comparação estrutural profunda,
  ordenando arrays por uma prop tipo *ID antes de comparar item a item */ },
validateRequiredInObject: function (oObj, aExtraExcluded = []) {
  const aExcluded = ["createdAt", "createdBy", "modifiedAt", "modifiedBy", ...aExtraExcluded];
  return Object.entries(oObj).some(([k, v]) =>
    !aExcluded.includes(k) && (v === null || v === undefined || String(v).trim() === "")
  );
}
```

- `mapArray(key, array)`: converte uma lista em mapa indexado por chave (`{ [id]: { data, index } }`)
  para lookup O(1) — usar sempre que uma tela vai cruzar duas listas pelo mesmo campo (ex.: enriquecer
  linhas de uma tabela com o nome vindo de outra entidade) em vez de `array.find()` dentro de um loop.
- `compareObjectPropsIfEqual`: dirty-check estrutural antes de persistir uma edição — chamar antes de
  disparar um `setProperty` em lote para decidir se há algo de fato mudado (evita round-trip vazio ao
  backend e é a mesma verificação usada no buffer de rascunho acima, para detectar "usuário desfez a
  edição").
- `validateRequiredInObject`: validador genérico de formulário plano — os campos de auditoria
  (`createdAt`/`createdBy`/`modifiedAt`/`modifiedBy`) ficam sempre excluídos por padrão da checagem de
  obrigatoriedade, porque nunca são preenchidos pelo próprio formulário.

## `localStorage`: sempre via par `getLocalStorage`/`setLocalStorage`, nunca `JSON.parse`/`stringify` inline

```js
setLocalStorage: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
getLocalStorage: (k) => JSON.parse(localStorage.getItem(k)),
removeLocalStorage: (k) => localStorage.removeItem(k)
```

Centraliza a serialização — qualquer mudança futura (namespacing de chave, criptografia,
migração para IndexedDB) é um ponto de alteração só.
