# Patterns — Fiori Elements Template (Inetum)

> Padrões de arquitetura e código para apps SAP Fiori Elements (v4, `sap.fe.templates`) geradas
> sobre um backend CAP a partir deste template.
> Os exemplos usam nomes/entidades genéricos — não são referência a um projeto específico.

## Índice

| Arquivo                                                             | Conteúdo                                                                                                                                             |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [annotations.md](annotations.md)                                     | `annotations.cds`: `UI.LineItem`, `UI.HeaderInfo`, `UI.Facets`/`UI.FieldGroup`, `Common.ValueList`, `Common.Text`, `Common.FieldControl`, `Common.SideEffects` |
| [component-and-manifest.md](component-and-manifest.md)               | `Component.js` e `manifest.json`: `dataSources`/models por service OData, routing `ListReport`/`ObjectPage`, `controlConfiguration`, registro de extensões |
| [controller-extensions.md](controller-extensions.md)                 | `ext/controller/*.js`: `ControllerExtension`, hooks de ciclo de vida, leitura de dado fora do metadado, modelos JSON auxiliares                        |
| [fragments-and-custom-ui.md](fragments-and-custom-ui.md)             | `ext/fragment/*.fragment.xml` + `.js` companion: seção customizada, coluna customizada, upload/download, `core:require`                                |
| [project-structure-and-i18n.md](project-structure-and-i18n.md)       | Estrutura de pastas por app standalone, `i18n.properties`/tradução PT, `localService`, `xs-app.json`                                                    |

## Convenção de idioma

Comentários de código e documentação de arquitetura deste template ficam em **português**. Chaves
de i18n, nomes de entidade/campo CDS, IDs de controle e namespaces ficam em **inglês**, seguindo a
convenção do próprio UI5/CAP.
