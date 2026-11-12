# Component & Manifest — `Component.js` / `manifest.json`

> Padrões de bootstrap da app. Ver [README.md](README.md) para o índice.

## Namespace único por app

Um namespace por projeto, no formato `<empresa>.<app>` (ex.: `cgutech.mytemplate`), usado em
`sap.app.id`, no `viewPath` do roteamento e em todo `sap.ui.define` do `webapp/`:

```json
{
  "sap.app": { "id": "cgutech.mytemplate" }
}
```

Todo módulo (`controller`, `view`, `fragment`, `model`) é referenciado por esse namespace completo
(`cgutech.mytemplate.controller.Home`), nunca por caminho relativo — mantém `sap.ui.define`,
`Fragment.load` e `viewName` de rotas consistentes entre si.

## `Component.init`: ordem fixa de bootstrap

```js
sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/Device",
  "cgutech/mytemplate/model/models",
  "sap/ui/model/json/JSONModel"
], function (UIComponent, Device, models, JSONModel) {
  return UIComponent.extend("cgutech.mytemplate.Component", {
    metadata: { manifest: "json" },
    init: async function () {
      UIComponent.prototype.init.apply(this, arguments);

      // 1. bootstrap de autenticação/contexto do usuário, antes de liberar a navegação
      await this._initialiseUserContext();

      // 2. inicializa o router só depois do contexto do usuário estar resolvido
      this.getRouter().initialize();

      // 3. modelos técnicos (device, estado de navegação) por último
      this.setModel(models.createDeviceModel(), "device");
    }
  });
});
```

**Por quê essa ordem:** o `ODataModel` v4 já é declarado/instanciado pelo `manifest.json`
(`sap.ui5.models`) e a view acessa seus bindings direto (ver [data-connection.md](data-connection.md)).
O contexto do usuário (perfil, empresa/tenant selecionado, permissões) normalmente decide o que a
primeira rota vai renderizar, então resolve-se **antes** de `oRouter.initialize()` — nunca depois,
senão a primeira view monta com o modelo de usuário ainda vazio.

## Bootstrap de contexto do usuário: diálogo bloqueante antes da 1ª rota

Quando a app precisa que o usuário escolha um contexto (empresa, unidade, papel) antes de navegar,
o padrão é abrir um fragment de diálogo modal diretamente via `sap.ui.xmlfragment` (fora do ciclo
de uma view, porque nenhuma view existe ainda) e resolver uma `Promise` só quando o diálogo fecha:

```js
_initialiseUserContext: function () {
  return new Promise((resolve) => {
    this.oContextDialog = sap.ui.xmlfragment(
      "cgutech.mytemplate.view.fragments.SelectContext", this
    );
    this.oContextDialog.setModel(new JSONModel({ /* estado do form */ }), "userContext");
    this._resolveContextDialog = resolve;
    this.oContextDialog.open();
  });
},
onContextConfirmed: function () {
  // ... grava a escolha no modelo do Component
  this._resolveContextDialog();
  this.oContextDialog.close();
}
```

Erros de bootstrap (ex.: usuário sem permissão cadastrada) usam o mesmo mecanismo, mas abrindo um
fragment de erro bloqueante em vez do diálogo de seleção — nunca deixar a app navegar para uma
view com dados de contexto ausentes.

## `manifest.json`: um `dataSource`/`model` por service OData consumido

```json
{
  "sap.app": {
    "dataSources": {
      "main": {
        "uri": "/main/",
        "type": "OData",
        "settings": { "localUri": "localService/metadata.xml", "odataVersion": "4.0" }
      }
    }
  },
  "sap.ui5": {
    "models": {
      "i18n": {
        "type": "sap.ui.model.resource.ResourceModel",
        "settings": { "bundleName": "cgutech.mytemplate.i18n.i18n" }
      },
      "main": {
        "dataSource": "main",
        "preload": true,
        "settings": {
          "synchronizationMode": "None",
          "operationMode": "Server",
          "autoExpandSelect": true,
          "earlyRequests": true
        }
      }
    }
  }
}
```

- Um par `dataSource`/`model` por service de backend consumido (`main`, e um adicional por API
  auxiliar como logs/relatórios) — nunca reaproveitar o mesmo model para dois services distintos.
- `synchronizationMode: "None"` + `operationMode: "Server"` + `autoExpandSelect: true` +
  `earlyRequests: true` é a configuração padrão para OData v4 neste template: sem sincronização
  legada com v2, filtro/expand resolvidos no servidor, e a primeira leitura disparada o mais cedo
  possível.
- Se o mesmo backend precisa ser consumido em v2 e v4 simultaneamente (ex.: uma operação só
  suportada em v2), declarar um segundo `dataSource` apontando pra mesma API com sufixo de versão
  (`mainV2`) — nunca misturar chamadas v2 dentro do model v4 ou vice-versa.

## Roteamento: `routes`/`targets` sempre pareados 1:1

```json
{
  "routing": {
    "config": {
      "routerClass": "sap.m.routing.Router",
      "viewType": "XML",
      "async": true,
      "viewPath": "cgutech.mytemplate.view",
      "controlAggregation": "pages",
      "controlId": "app"
    },
    "routes": [
      { "name": "RouteHome", "pattern": "", "target": ["TargetHome"] },
      { "name": "RouteDetails", "pattern": "resource/{resourceId}:?query:", "target": ["TargetDetails"] }
    ],
    "targets": {
      "TargetHome": { "viewId": "Home", "viewName": "Home", "transition": "slide" },
      "TargetDetails": { "viewId": "Details", "viewName": "Details", "transition": "slide" }
    }
  }
}
```

- Nome de rota sempre `Route<Nome>`, nome de target sempre `Target<Nome>`, e `viewId`/`viewName`
  usam o `<Nome>` puro — facilita achar os três a partir do nome da view sem precisar abrir o
  manifest inteiro.
- Parâmetro de rota de negócio vai no path (`{resourceId}`), nunca em query string; `:?query:` é
  reservado para parâmetros opcionais de navegação (ex.: aba selecionada, filtro pré-aplicado).
- `async: true` sempre — carregamento de view síncrono não é usado neste template.

## Recursos JS/CSS globais declarados no manifest

Bibliotecas third-party sem módulo AMD (ex.: um polyfill de `uuid`) e o CSS global da app entram em
`sap.ui5.resources`, nunca via `<script>`/`<link>` direto no `index.html`:

```json
{
  "sap.ui5": {
    "resources": {
      "js": [{ "uri": "libs/uuid.js" }],
      "css": [{ "uri": "css/style.css" }]
    }
  }
}
```
