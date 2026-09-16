# Patterns — Fiori Freestyle Template (Inetum)

> Padrões de arquitetura e código para apps SAPUI5 Freestyle construídos a
> partir deste template.
> Os exemplos usam nomes/entidades genéricos — não são referência a um projeto específico.

## Índice

| Arquivo                                                | Conteúdo                                                                                                                                                                        |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [component-and-manifest.md](component-and-manifest.md) | `Component.js` e `manifest.json`: bootstrap da app, dataSources/models por service OData, roteamento, namespace                                                                 |
| [controllers.md](controllers.md)                       | `BaseController`: acesso a modelos (view/component), navegação, diálogos/popovers via `Fragment`, helpers de mensagem e i18n                                                    |
| [data-connection.md](data-connection.md)               | Two-way data binding sobre `ODataModel` v4: CRUD direto via `ListBinding`/`Context`, chamada de actions/functions, cache local de rascunho                                       |
| [formatters-and-types.md](formatters-and-types.md)     | `model/formatter.js` e `utils/customTypes.js`: convenções de formatação e `SimpleType` customizado para validação                                                               |
| [views-and-fragments.md](views-and-fragments.md)       | Convenções de `view/*.view.xml` e `view/fragments/*.fragment.xml`: nomenclatura, bindings nomeados, taxonomia de chaves i18n, geração programática de UI (`utils/factories.js`) |

## Convenção de idioma

Comentários de código e documentação de arquitetura deste template ficam em **português**. Chaves
de i18n, nomes de arquivo, IDs de controle e namespaces ficam em **inglês**, seguindo a convenção
do próprio UI5.
