## Why

Os packs são copiados uma vez para cada projeto e, a partir daí, cada um segue sozinho: uma melhoria
no `oflow.sh` ou nos padrões não chega aos projetos existentes, e nada regista de que versão do kit
cada projeto veio. Montar um projeto também exige um clone deste repositório.

## What Changes

- Novo pacote npm `@sap-technology/sap-btp-kit`, com o binário `sap-btp-kit` e os packs incluídos.
- Comando `init`: porte do `new-project.sh`, com o mesmo comportamento, que grava também o manifesto
  `.sap-btp-kit.json` no projeto.
- Comando `update`: aplica uma nova versão do kit sem perder alterações locais.
- `scripts/new-project.sh` passa a ser um atalho para o `init` e passa a exigir Node 20+.
- **BREAKING** para quem copia packs à mão: `packs/cap-app/.gitignore` passa a `gitignore`, porque o
  npm não publica ficheiros `.gitignore`.

## Non-goals

- Mover o `oflow.sh` para a CLI: continua dentro do projeto, sem dependências.
- Atualizar o código do `cap-app`, que pertence ao projeto depois do `init`.
- Automatizar a publicação no registry (job de CI).

## Capabilities

### New Capabilities

- `kit-cli`: montagem e atualização de projetos a partir dos packs.

### Modified Capabilities

(nenhuma)

## Impact

`package.json`, `bin/`, `lib/`, `test/`, `.gitignore` (novos); `scripts/new-project.sh`,
`packs/cap-app/gitignore`, `README.md` e `openspec/config.yaml` (alterados).
