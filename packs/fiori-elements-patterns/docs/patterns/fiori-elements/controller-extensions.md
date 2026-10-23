# `ext/controller/*.js` — extensão de comportamento

> Ver [component-and-manifest.md](component-and-manifest.md#sapui5extendsextensionssapuicontrollerextensions)
> para o registro no manifest, e [fragments-and-custom-ui.md](fragments-and-custom-ui.md) para o
> par fragment + handler usado em seções/colunas customizadas (padrão mais leve, sem
> `ControllerExtension`).

Use `ControllerExtension` só quando o caso genuinamente não é coberto por anotação: ler dado que não
vem do `entitySet` da tela (outro service, endpoint HTTP externo), popular um `JSONModel` auxiliar
usado por uma seção customizada, ou reagir à navegação de rota com lógica que não é CRUD padrão.
Nunca crie um controller extension para o que uma anotação `@UI`/`@Common` resolveria (ver
[annotations.md](annotations.md)).

## Esqueleto

```js
sap.ui.define([
    'sap/ui/core/mvc/ControllerExtension',
    "sap/ui/model/json/JSONModel"
], function (ControllerExtension, JSONModel) {
    'use strict';

    return ControllerExtension.extend('myrentingcontract.ext.controller.MyRentingContract', {
        override: {
            onInit: function () {
                this.base.getAppComponent().getRouter().attachRoutePatternMatched(function (oEvent) {
                    if (oEvent.getParameter("name") === "MyRentingContractObjectPage") {
                        this._readMileageHistory(oEvent);
                    }
                }.bind(this));
            }
        },

        _readMileageHistory: function (oEvent) { /* ... */ }
    });
});
```

Pontos fixos:

- Nome totalmente qualificado (`<app>.ext.controller.<Nome>`) igual ao registrado em
  `controllerName` no manifest.
- Toda lógica de inicialização entra em `override.onInit`, nunca em `override.onAfterRendering` —
  a Object Page do Fiori Elements já dispara `onInit` depois que a view existe.
- Carregamento de dado dependente da chave da tela **sempre** dentro de
  `attachRoutePatternMatched`, filtrado por `oEvent.getParameter("name")` — nunca assuma que
  `onInit` já tem a `key` disponível (o controller extension é instanciado antes da navegação
  resolver).
- Acesso a API do Fiori Elements via `this.base` (`this.base.getView()`,
  `this.base.getModel()`, `this.base.getAppComponent()`, `this.base.getExtensionAPI()`) — o
  controller extension não é dono da view, é um mixin sobre o controller gerado.

## Leitura fora do model principal

Chamada de function import v2 (`callFunction`) ou fetch cru (`$.get`) contra o service URL do model
principal, sempre com tratamento de erro explícito:

```js
_readCompanyDocuments: function () {
    this.base.getModel("v2").callFunction("/readCompanyDocuments", {
        method: "GET",
        success: this._readCompanyDocumentsSuccess.bind(this),
        error: this._readCompanyDocumentsError.bind(this)
    });
},
_readCompanyDocumentsError: function (oError) {
    throw new Error(oError)
}
```

Resultado de leitura auxiliar sempre num `JSONModel` nomeado (registrado em `sap.ui5.models` do
manifest, ver [component-and-manifest.md](component-and-manifest.md#sapui5models)), setado no
`AppComponent` ou na `View` conforme o escopo:

```js
_readCompanyDocumentsSuccess: function (oData) {
    if (oData.results.length) {
        this.base.getAppComponent().getModel("documents").setData(oData);
        this.base.getView()
            .byId("rentingcontract::RentingContractObjectPage--fe::CustomSubSection::CompanyDocuments--idDocumentTable")
            .setModel(this.base.getAppComponent().getModel("documents"));
    }
}
```

### Convenção de ID de controle gerado

Controle dentro de uma seção customizada (ver
[fragments-and-custom-ui.md](fragments-and-custom-ui.md#seção-customizada)) recebe um ID composto
pelo runtime do Fiori Elements: `<viewId>--fe::CustomSubSection::<NomeDaSeção>--<idDoControleNoFragment>`.
Nunca adivinhe esse ID — abra o app no navegador, inspecione o DOM (ou o log do
`sap-ui-debug=true`) e copie o ID exato antes de referenciá-lo em `byId`.

## Filtro por parâmetro de rota composta (chave de associação N:N)

Quando a rota tem chave composta (`key2` com múltiplos segmentos), parseie manualmente antes de
montar o `Filter`:

```js
_createFilters: function (oEvent) {
    let renting_contract_id = oEvent.getParameter("arguments").key2.split(",")[0].split("=")[1];
    let begin_date = oEvent.getParameter("arguments").key2.split(",")[1].split("=")[1];
    return [
        new Filter("renting_contract_employee_renting_contract_renting_contract_id", FilterOperator.EQ, renting_contract_id),
        new Filter("renting_contract_employee_begin_date", FilterOperator.EQ, begin_date),
    ];
}
```

## Quando não usar `ControllerExtension`

Ação de negócio disparada por um botão de coluna/seção customizada (upload, download, chamada de
function) não precisa de `ControllerExtension` — vai direto no `.js` companion do fragment, com
`this` = o controller da Object Page injetado via `core:require` (ver
[fragments-and-custom-ui.md](fragments-and-custom-ui.md)). Reserve `ControllerExtension` para o que
precisa rodar automaticamente no ciclo de vida da tela (`onInit`/navegação), não para handler de
clique isolado.
