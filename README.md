# SAP BTP Skills and Agents

Kit de referência Inetum para projetos SAP BTP desenvolvidos com agentes de IA de codificação
(Claude Code, Codex CLI, Cursor, ou qualquer outro que leia `AGENTS.md`): padrões de código,
template de projeto CAP e fluxo de trabalho com OpenSpec e Merge Requests no GitLab.

## Estrutura

O kit é composto por **packs**. Cada pack tem exatamente a estrutura com que fica na raiz do
projeto, por isso montar um projeto é copiar os packs desejados uns por cima dos outros. A CLI
`sap-btp-kit` faz essa cópia e depois mantém o projeto atualizado com novas versões do kit.

| Pack | O que leva para o projeto |
|---|---|
| [`base`](packs/base/) | **Sempre incluído.** `AGENTS.md`, `openspec/` (config, `specs/`, `changes/`), skills do OpenSpec em `.agents/skills/` e `scripts/oflow.sh` (fluxo OpenSpec → branch → MR) |
| [`cap-app`](packs/cap-app/) | Código do template SAP CAP — `db/`, `srv/`, `mta.yaml`, `xs-security.json`, lint (ESLint) e testes (`cds test` + `@cap-js/cds-test`) em `test/` (inclui `cap-patterns`) |
| [`cap-patterns`](packs/cap-patterns/) | [`docs/patterns/cap/`](packs/cap-patterns/docs/patterns/cap/) — modelo de domínio, services por perfil de acesso, Business Objects, erros, estilo, testes |
| [`fiori-elements-patterns`](packs/fiori-elements-patterns/) | [`docs/patterns/fiori-elements/`](packs/fiori-elements-patterns/docs/patterns/fiori-elements/) — anotações CDS, manifest, controller extensions, fragments |
| [`fiori-freestyle-patterns`](packs/fiori-freestyle-patterns/) | [`docs/patterns/fiori-freestyle/`](packs/fiori-freestyle-patterns/docs/patterns/fiori-freestyle/) — controllers, two-way binding OData v4, formatters, views/fragments |

O `AGENTS.md` da base é um só para qualquer combinação: manda o agente ler o `README.md` de cada
pasta em `docs/patterns/` que exista no projeto. O `README.md` de cada pasta de padrões é o ponto
de entrada da tecnologia (índice, ordem de aplicação, checklist e arquitetura de referência).

## Montar um projeto

```bash
npx git+https://git.pt-ibl-inetum.group/sap-technology/tools/sap-btp-skills-and-agents.git#v0.1.0 \
  init <destino> --packs <packs> --tools <ferramentas-de-ia>
```

A forma curta dos exemplos abaixo, `sap-btp-kit`, vale com o pacote instalado
(`npm i -g @sap-technology/sap-btp-kit`, publicado no registry do GitLab, com o escopo
`@sap-technology` configurado no `.npmrc`). A partir de um clone deste repositório,
`scripts/new-project.sh` é um atalho para o `init`, com os mesmos argumentos.

| Situação | Comando |
|---|---|
| Projeto CAP a partir do template | `sap-btp-kit init ../vendas-api --packs cap-app --tools codex` |
| Só os padrões, num projeto existente | `sap-btp-kit init ../meu-projeto --packs cap-patterns` |
| Fullstack (CAP + Fiori Elements) | `sap-btp-kit init ../vendas --packs cap-app,fiori-elements-patterns --tools claude,cursor` |
| Projeto só Fiori | `sap-btp-kit init ../app-vendas --packs fiori-freestyle-patterns` |

O `init`:

- copia sempre a `base`, e o `cap-patterns` sempre que houver `cap-app`;
- substitui o placeholder `cap-template` do `cap-app` pelo nome do projeto (pasta de destino, ou
  `--name`);
- **nunca sobrescreve** ficheiros que já existam no destino: um `AGENTS.md` existente recebe as
  instruções da base no fim; os outros conflitos são listados para revisão manual;
- leva sempre as skills do OpenSpec em `.agents/skills/`, lidas pelo Codex e por agentes que usam
  `.agents/`; com `--tools claude,cursor` (ferramentas com pasta própria) corre também
  `openspec init`, que gera as skills dessas ferramentas e mantém o `openspec/config.yaml` da base;
- grava `.sap-btp-kit.json`, que deve ser commitado: regista a versão do kit, os packs e o hash de
  cada ficheiro atualizável, tal como veio do kit.

Num projeto Fiori, gera-se primeiro a app pela tooling padrão (`@sap/generator-fiori-elements` ou
SAP Fiori generator / `@ui5/cli`) e depois aplica-se o pack de padrões por cima.

Sem a CLI, o equivalente é `cp -R packs/base/. packs/<pack>/. <destino>/`, seguido da troca do
placeholder, de renomear o `gitignore` do `cap-app` para `.gitignore` (e do
`openspec init --tools ...`, se for preciso). Um projeto montado assim não tem manifesto.

## Atualizar um projeto

```bash
sap-btp-kit update [destino] --dry-run   # só mostra o que mudaria
sap-btp-kit update [destino]
```

O `update` leva o projeto para a versão do kit que está a ser executada, comparando o manifesto, o
disco e o kit:

| Situação do ficheiro | Resultado |
|---|---|
| Sem alterações no projeto | Substituído pela nova versão |
| Alterado no projeto, igual no kit | Mantido |
| Alterado no projeto e no kit | Mantido; a nova versão fica em `<ficheiro>.kit-new` para reconciliar à mão e apagar |
| Novo no kit | Copiado |
| Apagado no projeto | Continua apagado |
| Saiu do kit | Mantido no projeto, com aviso |

Um conflito só é assinalado uma vez: a seguir, o ficheiro conta como alteração local. O código do
`cap-app` nunca é atualizado, porque depois do `init` pertence ao projeto; o `update` cobre os
restantes packs (`AGENTS.md`, `openspec/config.yaml`, skills, `oflow.sh` e `docs/patterns/`). Um
projeto já existente sem manifesto é adotado correndo o `init` nele. Quem acrescenta packs depois
tem de estar na mesma versão do kit, por isso corre primeiro o `update`.

## Fluxo de trabalho (OpenSpec → branch → MR)

Cada tarefa é uma change [OpenSpec](https://github.com/Fission-AI/OpenSpec), desenvolvida numa
branch própria `change/<nome>` e entregue num Merge Request para review. O fluxo não depende de
nenhum agente específico.

| Etapa | Com agente | Sem agente |
|---|---|---|
| Proposta | skill `openspec-propose` | escrever `openspec/changes/<nome>/` |
| Branch | automática no fim do propose (corre `oflow.sh start` depois do `tasks.md`) | `scripts/oflow.sh start <nome>` |
| Implementação | skill `openspec-apply-change` (corre `oflow.sh check` antes de concluir) | commits normais + `scripts/oflow.sh check` |
| Archive + MR | skill `openspec-archive-change` (corre `oflow.sh publish` no fim) | `scripts/oflow.sh ship` |

O que liga as skills do OpenSpec ao fluxo e aos padrões está no `openspec/config.yaml` da base:
`context` (ler `docs/patterns/`), `rules` (design e tasks ancorados nos padrões; a regra de
`tasks` cria a branch no fim do propose) e `operations` (apply confirma a branch; push e MR no
archive). Não edite os `SKILL.md` gerados, porque o `openspec update` sobrescreve-os.

A branch nasce no propose, e não no apply, para que a proposta fique commitada e possa ser revista
(e partilhada) antes de começar a implementação. O OpenSpec só aceita `operations` para `apply` e
`archive`, e por isso o gatilho é uma regra do último artefacto (`tasks`). O `start` é
idempotente: na própria branch só commita as alterações da proposta (por exemplo, depois de um
`openspec-update-change`), e se a branch já existir muda para ela. Para propostas escritas sem a
skill, o apply continua a correr o `start` antes de alterar código.

### Portão de qualidade (`oflow.sh check`)

Nada chega ao MR sem passar pelo `scripts/oflow.sh check`: ele corre os scripts `lint` e `test`
do `package.json` da raiz do projeto, quando existirem, e falha ao primeiro erro. O `publish` e o
`ship` correm-no antes de fazer push, e a guidance do `apply` manda o agente corrê-lo antes de dar
a última task por concluída — assim a afirmação "está pronto" do agente é verificada, e não só
declarada. Num projeto sem esses scripts o check passa com aviso; `OFLOW_SKIP_CHECK=1` salta-o, só
para emergências.

O `cap-app` já traz os dois scripts: `npm run lint` (ESLint com a config recomendada do CAP, sem
warnings tolerados) e `npm test` (`cds test`, o runner do `@sap/cds-dk`, com [`@cap-js/cds-test`](https://cap.cloud.sap/docs/node.js/cds-test),
com um smoke test em `test/services.test.js` que arranca o servidor e chama cada service). No CAP,
os testes são escritos durante as tasks, um ficheiro por modelo em
`test/model/<Entidade>BO.test.js`, seguindo o padrão
[`testing.md`](packs/cap-patterns/docs/patterns/cap/testing.md).

**Nas apps Fiori não se exigem testes.** Em Fiori Elements o código próprio é quase só anotações
e manifest, e em Freestyle a lógica de negócio deve estar no CAP, onde já é testada; OPA5 e QUnit
mantidos por agente custam mais do que apanham. O portão de uma app Fiori é só o lint: acrescente
`lint` (`ui5lint`) ao `package.json` da raiz para o check o apanhar (o check só olha para o
`package.json` da raiz). Quem quiser testes de UI pode acrescentar um script `test`, e o check
passa a corrê-lo, mas isso é opção do projeto, não requisito do fluxo.

O MR é aberto com o [`glab`](https://gitlab.com/gitlab-org/cli) quando ele está instalado e
autenticado, o que permite usar a descrição completa e definir reviewers
(`OFLOW_REVIEWERS=joao,maria`). Sem o `glab`, o MR é aberto pelas push options do GitLab, sem
configuração adicional.

### Configurar o `glab`

1. Instale o `glab` (`brew install glab` no macOS; outras plataformas na
   [documentação](https://gitlab.com/gitlab-org/cli#installation)).
2. Crie um Personal Access Token em
   <https://git.pt-ibl-inetum.group/-/user_settings/personal_access_tokens> (*Avatar → Edit
   profile → Access tokens → Add new token*):
   - **Token name**: por exemplo `glab`;
   - **Expiration date**: a que a política da instância permitir;
   - **Scopes**: `api` e `write_repository` (o `glab` exige pelo menos `api`).

   Copie o token logo após criá-lo — o GitLab não o volta a mostrar.
3. Autentique o `glab` na instância:

   ```bash
   glab auth login --hostname git.pt-ibl-inetum.group
   ```

   Escolha **Token**, cole o token e, como protocolo do git, **HTTPS** (o mesmo do `origin`).
   Sem interação, o equivalente é:

   ```bash
   glab auth login --hostname git.pt-ibl-inetum.group --token <token>
   ```

4. Confirme com `glab auth status --hostname git.pt-ibl-inetum.group`. A partir daqui, o
   `oflow.sh` passa a abrir o MR pelo `glab` (para forçar um dos modos, use
   `OFLOW_MR_VIA=glab` ou `OFLOW_MR_VIA=push`).

## Desenvolver este repositório

Este repositório usa o mesmo fluxo nas suas próprias alterações: o [`openspec/`](openspec/) e o
[`.agents/`](.agents/) da raiz servem para desenvolver o kit e **não são distribuídos**. O
[`scripts/oflow.sh`](scripts/oflow.sh) da raiz é um link para o da base, para existir uma única
versão.

As skills e pastas do OpenSpec em `packs/base/` são geradas pelo `openspec init --tools agents
packs/base`. Ao atualizar o OpenSpec, regenere-as com `openspec update packs/base` (o
`config.yaml` é mantido) e não as edite à mão.

Ao alterar um pack, mantenha-o com a estrutura de destino (o que está em `packs/<pack>/` é o que
aparece na raiz do projeto) e evite links entre packs diferentes — o outro pack pode não estar
instalado. A única exceção é o `.gitignore`, que fica no pack como `gitignore` porque o npm não o
publica, e a CLI repõe-lhe o nome na cópia.

A CLI está em [`bin/`](bin/) e [`lib/`](lib/), sem dependências (Node 20+), e os testes correm com
`npm test`. Para lançar uma versão, suba a `version` do `package.json` e crie a tag `v<versão>`.
Confira o conteúdo do pacote com `npm pack --dry-run`.

## Convenção de idioma

Comentários de código e documentação de arquitetura ficam em **português**; identificadores de
código (entidades, campos, classes, métodos, namespaces, IDs) ficam em **inglês**, seguindo a
convenção do próprio CAP/UI5.
