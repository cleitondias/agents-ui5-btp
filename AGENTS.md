# Instruções para agentes

## Regras de trabalho

### Uma branch por alteração (obrigatório)

**Toda nova alteração deve ser feita numa branch nova e separada. Nunca faça commits diretamente na `dev`.**

1. Parta da `dev` atualizada: `git checkout dev && git pull`.
2. Crie uma branch com prefixo que descreva o tipo de mudança:
  - `feat/<descricao>`: funcionalidade nova
  - `fix/<descricao>`: correção de bug
  - `docs/<descricao>`: documentação
  - `refactor/<descricao>`, `chore/<descricao>`: refatoração, manutenção, dependências
  - Exemplo: `git checkout -b feat/filtro-por-tag`
3. Uma branch trata **uma** alteração. Não misture mudanças sem relação na mesma branch.
4. Integre na `dev` só por Pull Reques/Merge Request. 

### Manutenção obrigatória do README

Sempre que uma mudança adicionar, remover, renomear ou alterar uma pasta, ferramenta, skill ou agente deste repositório, atualize também o arquivo `README.md` na mesma tarefa.

A atualização do `README.md` deve:

- incluir o nome exato do item;
- explicar de forma breve e objetiva sua finalidade;
- indicar o caminho da pasta ou do arquivo principal;
- informar como usar, instalar ou executar o item, quando aplicável;
- atualizar links, exemplos e referências afetados por renomeações ou remoções;
- manter a organização e o idioma já adotados na seção correspondente;
- evitar referências a itens que não existem mais no repositório.

Antes de concluir a tarefa:

1. Compare a estrutura atual do repositório com o conteúdo do `README.md`.
2. Confirme que todas as pastas, ferramentas, skills e agentes relevantes estão documentados.
3. Inclua a alteração do `README.md` no mesmo conjunto de mudanças.

Uma tarefa que modifica esses itens não deve ser considerada concluída enquanto o `README.md` estiver desatualizado.

### Atualização do campo "Últimas Atualização foi:"

Ao atualizar uma skill/pasta, atualize o campo "Últimas Atualização foi:" no README.md na linha daquela Skill e atualize o mesmo campo "Últimas Atualização foi:" que é geral e está no inicio do arquivo README.md
