# Estilo de Código — regras gerais de clareza

> Regras de nível método/função que se aplicam a qualquer classe `*BO.js` (ver
> [business-objects.md](business-objects.md)) ou helper em `srv/src/utils/`. Ver
> [README.md](README.md) para o índice.

## Guard clauses primeiro, lógica de negócio depois

Validar todas as pré-condições no topo do método, cada uma com `return`/`throw` imediato, antes de
escrever a lógica principal:

```js
async handle({ resource_id, category, amount }) {
  const resource = await this.findActiveResource(resource_id);
  if (!resource) throw badRequest(bundle.getText("errorResourceNotFound"));

  const rule = findRuleInResource(resource, category);
  if (!rule) throw notFound(bundle.getText("errorCategoryNotFound"));

  if (rule.type === "TEXT") {
    throw unprocessableContent(bundle.getText("errorTextRuleHasNoCalculatedValue"));
  }

  // a partir daqui, o método só lida com o caso feliz
  ...
}
```

**Por quê:** um método que intercala validação e lógica principal (`if (valido) { ... lógica ...
} else { throw ... }`) força quem lê a segurar todos os `if`s abertos na cabeça até o fim do
método. Guard clauses no topo tornam as pré-condições uma lista lida de cima para baixo, e o corpo
do método, abaixo delas, só precisa lidar com o caso válido. Usar sempre os erros tipados de
[error-handling.md](error-handling.md) nesses `throw`, com a mensagem resolvida via
`bundle.getText(<chave>)` (ver i18n em [business-objects.md](business-objects.md)) — nunca `Error`
genérico nem string literal em português direto no `throw`.

## Tabela de dispatch em vez de cadeia de `if`/`switch` para valores tipo enum

```js
// Ruim: cadeia de if crescendo a cada operador novo
if (operator === "GTE") return value >= threshold;
if (operator === "GT") return value > threshold;
if (operator === "LTE") return value <= threshold;
// ...

// Bom: mapa de função por chave
const operatorFunctions = {
  GTE: (value, threshold) => value >= threshold,
  GT: (value, threshold) => value > threshold,
  LTE: (value, threshold) => value <= threshold,
  LT: (value, threshold) => value < threshold,
  EQ: (value, threshold) => value === threshold,
};

const matches = operatorFunctions[rule.operator]?.(value, rule.threshold) ?? false;
```

Usar sempre que o valor testado vem de um campo de negócio com um conjunto fechado de opções
(operador de regra, tipo de documento, status de workflow). **Por quê:** adicionar um operador novo
vira uma linha no mapa, não mais um `if`/`else if` no meio de uma cadeia já longa; e o acesso
`operatorFunctions[x]` deixa claro, só de olhar o objeto, todas as opções válidas num único lugar.

## Nunca duplicar o mesmo bloco de query — extrair em método nomeado

Se a mesma `SELECT`/`db.read` com as mesmas `columns` aparece mais de uma vez no mesmo método
(ex.: uma vez para o caso principal, outra dentro de um `if` de fallback), extrair num método
privado da própria classe, nomeado pelo que ele retorna:

```js
// Ruim: o mesmo SELECT.columns(...) repetido em dois pontos do handle()
class ResourceOwnerBO extends BaseBO {
  async handle(filter) {
    const owners = await SELECT(Owner).columns((o) => { o.email, o.teams(...) }).where(filter);
    if (owners.length) return { owners };

    // ...20 linhas depois, o mesmo SELECT de novo com outro `where`
    const fallbackOwners = await SELECT(Owner).columns((o) => { o.email, o.teams(...) }).where(fallbackFilter);
    return { owners: fallbackOwners };
  }
}

// Bom
class ResourceOwnerBO extends BaseBO {
  async handle(filter, fallbackFilter) {
    const owners = await this.findOwnersWithTeams(filter);
    if (owners.length) return { owners };

    return { owners: await this.findOwnersWithTeams(fallbackFilter) };
  }

  async findOwnersWithTeams(filter) {
    const { Owner } = this.entities;
    return SELECT(Owner).columns((o) => { o.email, o.teams((t) => { t.team_id }) }).where(filter);
  }
}
```

**Por quê:** duas cópias da mesma query divergem silenciosamente com o tempo (alguém adiciona uma
coluna numa cópia e esquece a outra). Um método nomeado também documenta a intenção da query
(`findOwnersWithTeams`) em vez de deixar quem lê remontar o propósito a partir das colunas
selecionadas.

## Um método faz uma coisa; métodos longos viram vários métodos nomeados

Um `handle()`/hook de BO que mistura montagem de query, cálculo de regra de negócio e formatação
de resposta no mesmo bloco de 100+ linhas deve ser quebrado em métodos privados menores, cada um
nomeado por sua responsabilidade (`buildOwnerFilter`, `resolveMatchingRules`, `formatFioriRows`).
O método público (`handle`) fica como um resumo em poucas linhas que só chama esses métodos em
sequência — a leitura do `handle()` já conta a história do fluxo, sem precisar entrar em cada
etapa para entender o que ela faz.

## Cuidado com operadores lógicos em condições booleanas

```js
// Bug: "??" (nullish coalescing) não é "||" (ou lógico) — entre dois booleanos, sempre
// retorna o da esquerda, porque um boolean nunca é null/undefined.
if (arg === undefined ?? arg === null) { ... }   // sempre avalia (arg === undefined)

// Correto
if (arg === undefined || arg === null) { ... }
// ou, de forma mais direta:
if (arg == null) { ... }
```

Revisar com atenção qualquer condição que combine `===`/`!==` com `??` — são operadores para
propósitos diferentes (valor default vs. curto-circuito lógico) e o linter não pega essa confusão
porque a expressão é sintaticamente válida.
