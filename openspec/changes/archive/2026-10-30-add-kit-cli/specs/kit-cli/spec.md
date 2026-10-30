## ADDED Requirements

### Requirement: Montagem de projetos
O comando `init` SHALL copiar a `base` e os packs pedidos para o destino, incluir `cap-patterns` com
`cap-app`, substituir o placeholder do `cap-app` e gravar `.sap-btp-kit.json`.

#### Scenario: Projeto novo
- **WHEN** `init ../vendas --packs cap-app` é executado
- **THEN** o destino recebe `base`, `cap-patterns` e `cap-app`, com `.gitignore` restaurado e o manifesto gravado

#### Scenario: Ficheiros existentes
- **WHEN** um ficheiro do pack já existe no destino
- **THEN** o ficheiro MUST NOT ser sobrescrito e é listado, exceto o `AGENTS.md`, que recebe as instruções da base uma só vez

### Requirement: Atualização de projetos
O comando `update` SHALL aplicar a versão do kit em execução, sem perder alterações locais, e MUST
NOT alterar ficheiros do `cap-app`.

#### Scenario: Ficheiro sem alterações locais
- **WHEN** o ficheiro no disco tem o hash do manifesto e o kit mudou
- **THEN** o ficheiro é substituído pela nova versão

#### Scenario: Conflito
- **WHEN** o ficheiro foi alterado no projeto e no kit
- **THEN** o ficheiro é mantido e a nova versão fica em `<ficheiro>.kit-new`

#### Scenario: Ficheiro removido do kit
- **WHEN** um ficheiro do manifesto já não existe no kit
- **THEN** o ficheiro é mantido no projeto e listado num aviso

#### Scenario: Simulação
- **WHEN** `update --dry-run` é executado
- **THEN** o resultado é mostrado e nenhum ficheiro é escrito

#### Scenario: Versão antiga do kit
- **WHEN** o manifesto indica uma versão mais recente do que a do kit em execução
- **THEN** o comando falha sem alterar o projeto
