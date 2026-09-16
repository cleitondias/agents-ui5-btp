# AGENTS.md — Fiori Freestyle Template (Inetum)

Este diretório é um **template de referência** para apps SAPUI5 Freestyle (não Fiori Elements)
construídas do zero, pensado como ponto de partida para novos projetos Inetum. Ele carrega um
conjunto de **padrões de código** consolidados em [`patterns/`](patterns/) — convenções de
estruturação de controller, acesso a dados OData, formatação, views/fragments e testes a seguir em
qualquer projeto novo baseado neste template.

**Leia `patterns/` antes de tomar decisões estruturais em um novo projeto** — a maioria das
perguntas de "como devo organizar X" já tem resposta e justificativa lá.

## Como usar este template

Ao começar um projeto novo a partir daqui:

1. Leia [patterns/README.md](patterns/README.md) — é o índice de todos os padrões.
2. Configure o bootstrap da app em `Component.js`/`manifest.json` seguindo
   [patterns/component-and-manifest.md](patterns/component-and-manifest.md) — namespace único
   `<empresa>.<app>`, um `dataSource`/`model` por service OData consumido, roteamento com
   `routes`/`targets` pareados 1:1.
3. Escreva os controllers estendendo um `BaseController` seguindo
   [patterns/controllers.md](patterns/controllers.md) — nunca lógica de acesso a modelo, navegação
   ou diálogo duplicada em controller de tela; tudo isso é comportamento transversal do
   `BaseController`.
4. Acesse o backend via two-way data binding do OData v4 seguindo
   [patterns/data-connection.md](patterns/data-connection.md) — controllers leem/escrevem direto no
   `ListBinding`/`Context` do binding declarado na view (`create`/`setProperty`/`delete`).
5. Centralize formatação e validação de binding em `formatter.js`/`customTypes.js` seguindo
   [patterns/formatters-and-types.md](patterns/formatters-and-types.md) — nunca lógica de
   formatação inline no XML.
6. Estruture views/fragments seguindo
   [patterns/views-and-fragments.md](patterns/views-and-fragments.md) — convenção de IDs, taxonomia
   de chaves i18n, rodapé de diálogo padrão.

## Adicionar uma tela (feature) nova

Ao estender um projeto existente com uma tela nova, siga esta ordem:

1. **`webapp/manifest.json`** — adicione a rota/target seguindo
   [patterns/component-and-manifest.md](patterns/component-and-manifest.md), 1:1 route/target. Só
   adicione `dataSource`/`model` novo se a tela consumir um service OData que ainda não está
   registrado.
2. **`webapp/controller/<Feature>.controller.js`** — estenda `BaseController`, seguindo
   [patterns/controllers.md](patterns/controllers.md). Nenhum import direto de
   `MessageBox`/`formatter`/`utils` — sempre via `this.*`. CRUD é feito direto sobre o binding da
   view (`ListBinding.create`/`Context.setProperty`/`Context.delete`), seguindo
   [patterns/data-connection.md](patterns/data-connection.md).
3. **`webapp/view/<Feature>.view.xml`** (+ `fragments/` se houver diálogo) — seguindo
   [patterns/views-and-fragments.md](patterns/views-and-fragments.md): convenção de IDs, chaves
   i18n com o prefixo certo (`btn_`/`msg_`/`toast_`/...).
4. **`webapp/model/formatter.js`** — só se a tela precisar de formatação de exibição; nunca
   inline no XML, seguindo [patterns/formatters-and-types.md](patterns/formatters-and-types.md).

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
    test/
      unit/                            # smoke test por controller
      integration/                      # jornadas OPA5 (Given/When/Then + Page Objects)
```

### Decisões arquiteturais centrais (detalhes em `patterns/`)

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

Comentários de código e documentação de arquitetura deste template ficam em **português**. Chaves
de i18n, nomes de arquivo, IDs de controle, namespaces e nomes de classe/método ficam em
**inglês** (`Resource`, `handleSaveResource`), seguindo a convenção do próprio UI5.
