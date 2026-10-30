# Patterns — SAP Fiori Elements v4 (Inetum)

> Padrões de arquitetura e código para apps SAP Fiori Elements (v4, `sap.fe.templates`) geradas
> sobre um backend CAP.
> Os exemplos usam nomes/entidades genéricos — não são referência a um projeto específico.

Fiori Elements é o oposto de Freestyle (ver `docs/patterns/fiori-freestyle/`, quando presente): a UI
(List Report + Object Page) é **gerada em runtime** a partir de metadados OData v4 e anotações
`@UI`/`@Common` no CDS do backend. Não se escreve `.view.xml` nem `.controller.js` de tela — só se
escreve **anotação** (o que aparece e como) e, quando o metadado não cobre o caso, **extensão**
pontual (controller extension, fragment, coluna/seção customizada).

Leia os padrões desta pasta antes de tomar decisões estruturais — a maioria das perguntas de
"como devo mostrar/validar/customizar X" já tem resposta e justificativa aqui.

## Índice

| Arquivo                                                             | Conteúdo                                                                                                                                             |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [annotations.md](annotations.md)                                     | `annotations.cds`: `UI.LineItem`, `UI.HeaderInfo`, `UI.Facets`/`UI.FieldGroup`, `Common.ValueList`, `Common.Text`, `Common.FieldControl`, `Common.SideEffects` |
| [component-and-manifest.md](component-and-manifest.md)               | `Component.js` e `manifest.json`: `dataSources`/models por service OData, routing `ListReport`/`ObjectPage`, `controlConfiguration`, registro de extensões |
| [controller-extensions.md](controller-extensions.md)                 | `ext/controller/*.js`: `ControllerExtension`, hooks de ciclo de vida, leitura de dado fora do metadado, modelos JSON auxiliares                        |
| [fragments-and-custom-ui.md](fragments-and-custom-ui.md)             | `ext/fragment/*.fragment.xml` + `.js` companion: seção customizada, coluna customizada, upload/download, `core:require`                                |
| [project-structure-and-i18n.md](project-structure-and-i18n.md)       | Estrutura de pastas por app standalone, `i18n.properties`/tradução PT, `localService`, `xs-app.json`                                                    |

## Começar uma app Fiori Elements

1. Gere o projeto pela tooling padrão (`@sap/generator-fiori-elements`, template List Report Page
   V4, apontando para o service OData v4 exposto pelo CAP).
2. Modele a apresentação em `srv/*/annotations.cds` seguindo [annotations.md](annotations.md)
   — `UI.LineItem`, `UI.HeaderInfo`, `UI.Facets`/`UI.FieldGroup`, `Common.ValueList`,
   `Common.FieldControl`, `Common.SideEffects`. É aqui que mora a maior parte do trabalho de uma
   tela Fiori Elements — não em código UI5.
3. Configure `webapp/manifest.json` seguindo [component-and-manifest.md](component-and-manifest.md)
   — `dataSources`/models por service OData (v4 principal + v2 legado quando precisar de
   `callFunction`/upload), rota/target 1:1 por `entitySet`, registro de controller extensions e de
   seções/colunas customizadas.
4. Só quando a anotação não resolve (leitura de dado fora do metadado, upload/download de arquivo,
   ação de negócio síncrona), estenda com [controller-extensions.md](controller-extensions.md)
   e [fragments-and-custom-ui.md](fragments-and-custom-ui.md) — nunca reescreva o
   List Report/Object Page do zero.
5. Estruture pastas, i18n e app standalone seguindo
   [project-structure-and-i18n.md](project-structure-and-i18n.md).

## Adicionar uma tela (feature) nova

Ao estender um projeto existente com uma tela nova sobre uma entidade CDS já exposta no service:

1. **`srv/*/annotations.cds`** — anote `UI.LineItem` (colunas da lista) e `UI.HeaderInfo` +
   `UI.Facets`/`UI.FieldGroup` (seções da Object Page), seguindo
   [annotations.md](annotations.md). Sem isso a tela não renderiza nada.
2. **`webapp/manifest.json`** — adicione `routes`/`targets` `ListReport`/`ObjectPage` 1:1 para o
   novo `entitySet`, seguindo [component-and-manifest.md](component-and-manifest.md).
   Só adicione `dataSource`/model novo se a tela consumir um service OData ainda não registrado.
3. Só se precisar de dado/ação fora do metadado: **`webapp/ext/controller/<Feature>Ext.controller.js`**
   como `ControllerExtension`, registrado em `sap.ui.controllerExtensions` do manifest, seguindo
   [controller-extensions.md](controller-extensions.md).
4. Só se precisar de UI que a anotação não gera (upload, carrossel de imagem, tabela lida fora do
   OData): **`webapp/ext/fragment/<Nome>.fragment.xml`** + `.js` companion, registrado como seção
   customizada (`content.body.sections`) ou coluna customizada
   (`controlConfiguration.<...>#<qualifier>.columns`) no manifest, seguindo
   [fragments-and-custom-ui.md](fragments-and-custom-ui.md).
5. **`webapp/i18n/i18n.properties`** (+ `i18n_pt_PT.properties`) — toda label referenciada em
   anotação (`{i18n>Chave}`) precisa existir aqui antes de a tela ser testada.

Ao terminar, confira que a tela nova não introduziu `.view.xml`/`.controller.js` de tela própria —
só anotação + manifest + (quando estritamente necessário) extensão pontual.

## Visão geral da arquitetura de referência

```
app/<feature>/
  webapp/
    Component.js              # sap.fe.core.AppComponent puro, sem lógica — bootstrap é 100% manifest
    manifest.json               # dataSources/models por service OData, routing ListReport/ObjectPage,
                                  # controlConfiguration, controllerExtensions, custom sections
    ext/
      controller/<Nome>.js         # ControllerExtension: onInit via attachRoutePatternMatched,
                                     # leitura de dado fora do metadado, JSONModel auxiliar
      fragment/<Nome>.fragment.xml  # seção/coluna customizada (upload, carrossel, tabela lida à parte)
      fragment/<Nome>.js             # handler companion do fragment, carregado via core:require
    i18n/
      i18n.properties                # chaves referenciadas em @UI/@Common e nos fragments
      i18n_pt_PT.properties            # tradução PT
    localService/metadata.xml          # snapshot do $metadata para mock/offline
    test/                               # opcional: OPA5 gerado pela tooling; o fluxo não exige testes em apps Fiori (só lint)
  annotations.cds                       # UI.LineItem/HeaderInfo/Facets/FieldGroup/ValueList/SideEffects
  package.json / ui5.yaml / ui5-deploy.yaml / xs-app.json   # bootstrap standalone UI5 + deploy CF
```

### Decisões arquiteturais centrais (detalhes nos padrões desta pasta)

- **Anotação primeiro, extensão depois**: toda apresentação padrão (colunas, seções, campos,
  obrigatoriedade, texto associado a chave estrangeira, value help, efeito colateral entre campos)
  é `@UI`/`@Common` no `annotations.cds` do service CAP — nunca reimplementada em UI5. Extensão só
  para o que o metadado genuinamente não expressa.
- **1 app UI5 standalone por `entitySet` principal**: cada pasta em `app/` é um módulo MTA
  independente (`package.json`, `ui5.yaml`, `xs-app.json` próprios), com uma rota List Report e uma
  Object Page — nunca múltiplos `entitySet` não relacionados na mesma app.
- **`ControllerExtension`, nunca controller próprio**: extensões de comportamento usam
  `sap/ui/core/mvc/ControllerExtension` registradas em `sap.ui.controllerExtensions` do manifest —
  nunca um `.controller.js` de view (a view não existe, é gerada).
- **Dois modelos OData quando preciso**: o model `""` (v4, autogerado) cobre CRUD/list binding
  padrão; um model `v2` adicional só é registrado quando a tela precisa de `callFunction`
  (import/action síncrona) ou upload binário, que o v4 do `sap.fe` não expõe tão diretamente.
- **Seção/coluna customizada declarada no manifest, nunca fragment solto**: todo fragment em
  `ext/fragment/` é referenciado a partir de `content.body.sections` (Object Page) ou
  `controlConfiguration.<...>.columns` (List Report/tabela de faceta) — nunca instanciado
  manualmente.

## Convenção de idioma

Comentários de código e documentação de arquitetura destes padrões ficam em **português**. Chaves
de i18n, nomes de entidade/campo CDS, nomes de arquivo, IDs de controle, namespaces e nomes de
classe/método ficam em **inglês** (`Resource`, `handleUploadComplete`), seguindo a convenção do
próprio UI5/CAP.
