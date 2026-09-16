# Controllers — `controller/BaseController.js`

> Padrão de organização da camada de controller. Ver [README.md](README.md) para o índice.

## Todo controller estende `BaseController`

```js
sap.ui.define([
  "inetum/mytemplate/controller/BaseController"
], function (BaseController) {
  return BaseController.extend("inetum.mytemplate.controller.Home", {
    onInit: function () { /* ... */ }
  });
});
```

`BaseController` concentra todo comportamento transversal de UI (acesso a modelo, navegação,
diálogos, mensagens, i18n) e expõe as libs mais usadas (`MessageBox`, `MessageToast`, `formatter`,
`utils`) como propriedades da própria instância — nenhum controller de tela importa essas libs
diretamente, sempre via `this.MessageBox`, `this.formatter`, etc. **Por quê:** um único ponto de
import evita divergência de versão/instância e deixa o controller de tela focado só na lógica da
tela.

## Acesso a modelo: sempre por par get/set, nunca `getView().getModel()` direto

```js
getModel: function (sName) {
  const oModel = this.getView().getModel(sName);
  return oModel?.bDestroyed ? undefined : oModel;
},
setModel: function (oData, sName) {
  return this.getView().setModel(new sap.ui.model.json.JSONModel(oData), sName);
},
getComponentModel: function (sName) { /* mesma coisa, na escala do Component */ },
setComponentModel: function (oData, sName) { /* idem */ }
```

- `getModel`/`setModel` operam no escopo da **view** (estado local daquela tela); `getComponentModel`/
  `setComponentModel` operam no escopo do **Component** (estado compartilhado entre todas as
  telas — usuário logado, contexto/tenant selecionado, rascunho em edição). Decidir o escopo pela
  pergunta "esse dado precisa sobreviver a uma navegação para outra tela?".
- `getModel` sempre confere `bDestroyed` antes de retornar — um model de uma view já destruída
  (navegação para trás, re-render) não deve ser reaproveitado silenciosamente.

## Diálogos e popovers: fragment cacheado na instância do controller, por id

```js
onOpenDialog: function (sDialogId) {
  if (!this[sDialogId]) {
    this[sDialogId] = this._createFragment(sDialogId);
  }
  return this[sDialogId].then((oDialog) => {
    this.getView().insertDependent(oDialog);
    oDialog.open();
    oDialog._dialogName = sDialogId;
    return oDialog;
  });
},
_createFragment: function (sFragment) {
  return Fragment.load({
    name: `inetum.mytemplate.view.fragments.${sFragment}`,
    id: this.getView().getId(),
    controller: this
  });
},
onCloseDialog: function () {
  this.getDialogOpen()?.close();
},
getDialogOpen: function (sDialogId) {
  return this.getView().getDependents().find((d) =>
    sDialogId ? d.isOpen() && d._dialogName === sDialogId : d.isOpen()
  );
}
```

- O nome do fragment (`sDialogId`) é o mesmo nome usado como chave de cache na instância do
  controller (`this[sDialogId]`) — carregado uma única vez por controller, reaberto sem recriar o
  fragment nas vezes seguintes.
- `id: this.getView().getId()` escopa os IDs internos do fragment à view — necessário para poder
  ter o mesmo fragment carregado em múltiplas instâncias da mesma view (ex.: navegação repetida)
  sem colisão de ID.
- `_dialogName` marcado na própria instância do diálogo é o que permite `onCloseDialog`/
  `getDialogOpen` genéricos funcionarem com múltiplos diálogos abertos ao mesmo tempo, sem cada
  tela precisar guardar sua própria referência.
- Popover segue o mesmo cache-por-id, mas com `openBy(oEvent.getSource())` em vez de `open()`.

## Navegação: `navTo`/`navBack` via router do Component

```js
navTo: function (sRoutePath, oParams) {
  return this.getOwnerComponent().getRouter().navTo(sRoutePath, oParams);
},
navBack: function () {
  if (history.length > 1) return history.back();
  this.navTo("RouteHome");
}
```

`navBack` sempre tenta `history.back()` primeiro (preserva o estado de navegação real do browser,
incluindo parâmetros de query) e só cai para uma rota fixa de home quando não há histórico — ex.:
app aberta direto numa URL profunda.

## Mensagens: um único helper para todas as variantes de `MessageBox`

```js
showMessageBox: function ({ type, message, settings }) {
  const byType = {
    error: MessageBox.error,
    success: MessageBox.success,
    confirm: MessageBox.confirm,
    alert: MessageBox.alert,
    information: MessageBox.information,
    warning: MessageBox.warning
  };
  return byType[type]?.(message, settings);
},
customError: function (sUserMessage, oError) {
  MessageToast.show(sUserMessage);
  console.error(oError);
}
```

- `showMessageBox({ type, message, settings })` é chamado de qualquer controller passando o tipo
  como string em vez de importar `MessageBox` e escolher o método — mantém a decisão de estilo de
  mensagem (erro vs. confirmação vs. sucesso) uniforme e fácil de trocar num só lugar se necessário.
- `customError` é o padrão para toda falha que já foi tratada/tem mensagem amigável: toast curto
  para o usuário, detalhe técnico completo só no `console.error` — nunca `alert`/`MessageBox.error`
  com stack trace ou erro técnico bruto.

### Confirmação de exclusão: helper único parametrizado pelo texto do componente

```js
handleOpenDeleteMessageBox: function (oEvent, sDeletedComponentI18nKey, fOnConfirm) {
  return this.showMessageBox({
    type: "warning",
    message: this.getI18nText("msg_generic_delete_component"),
    settings: {
      title: `${this.getI18nText("delete")} ${this.getI18nText(sDeletedComponentI18nKey)}`,
      actions: [MessageBox.Action.CANCEL, MessageBox.Action.YES],
      emphasizedAction: MessageBox.Action.YES,
      onClose: (sAction) => {
        if (sAction === MessageBox.Action.YES) fOnConfirm.call(this, oEvent);
      }
    }
  });
}
```

Toda exclusão na app passa por esse único helper genérico (mensagem/título montados a partir de
chaves i18n + o nome do que está sendo excluído), em vez de cada tela escrever seu próprio
`MessageBox.warning` — garante o mesmo texto e o mesmo par de ações (`CANCEL`/`YES`, `YES`
emphasizado) em toda confirmação destrutiva da app.

## i18n: helper com fallback silencioso para a própria chave

```js
getI18nText: function (sKey, ...aArgs) {
  const oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
  return oResourceBundle.hasText(sKey) ? oResourceBundle.getText(sKey, aArgs) : sKey;
}
```

Controllers **nunca** chamam `getResourceBundle().getText(...)` diretamente — sempre
`this.getI18nText(sKey, ...)`. O fallback (retornar a própria chave quando ela não existe) evita
que uma chave de i18n faltante quebre a tela com um texto tipo `undefined`; em vez disso a UI
mostra a chave crua, que é imediatamente identificável como "falta traduzir" durante QA.

## Nomenclatura de métodos: três prefixos, três responsabilidades

- `_camelCase` (com underscore): método privado/interno do controller, nunca referenciado no XML
  (`_onObjectMatched`, `_fetchListData`).
- `onX`: handler ligado direto a um evento de controle no XML (`onSearch`, `press=".onOpenDialog"`)
  — corpo curto, delega para um `handleX`/`_privado` quando a lógica passa de poucas linhas.
- `handleX`: orquestração de uma ação do usuário que envolve mais de um passo (abrir diálogo,
  validar, chamar serviço, atualizar lista) — `handleOpenAddResourceDialog`,
  `handleSaveResource`, `handleDeleteResource`.

Manter essa separação mesmo em controllers pequenos: um `onX` que já nasce como o próprio
orquestrador tende a crescer e ficar difícil de reutilizar a partir de outro evento (ex.: mesmo
save disparado por Enter no input e por clique no botão).

## Carregar dados no match da rota, nunca no `onInit`

```js
onInit: function () {
  this.getOwnerComponent().getRouter().getRoute("RouteDetails").attachPatternMatched(this._onObjectMatched, this);
},
_onObjectMatched: function (oEvent) {
  const { resourceId } = oEvent.getParameter("arguments");
  this._fetchResourceData(resourceId);
}
```

`onInit` só registra o listener de rota; a busca de dados em si mora em `_onObjectMatched`. **Por
quê:** a view em roteador `sap.m.routing.Router` com `clearControlAggregation: false` não é
recriada a cada navegação — se os dados fossem carregados no `onInit`, voltar para uma tela já
visitada mostraria dados desatualizados até o usuário forçar um refresh manual.

## Fluxo padrão de diálogo de criação/edição (form model + discriminador de ação)

```js
handleOpenResourceDialog: function (oEvent, sAction) {
  const oContext = sAction === "edit" ? oEvent.getSource().getBindingContext("main") : null;
  this.setModel({ action: sAction, form: oContext?.getObject() ?? {} }, "resourceForm");
  this.onOpenDialog("AddResource");
},
handleSaveResource: async function () {
  const { action, form } = this.getModel("resourceForm").getData();

  if (this.utils.validateRequiredInObject(form)) {
    return this.MessageToast.show(this.getI18nText("msg_required_fields"));
  }

  this.getView().setBusy(true);
  try {
    if (action === "add") await models.createResource(form);
    else await models.editResource(form, form.ID);

    this.onCloseDialog();
    await this._fetchResourceData();
  } catch (error) {
    this.customError(this.getI18nText("msg_generic_save_error"), error);
  } finally {
    this.getView().setBusy(false);
  }
}
```

Esse mesmo esqueleto (modelo de formulário transiente com `{action, form}` → `onOpenDialog` →
validar campos obrigatórios com `utils.validateRequiredInObject` → branch por `action` chamando o
`models.*` correspondente → fechar diálogo → recarregar a lista, tudo dentro de
`setBusy(true)/finally setBusy(false)`) se repete em toda tela de criação/edição via diálogo —
manter os mesmos nomes de passo (`handleOpenXDialog`/`handleSaveX`) para que qualquer novo CRUD
seja reconhecível de longe.

## Busca em lista: `Filter` client-side sobre o binding, nunca recarregar do backend a cada tecla

```js
onSearch: function (oEvent) {
  const sQuery = oEvent.getParameter("newValue") ?? oEvent.getParameter("query");
  const oFilter = new Filter("name", FilterOperator.Contains, sQuery);
  this.byId("resourceList").getBinding("items").filter(sQuery ? [oFilter] : []);
}
```

Campo de busca client-side (`liveChange`) filtra o binding já carregado (`getBinding("items")`)
com `"Application"` como grupo de filtro implícito — não dispara uma nova requisição OData por
tecla digitada. Reservar filtro server-side (`oURLParams.$filter` na camada `models.js`) para
telas cuja lista base já vem paginada/filtrada do backend.

## Padronizar a resposta de uma chamada de serviço em `{status, data}` / `{status, message}`

```js
async adaptRequest(promise) {
  try {
    const oResponse = await promise;
    delete oResponse["@odata.context"];
    return { status: "ok", data: oResponse };
  } catch (error) {
    if (error.status === 404) return { status: "error", statusCode: error.status };
    console.error(error.message);
    return { status: "error", message: error.message };
  }
}
```

Fluxos de tela com múltiplos pontos de decisão pós-chamada (existe/não existe, sucesso/erro de
regra de negócio) usam esse wrapper em vez de deixar o `try/catch` espalhado pelo handler do
evento — quem chama decide o próximo passo só olhando `status`, sem precisar saber a forma da
exceção lançada pela camada de conexão.
