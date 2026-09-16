# SAP BTP Skills and Agents

Templates de referência Inetum para projetos SAP BTP, pensados para serem usados por um
agente de IA de codificação (Claude Code, Codex CLI, Cursor, ou qualquer outro que leia
`AGENTS.md`) como ponto de partida de um projeto novo.

Cada template carrega, além do código-base, um conjunto de **padrões de código** documentados em
`patterns/` — convenções de arquitetura a seguir em qualquer projeto novo baseado nele.

## Templates disponíveis

| Diretório | Conteúdo | Ponto de entrada |
|---|---|---|
| [`cap/`](cap/) | Projeto SAP CAP (Cloud Application Programming Model) — modelo de domínio, services OData por perfil de acesso, camada de Business Objects | [`cap/AGENTS.md`](cap/AGENTS.md) |
| [`fiori-freestyle/`](fiori-freestyle/) | App SAPUI5 Freestyle (não Fiori Elements) — controllers, acesso a dados OData, formatação, views/fragments | [`fiori-freestyle/AGENTS.md`](fiori-freestyle/AGENTS.md) |

## Como usar

O fluxo é diferente em cada template porque um é um projeto completo e o outro é gerado pela
tooling padrão do SAPUI5.

### CAP

1. Copie a pasta [`cap/`](cap/) inteira para o novo repositório/diretório do projeto.
2. Substitua todas as ocorrências do placeholder `cap-template` (namespace em `package.json`,
   nomes de módulo/recurso em `mta.yaml`, `xsappname` em `xs-security.json`) pelo nome real do
   projeto.
3. Abra o agente de IA ali e peça para ele ler [`cap/AGENTS.md`](cap/AGENTS.md) antes de modelar
   o domínio — ele indica a ordem de leitura de `patterns/*.md` e o que aplicar em cada camada.

### Fiori Freestyle

1. Gere o projeto normalmente pela tooling padrão (SAP Fiori generator / `@ui5/cli`) — este
   diretório não é copiado como projeto base.
2. Copie apenas [`fiori-freestyle/patterns/`](fiori-freestyle/patterns/) e
   [`fiori-freestyle/AGENTS.md`](fiori-freestyle/AGENTS.md) para dentro do projeto gerado.
3. Abra o agente de IA ali e peça para ele ler o `AGENTS.md` copiado antes de estruturar
   controllers, views e acesso a dados.

## Convenção de idioma

Em ambos os templates, comentários de código e documentação de arquitetura ficam em
**português**; identificadores de código (entidades, campos, classes, métodos, namespaces, IDs)
ficam em **inglês**, seguindo a convenção do próprio CAP/UI5.
