# `Component.js` e `manifest.json` — bootstrap e configuração

> Ver [annotations.md](annotations.md) para o `entitySet` que cada target referencia, e
> [controller-extensions.md](controller-extensions.md)/[fragments-and-custom-ui.md](fragments-and-custom-ui.md)
> para o que é registrado em `extends.extensions` e `content.body.sections`/`controlConfiguration`.

## `Component.js`

Sempre `sap/fe/core/AppComponent` puro — nunca lógica de bootstrap própria, nunca override de
`init`. Toda configuração mora no `manifest.json`.

```js
sap.ui.define(["sap/fe/core/AppComponent"], function (Component) {
    "use strict";
    return Component.extend("currency.Component", {
        metadata: { manifest: "json" }
    });
});
```

## `sap.app.dataSources`

Um `dataSource` por service OData consumido. O service v4 principal é sempre `mainService`, com
`localUri` apontando para `localService/metadata.xml` (snapshot usado por mock/OPA5). Quando a tela
precisa de `callFunction`/import síncrono ou upload binário — coisas que o consumo v4 do `sap.fe`
não expõe diretamente —, registre um segundo `dataSource` v2 do **mesmo** service
(`mainServicev2`), nunca troque o principal.

```json
"dataSources": {
    "mainService": {
        "uri": "/odata/v4/api/user/",
        "type": "OData",
        "settings": { "annotations": [], "localUri": "localService/metadata.xml", "odataVersion": "4.0" }
    },
    "mainServicev2": {
        "uri": "/v2/odata/v4/api/user/",
        "type": "OData",
        "settings": { "annotations": [], "localUri": "localService/metadata.xml", "odataVersion": "2.0" }
    }
}
```

## `sap.app.crossNavigation`

Todo app registra um `inbound` no Fiori Launchpad com `semanticObject`/`action` únicos, título e
subtítulo por chave i18n (`{{flpTitle}}`/`{{flpSubtitle}}`) — nunca hardcoded.

## `sap.ui5.models`

- `i18n`/`@i18n`: `ResourceModel` padrão, bundle `<app>.i18n.i18n`.
- `""` (vazio, model principal): `dataSource: mainService`, sempre com
  `synchronizationMode: None`, `operationMode: Server`, `autoExpandSelect: true`,
  `earlyRequests: true`, `preload: true`.
- `v2` (só quando existir `mainServicev2`): `useBatch: false`,
  `metadataUrlParams: { "sap-documentation": "heading" }`; `defaultBindingMode: TwoWay` só se o
  model v2 também for usado para leitura editável fora do fluxo padrão v4.
- Um `JSONModel` nomeado por estado transiente de extensão (ex.: `documents`, `mileage`,
  `images`) — nunca reaproveite o model principal para dado que não vem do `entitySet` anotado.

## `sap.ui5.routing`

Um par rota/target `ListReport` + `ObjectPage` por `entitySet` principal, nomes de rota/target
sempre `<Entidade>List`/`<Entidade>ObjectPage`. `pattern` da lista é sempre `:?query:`; da Object
Page, `<EntitySet>({key}):?query:`.

```json
"routes": [
    { "pattern": ":?query:", "name": "CurrenciesList", "target": "CurrenciesList" },
    { "pattern": "Currencies({key}):?query:", "name": "CurrenciesObjectPage", "target": "CurrenciesObjectPage" }
],
"targets": {
    "CurrenciesList": {
        "type": "Component", "id": "CurrenciesList", "name": "sap.fe.templates.ListReport",
        "options": { "settings": {
            "entitySet": "Currencies",
            "variantManagement": "Page",
            "navigation": { "Currencies": { "detail": { "route": "CurrenciesObjectPage" } } },
            "controlConfiguration": {
                "@com.sap.vocabularies.UI.v1.LineItem": { "tableSettings": { "selectAll": true, "selectionLimit": 200 } }
            },
            "initialLoad": "Enabled"
        } }
    },
    "CurrenciesObjectPage": {
        "type": "Component", "id": "CurrenciesObjectPage", "name": "sap.fe.templates.ObjectPage",
        "options": { "settings": { "editableHeaderContent": false, "entitySet": "Currencies" } }
    }
}
```

Use `contextPath` em vez de `entitySet` quando a entidade for acessada por navegação de
composição/associação em vez de `entitySet` de topo (padrão em apps geradas a partir de v1.12+ do
generator) — os dois são intercambiáveis, mas não misture os dois estilos na mesma app.

### `controlConfiguration` — customização declarativa

Ajustes de tabela/coluna que não mudam o dado, só a apresentação, vão aqui — nunca em JS:

- `tableSettings.selectAll`/`selectionLimit` no `ListReport` para tabelas com seleção em massa.
- Coluna computada/injetada (ex.: botão de ação) numa faceta de tabela: ver
  [fragments-and-custom-ui.md](fragments-and-custom-ui.md#coluna-customizada).

## `sap.ui5.routing.targets.<ObjectPage>.options.settings.content.body.sections`

Seção customizada da Object Page (dado que não vem do `entitySet` anotado — ex. histórico lido de
outro service, carrossel de imagem). Ver
[fragments-and-custom-ui.md](fragments-and-custom-ui.md#seção-customizada) para o fragment
referenciado por `template`.

## `sap.ui5.extends.extensions.sap.ui.controllerExtensions`

Registro do `ControllerExtension` da Object Page (ou List Report, mais raro). Sempre chaveado pelo
controller padrão do template sendo estendido:

```json
"extends": {
    "extensions": {
        "sap.ui.controllerExtensions": {
            "sap.fe.templates.ObjectPage.ObjectPageController": {
                "controllerName": "myrentingcontract.ext.controller.MyRentingContract"
            }
        }
    }
}
```

Quando a app não tem nenhuma extensão de controller, mantenha o bloco vazio
(`"sap.ui.controllerExtensions": {}`) — não remova a chave, é o placeholder esperado pela tooling do
generator.

## `sap.fiori` / `sap.cloud`

`archeType: "transactional"` por padrão (List Report + Object Page editável). `sap.cloud.service`
é o nome do módulo MTA compartilhado por todas as apps do mesmo projeto — nunca varia por feature.
