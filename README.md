# SAP BTP Skills and Agents

Kit de referência Inetum para projetos SAP BTP desenvolvidos com agentes de IA de codificação
(Claude Code, Codex CLI, Cursor, ou qualquer outro que leia `AGENTS.md`): padrões de código,
template de projeto CAP e fluxo de trabalho com OpenSpec e Merge Requests no GitLab.

## Estrutura

O kit é composto por **packs**. Cada pack tem exatamente a estrutura com que fica na raiz do
projeto, por isso montar um projeto é copiar os packs desejados uns por cima dos outros.

| Pack | O que leva para o projeto |
|---|---|
| [`base`](packs/base/) | **Sempre incluído.** `AGENTS.md`, `openspec/config.yaml` e `scripts/oflow.sh` (fluxo OpenSpec → branch → MR) |
| [`cap-app`](packs/cap-app/) | Código do template SAP CAP — `db/`, `srv/`, `mta.yaml`, `xs-security.json`... (inclui `cap-patterns`) |
| [`cap-patterns`](packs/cap-patterns/) | [`docs/patterns/cap/`](packs/cap-patterns/docs/patterns/cap/) — modelo de domínio, services por perfil de acesso, Business Objects, erros, estilo |
| [`fiori-elements-patterns`](packs/fiori-elements-patterns/) | [`docs/patterns/fiori-elements/`](packs/fiori-elements-patterns/docs/patterns/fiori-elements/) — anotações CDS, manifest, controller extensions, fragments |
| [`fiori-freestyle-patterns`](packs/fiori-freestyle-patterns/) | [`docs/patterns/fiori-freestyle/`](packs/fiori-freestyle-patterns/docs/patterns/fiori-freestyle/) — controllers, two-way binding OData v4, formatters, views/fragments |

O `AGENTS.md` da base é um só para qualquer combinação: manda o agente ler o `README.md` de cada
pasta em `docs/patterns/` que exista no projeto. O `README.md` de cada pasta de padrões é o ponto
de entrada da tecnologia (índice, ordem de aplicação, checklist e arquitetura de referência).

## Montar um projeto

```bash
scripts/new-project.sh <destino> --packs <packs> --tools <ferramentas-de-ia>
```

| Situação | Comando |
|---|---|
| Projeto CAP a partir do template | `scripts/new-project.sh ../vendas-api --packs cap-app --tools codex` |
| Só os padrões, num projeto existente | `scripts/new-project.sh ../meu-projeto --packs cap-patterns` |
| Fullstack (CAP + Fiori Elements) | `scripts/new-project.sh ../vendas --packs cap-app,fiori-elements-patterns --tools claude,cursor` |
| Projeto só Fiori | `scripts/new-project.sh ../app-vendas --packs fiori-freestyle-patterns` |

O script:

- copia sempre a `base`, e o `cap-patterns` sempre que houver `cap-app`;
- substitui o placeholder `cap-template` do `cap-app` pelo nome do projeto (pasta de destino, ou
  `--name`);
- **nunca sobrescreve** ficheiros que já existam no destino: um `AGENTS.md` existente recebe as
  instruções da base no fim; os outros conflitos são listados para revisão manual;
- com `--tools`, corre `openspec init --tools <ferramentas>`, que gera as skills do OpenSpec para
  cada agente e mantém o `openspec/config.yaml` da base. Sem `--tools`, mostra o comando a correr.

Num projeto Fiori, gera-se primeiro a app pela tooling padrão (`@sap/generator-fiori-elements` ou
SAP Fiori generator / `@ui5/cli`) e depois aplica-se o pack de padrões por cima.

Sem o script, o equivalente é `cp -R packs/base/. packs/<pack>/. <destino>/`, seguido da troca do
placeholder e do `openspec init`.

## Fluxo de trabalho (OpenSpec → branch → MR)

Cada tarefa é uma change [OpenSpec](https://github.com/Fission-AI/OpenSpec), desenvolvida numa
branch própria `change/<nome>` e entregue num Merge Request para review. O fluxo não depende de
nenhum agente específico.

| Etapa | Com agente | Sem agente |
|---|---|---|
| Proposta | skill `openspec-propose` | escrever `openspec/changes/<nome>/` |
| Branch | automática no início do apply | `scripts/oflow.sh start <nome>` |
| Implementação | skill `openspec-apply-change` | commits normais |
| Archive + MR | skill `openspec-archive-change` (corre `oflow.sh publish` no fim) | `scripts/oflow.sh ship` |

O que liga as skills do OpenSpec ao fluxo e aos padrões está no `openspec/config.yaml` da base:
`context` (ler `docs/patterns/`), `rules` (design e tasks ancorados nos padrões) e `operations`
(branch no apply, push e MR no archive). Não edite os `SKILL.md` gerados, porque o
`openspec update` sobrescreve-os.

O MR é aberto com o [`glab`](https://gitlab.com/gitlab-org/cli) quando ele está instalado e
autenticado (`glab auth login --hostname git.pt-ibl-inetum.group`), o que permite usar a
descrição completa e definir reviewers (`OFLOW_REVIEWERS=joao,maria`). Sem o `glab`, o MR é aberto
pelas push options do GitLab, sem configuração adicional.

## Desenvolver este repositório

Este repositório usa o mesmo fluxo nas suas próprias alterações: o [`openspec/`](openspec/) e o
[`.agents/`](.agents/) da raiz servem para desenvolver o kit e **não são distribuídos**. O
[`scripts/oflow.sh`](scripts/oflow.sh) da raiz é um link para o da base, para existir uma única
versão.

Ao alterar um pack, mantenha-o com a estrutura de destino (o que está em `packs/<pack>/` é o que
aparece na raiz do projeto) e evite links entre packs diferentes — o outro pack pode não estar
instalado.

## Convenção de idioma

Comentários de código e documentação de arquitetura ficam em **português**; identificadores de
código (entidades, campos, classes, métodos, namespaces, IDs) ficam em **inglês**, seguindo a
convenção do próprio CAP/UI5.
