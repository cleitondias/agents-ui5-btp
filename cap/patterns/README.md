# Patterns — CAP Template (Inetum)

> Padrões de arquitetura e código para projetos SAP CAP construídos a partir deste template.
> Os exemplos usam entidades/nomes genéricos — não são referência a um projeto específico.

## Índice

| Arquivo | Conteúdo |
|---|---|
| [data-model.md](data-model.md) | Convenções do `db/schema.cds`: namespace, chaves, `managed`, Association vs. Composition, entidade hub de escopo compartilhado |
| [service-layer.md](service-layer.md) | Estrutura de `srv/services.cds`: services por perfil de acesso, projections, drafts, actions/functions |
| [business-objects.md](business-objects.md) | Camada de handlers (`srv/src/model/*BO.js`): `BaseBO`, herança, hooks `before/after/on`, escopo automático, anexos, integração externa via destination |
| [error-handling.md](error-handling.md) | Erros tipados com status HTTP (`HTTPHelpers.js`) e handler central de erro por service, incluindo `$batch` |
| [code-style.md](code-style.md) | Regras de clareza a nível de método: guard clauses, tabela de dispatch, evitar duplicação de query, um método por responsabilidade |
