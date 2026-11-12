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

1. **Proposta + branch** — skill de propose do OpenSpec: cria `openspec/changes/<nome>/` (proposal,
   specs, design, tasks) e, logo depois de escrever o `tasks.md`, corre
   `scripts/oflow.sh start <nome>`, que cria a branch a partir da `main` atualizada e commita a
   proposta. Voltar a correr o `start` na mesma branch só commita as alterações da proposta.
2. **Implementação** — skill de apply do OpenSpec, seguindo os padrões acima; commits em
   Conventional Commits. Se a branch atual não for `change/<nome>` (ex.: proposta escrita à mão),
   o apply corre o `start` antes de alterar código. Com as tasks feitas, corre
   `scripts/oflow.sh validate` (lint, testes e tasks) e segue o pré-prompt de auto-revisão que ele
   imprime (escopo, riscos e veredito Aprovado, Aprovado com ressalvas ou Bloqueado); corrige o que
   falhar ou bloquear. No CAP (`db/`, `srv/`),
   os testes unitários são escritos durante cada task, no mesmo commit do código, em
   `test/model/<Entidade>BO.test.js` (um ficheiro por modelo; ver
   `docs/patterns/cap/testing.md`). **Nas apps Fiori não se exigem testes**: o portão é
   só o lint, e a lógica testável fica no CAP.
3. **Archive + MR** — skill de archive do OpenSpec e, no fim, `scripts/oflow.sh publish` (check,
   commit do archive, push e abertura do MR no GitLab). O publish falha se o check não passar.

Sem agente, o passo 3 é `scripts/oflow.sh ship`, que também corre o check. A configuração que liga as skills do OpenSpec a
este fluxo está em `openspec/config.yaml`; os `SKILL.md` gerados pelo `openspec init` não devem ser
editados, porque o `openspec update` sobrescreve-os.

## Review de um MR

Quando te pedirem para rever um Merge Request a partir da URL, corre
`scripts/oflow.sh review <url-do-MR>` (skill `review-mr`) e segue o pré-prompt que ele imprime: o
MR, a change OpenSpec da branch, os padrões das camadas tocadas, o diff e as instruções do review.
O review só lê: não faças checkout, não comentes no MR nem alteres código.

## Convenção de idioma

Comentários de código e documentação de arquitetura ficam em **português**. Identificadores de
código (entidades, campos, classes, métodos, namespaces, IDs de controle, chaves de i18n) ficam em
**inglês**, seguindo a convenção do próprio CAP/UI5.
