# Data Connection — `connection/*` e `model/models.js`

> Padrão de acesso a dados. Ver [README.md](README.md) para o índice.

## Duas camadas: `connector` (mecânica OData) e `models` (API de negócio)

- `connection/connector.js` (por versão de OData consumida, ex. `connector.js` para v2/v4) sabe
  **como** falar com o `ODataModel` — bind de lista/contexto, criação, atualização, exclusão. Não
  conhece nenhuma entidade específica do domínio.
- `model/models.js` sabe **o que** a app precisa do backend — uma função por operação de negócio
  (`getResource`, `createResource`, `editResource`, `deleteResource`), cada uma chamando o
  `connector` com o `sPath`/entidade certos.

Controllers **nunca** chamam o `connector` diretamente — sempre passam por `models.<operação>()`.
**Por quê:** isso mantém um único lugar por entidade onde o path OData e o nome do model estão
escritos; se o path mudar, só `models.js` precisa ser tocado.

```js
// connection/connector.js — genérico, reutilizável em qualquer entidade
read: async function ({ sModelName, sPath, oURLParams, oContext }) {
  const oDataContext = this.getODataModel(sModelName).bindContext(sPath, oContext, oURLParams);
  const oResponse = await oDataContext.requestObject();
  return oResponse.value || oResponse;
},
create: async function ({ sModelName, oData, sPath, oContext, bSkipRefresh = false }) {
  const oListBinding = this._oDataBindingList(sModelName, sPath, oContext);
  const oEntity = oListBinding.create(oData, bSkipRefresh);
  await this._waitCreateCompleted(oListBinding); // rejeita se houver erro de batch
  return oEntity;
}

// model/models.js — uma função por operação de negócio
getResource: function (oURLParams) {
  return connector.read({ sModelName: "main", sPath: "/Resource", oURLParams });
},
createResource: function (oData) {
  return connector.create({ sModelName: "main", sPath: "/Resource", oData });
}
```

## Wrapper de CRUD sobre `ODataModel` v4: sempre via list/context binding, nunca `submitBatch` manual

```js
_oDataBindingList: function (sModelName, sPath, oContext, oURLParams, oFilter, oSort) {
  return this.getODataModel(sModelName).bindList(sPath, oContext, oSort, oFilter && [oFilter], oURLParams);
},
update: async function ({ sModelName, oChangedData, sPath, sID, oContext, oURLParams }) {
  const oSettings = sID ? { $filter: `ID eq ${sID}` } : oURLParams;
  const oListBinding = this._oDataBindingList(sModelName, sPath, oContext, oSettings);
  const [oContextRow] = await oListBinding.requestContexts();
  await Promise.all(Object.entries(oChangedData).map(([k, v]) => oContextRow.setProperty(k, v)));
  return oContextRow.requestObject();
},
delete: async function ({ sModelName, sPath, sID, oContext, oURLParams }) {
  const oListBinding = this._oDataBindingList(sModelName, sPath, oContext, sID ? { $filter: `ID eq ${sID}` } : oURLParams);
  const [oContextRow] = await oListBinding.requestContexts();
  await oContextRow.delete();
  return oContextRow.oDeletePromise.getResult();
}
```

- `read`/`create`/`update`/`delete`/`updateMany` do connector aceitam sempre o mesmo formato de
  parâmetros nomeados (`{ sModelName, sPath, ... }`) — nunca posicionais — para que qualquer nova
  operação siga o mesmo shape e a assinatura não dependa de lembrar ordem de argumento.
- `update`/`delete` aceitam **ou** `sID` (atalho para filtrar por `ID eq <valor>`) **ou**
  `oURLParams`/`oFilter` livre — usar `sID` só quando a chave é um único campo simples chamado
  `ID`; caso a entidade tenha chave composta, sempre `oURLParams`/`oFilter` explícito.
- `create` espera a conclusão real do batch antes de resolver a Promise, tratando erro de batch
  (`mMessages`) como rejeição — nunca assumir que `bindList().create()` já significa sucesso, já
  que a criação em v4 é otimista e só se confirma no `attachCreateCompleted`.

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
a UI indefinidamente se o backend não responder.

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
  disparar um `update` para decidir se há algo de fato mudado (evita round-trip vazio ao backend e é a
  mesma verificação usada no buffer de rascunho acima, para detectar "usuário desfez a edição").
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
