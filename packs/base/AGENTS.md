# AGENTS.md

Instruções para agentes de IA de codificação (Claude Code, Codex CLI, Cursor ou qualquer outro que
leia `AGENTS.md`) a trabalhar neste projeto.

## Padrões de código

Os padrões de arquitetura e código do projeto estão em `docs/patterns/`, uma pasta por tecnologia.
Cada pasta tem um `README.md` com o índice, a ordem de aplicação e o checklist de revisão.

**Antes de alterar código, lê o `README.md` da pasta correspondente à camada em que vais mexer** — a
maioria das perguntas de "como devo organizar X" já tem resposta e justificativa lá.

| Camada | Pasta de padrões |
|---|---|
| Modelo de domínio, services, lógica de negócio (`db/`, `srv/`) | `docs/patterns/cap/` |
| App SAP Fiori Elements v4 (`app/<feature>/`, `annotations.cds`) | `docs/patterns/fiori-elements/` |
| App SAPUI5 Freestyle (`webapp/` com views e controllers próprios) | `docs/patterns/fiori-freestyle/` |

Só existem no projeto as pastas das tecnologias que ele usa; ignora as linhas da tabela cuja pasta
não exista.

## Fluxo de trabalho (OpenSpec → branch → MR)

Cada tarefa é uma change [OpenSpec](https://github.com/Fission-AI/OpenSpec), desenvolvida numa
branch própria `change/<nome-da-change>` e entregue num Merge Request para review.

1. **Proposta** — skill de propose do OpenSpec: cria `openspec/changes/<nome>/` (proposal, specs,
   design, tasks).
2. **Branch** — antes de alterar código: `scripts/oflow.sh start <nome>` (cria a branch a partir da
   `main` atualizada e commita a proposta).
3. **Implementação** — skill de apply do OpenSpec, seguindo os padrões acima; commits em
   Conventional Commits.
4. **Archive + MR** — skill de archive do OpenSpec e, no fim, `scripts/oflow.sh publish` (commit do
   archive, push e abertura do MR no GitLab).

Sem agente, o passo 4 é `scripts/oflow.sh ship`. A configuração que liga as skills do OpenSpec a
este fluxo está em `openspec/config.yaml`; os `SKILL.md` gerados pelo `openspec init` não devem ser
editados, porque o `openspec update` sobrescreve-os.

## Convenção de idioma

Comentários de código e documentação de arquitetura ficam em **português**. Identificadores de
código (entidades, campos, classes, métodos, namespaces, IDs de controle, chaves de i18n) ficam em
**inglês**, seguindo a convenção do próprio CAP/UI5.
