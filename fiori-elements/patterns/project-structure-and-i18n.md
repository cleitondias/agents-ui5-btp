# Estrutura de pastas, i18n e app standalone

> Ver [component-and-manifest.md](component-and-manifest.md) para o conteúdo de `manifest.json` e
> [annotations.md](annotations.md) para as chaves `{i18n>...}` que dependem do que está descrito
> aqui.

## Uma app UI5 standalone por feature

Cada `entitySet` principal vira uma pasta independente em `app/<feature>/`, gerada pelo
`@sap/generator-fiori-elements` (template List Report Page V4) — **não** um módulo compartilhado
entre features. Cada pasta tem seu próprio ciclo de deploy MTA:

```
app/<feature>/
  README.md                # gerado pelo tooling, não editar manualmente (metadata de geração)
  package.json              # scripts build:cf / deploy-config, deps @ui5/cli
  ui5.yaml                   # dev server local
  ui5-deploy.yaml              # build de produção (preload + cachebuster)
  xs-app.json                   # roteamento App Router: /odata → destination do srv, /resources → CDN UI5
  annotations.cds                # ver annotations.md
  webapp/
    Component.js                  # ver component-and-manifest.md
    manifest.json                   # ver component-and-manifest.md
    index.html                       # entry point local (dev/preview)
    i18n/
      i18n.properties                  # idioma base (inglês)
      i18n_pt_PT.properties               # tradução PT — mesmas chaves, nunca chaves extras
    localService/metadata.xml             # snapshot do $metadata, usado por mock local e OPA5
    ext/                                    # ver controller-extensions.md e fragments-and-custom-ui.md
      controller/
      fragment/
    test/
      integration/
        FirstJourney.js                       # jornada Given/When/Then padrão do generator
        opaTests.qunit.js/.html
        pages/<Entidade>List.js                 # Page Object da lista
        pages/<Entidade>ObjectPage.js             # Page Object da Object Page
      testsuite.qunit.js/.html
```

Não crie um `webapp/controller/` ou `webapp/view/` de tela própria — isso é o padrão Freestyle (ver
[`../fiori-freestyle/`](../../fiori-freestyle/)), não Fiori Elements. Toda UI de tela é gerada; só
`ext/` contém código.

## `xs-app.json`

Roteamento fixo, replicado em toda app do projeto — só o nome da `destination` do service CAP muda
entre projetos, nunca a estrutura:

```json
{
  "welcomeFile": "/index.html",
  "authenticationMethod": "route",
  "routes": [
    { "source": "^/odata/(.*)$", "destination": "<projeto>-srv", "authenticationType": "xsuaa", "csrfProtection": false },
    { "source": "^/resources/(.*)$", "target": "/resources/$1", "authenticationType": "none", "destination": "ui5" },
    { "source": "^/test-resources/(.*)$", "target": "/test-resources/$1", "authenticationType": "none", "destination": "ui5" },
    { "source": "^(.*)$", "target": "$1", "service": "html5-apps-repo-rt", "authenticationType": "xsuaa" }
  ]
}
```

`csrfProtection: false` na rota `/odata` é intencional (o `sap.fe` v4 já lida com token via
`X-CSRF-Token` por request, não por sessão de rota) — não copie esse valor cegamente para uma rota
que não seja o `mainService` do `sap.fe`.

## `i18n.properties`

Sem taxonomia de prefixo obrigatória (diferente do Freestyle, ver
[`../fiori-freestyle/patterns/views-and-fragments.md`](../../fiori-freestyle/patterns/views-and-fragments.md))
— a chave é o nome do campo/label de negócio em `PascalCase`/`camelCase`, porque é isso que a
anotação CDS referencia diretamente (`Label: '{i18n>CatalogName}'`). Três blocos fixos no topo do
arquivo, sempre nessa ordem:

```properties
# This is the resource bundle for currency

#Texts for manifest.json

#XTIT: Application name
appTitle=Currency

#YDES: Application description
appDescription=Currency

flpTitle=Currency
flpSubtitle=Currency
```

Abaixo desse bloco fixo, uma chave por label/texto referenciado em `annotations.cds` ou em
`ext/fragment/*.fragment.xml` — nunca uma chave sem uso, nunca um texto inline no lugar de
`{i18n>Chave}`.

`i18n_pt_PT.properties` replica exatamente o mesmo conjunto de chaves do arquivo base, só com o
valor traduzido — divergência de chave entre os dois arquivos (chave faltando ou sobrando) quebra o
fallback de tradução silenciosamente, então ao adicionar uma chave nova, adicione nos dois arquivos
na mesma revisão.

## `localService/metadata.xml`

Snapshot do `$metadata` do service CAP, usado pelo mock server local (`ui5.yaml`) e pelos testes
OPA5. Regenere sempre que a anotação ou o modelo de dados do service mudar — um `metadata.xml`
desatualizado faz os testes de integração passarem contra um contrato que não existe mais no
backend real.

## Testes de integração (OPA5)

Um Page Object por tela (`<Entidade>List.js`, `<Entidade>ObjectPage.js`), reunidos numa jornada
única (`FirstJourney.js`) que percorre lista → navegação → Object Page. Siga o esqueleto gerado pelo
`@sap/generator-fiori-elements` — não são reescritos do zero, só estendidos com os `Given`/`When`/`Then`
específicos da tela ao adicionar uma feature nova.
