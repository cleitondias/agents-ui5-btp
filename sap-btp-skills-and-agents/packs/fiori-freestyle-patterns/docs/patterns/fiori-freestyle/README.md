# Patterns — SAPUI5 Freestyle (Inetum)

> Padrões de arquitetura e código para apps SAPUI5 Freestyle (não Fiori Elements).
> Os exemplos usam nomes/entidades genéricos — não são referência a um projeto específico.

Leia os padrões desta pasta antes de tomar decisões estruturais — a maioria das perguntas de
"como devo organizar X" já tem resposta e justificativa aqui.

## Índice

| Arquivo                                                | Conteúdo                                                                                                                                                                        |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [component-and-manifest.md](component-and-manifest.md) | `Component.js` e `manifest.json`: bootstrap da app, dataSources/models por service OData, roteamento, namespace                                                                 |
| [controllers.md](controllers.md)                       | `BaseController`: acesso a modelos (view/component), navegação, diálogos/popovers via `Fragment`, helpers de mensagem e i18n                                                    |
| [data-connection.md](data-connection.md)               | Two-way data binding sobre `ODataModel` v4: CRUD direto via `ListBinding`/`Context`, chamada de actions/functions, cache local de rascunho                                       |
| [formatters-and-types.md](formatters-and-types.md)     | `model/formatter.js` e `utils/customTypes.js`: convenções de formatação e `SimpleType` customizado para validação                                                               |
| [views-and-fragments.md](views-and-fragments.md)       | Convenções de `view/*.view.xml` e `view/fragments/*.fragment.xml`: nomenclatura, bindings nomeados, taxonomia de chaves i18n, geração programática de UI (`utils/factories.js`) |

## Começar uma app Freestyle

1. Configure o bootstrap da app em `Component.js`/`manifest.json` seguindo
   [component-and-manifest.md](component-and-manifest.md) — namespace único
   `<empresa>.<app>`, um `dataSource`/`model` por service OData consumido, roteamento com
   `routes`/`targets` pareados 1:1.
2. Escreva os controllers estendendo um `BaseController` seguindo
   [controllers.md](controllers.md) — nunca lógica de acesso a modelo, navegação
   ou diálogo duplicada em controller de tela; tudo isso é comportamento transversal do
   `BaseController`.
3. Acesse o backend via two-way data binding do OData v4 seguindo
   [data-connection.md](data-connection.md) — controllers leem/escrevem direto no
   `ListBinding`/`Context` do binding declarado na view (`create`/`setProperty`/`delete`).
4. Centralize formatação e validação de binding em `formatter.js`/`customTypes.js` seguindo
   [formatters-and-types.md](formatters-and-types.md) — nunca lógica de
   formatação inline no XML.
5. Estruture views/fragments seguindo
   [views-and-fragments.md](views-and-fragments.md) — convenção de IDs, taxonomia
   de chaves i18n, rodapé de diálogo padrão.

## Adicionar uma tela (feature) nova

Ao estender um projeto existente com uma tela nova, siga esta ordem:

1. **`webapp/manifest.json`** — adicione a rota/target seguindo
   [component-and-manifest.md](component-and-manifest.md), 1:1 route/target. Só
   adicione `dataSource`/`model` novo se a tela consumir um service OData que ainda não está
   registrado.
2. **`webapp/controller/<Feature>.controller.js`** — estenda `BaseController`, seguindo
   [controllers.md](controllers.md). Nenhum import direto de
   `MessageBox`/`formatter`/`utils` — sempre via `this.*`. CRUD é feito direto sobre o binding da
   view (`ListBinding.create`/`Context.setProperty`/`Context.delete`), seguindo
   [data-connection.md](data-connection.md).
3. **`webapp/view/<Feature>.view.xml`** (+ `fragments/` se houver diálogo) — seguindo
   [views-and-fragments.md](views-and-fragments.md): convenção de IDs, chaves
   i18n com o prefixo certo (`btn_`/`msg_`/`toast_`/...).
4. **`webapp/model/formatter.js`** — só se a tela precisar de formatação de exibição; nunca
   inline no XML, seguindo [formatters-and-types.md](formatters-and-types.md).

Ao terminar, confira que a tela nova reaproveita `BaseController` em vez de reimplementar
navegação, diálogo ou acesso a modelo, e que o CRUD está no `ListBinding`/`Context` do próprio
binding da view, não numa camada de acesso a dados paralela.

## Visão geral da arquitetura de referência

```
projeto/
  webapp/
    Component.js            # bootstrap: contexto de usuário, router, modelos técnicos
    manifest.json            # dataSources/models (ODataModel v4) por service OData, routing, namespace
    controller/
      BaseController.js       # comportamento transversal: modelo, navegação, diálogo, i18n, mensagem
      <Feature>.controller.js # 1 controller por view, extends BaseController; CRUD via binding two-way
    model/
      models.js                 # helpers que não são CRUD de entidade (device model, etc.)
      formatter.js               # funções puras de formatação, chamadas com o controller como `this`
    utils/
      utils.js                    # helpers puros de array/objeto/validação, sem estado
      factories.js                 # geração programática de controles a partir de metadados
      customTypes.js                # SimpleType customizado para validação de binding
    view/
      App.view.xml                  # shell + container de roteamento
      <Feature>.view.xml             # 1 view por rota
      fragments/*.fragment.xml        # diálogos/popovers, carregados por nome via Fragment.load
    i18n/i18n.properties             # taxonomia de prefixo: btn_/msg_/toast_/title_/label_/ph_
    test/                            # opcional: o fluxo não exige testes em apps Fiori (só lint)
      unit/                            # QUnit, se o projeto quiser (formatters, types)
      integration/                      # jornadas OPA5 (Given/When/Then + Page Objects), se o projeto quiser
```

### Decisões arquiteturais centrais (detalhes nos padrões desta pasta)

- **Two-way data binding direto**: View (XML, declara o binding `/Entity`) ↔ Controller (lê/escreve
  no `ListBinding`/`Context` do próprio binding — `create`/`setProperty`/`delete`).
- **`BaseController` como mixin transversal**: acesso a modelo (view vs. component), navegação,
  ciclo de vida de diálogo/popover, mensagens e i18n moram ali — nunca reimplementados por tela.
- **Um `JSONModel` nomeado por estado de UI**, nunca um modelo único acumulando tudo — o prefixo do
  binding no XML já diz se o dado vem do backend (`main>`) ou é estado local transiente
  (`<algumForm>>`).
- **Diálogos/fragments cacheados por id na instância do controller**, carregados uma vez via
  `Fragment.load`, nunca recriados a cada abertura.

## Convenção de idioma

Comentários de código e documentação de arquitetura destes padrões ficam em **português**. Chaves
de i18n, nomes de arquivo, IDs de controle, namespaces e nomes de classe/método ficam em
**inglês** (`Resource`, `handleSaveResource`), seguindo a convenção do próprio UI5.
