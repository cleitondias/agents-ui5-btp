# Tratamento de Erros — `srv/src/utils/HTTPHelpers.js`

> Padrão complementar ao `try { } catch (error) { throw new Error(error); }` de
> [business-objects.md](business-objects.md). Ver [README.md](README.md) para o índice.

## Erros tipados com status HTTP explícito

Em vez de lançar `Error` genérico quando a camada de Business Object precisa recusar uma operação
por uma razão de negócio específica (conflito, recurso não encontrado, payload inválido), usar
fábricas de erro que carregam o status HTTP junto da mensagem:

```js
// srv/src/utils/HTTPHelpers.js
const httpErrors = {
  badRequest: (msg) => ({ status: 400, body: new Error(msg) }),
  notFound: (msg) => ({ status: 404, body: new Error(msg) }),
  conflict: (msg) => ({ status: 409, body: new Error(msg) }),
  unprocessableContent: (msg) => ({ status: 422, body: new Error(msg) }),
  internalServer: (msg) => ({ status: 500, body: new Error(msg) }),
};

module.exports = httpErrors;
```

```js
const { conflict, badRequest } = require("../../utils/HTTPHelpers");

if (owner) {
  throw conflict(bundle.getText("errorOwnerAlreadyExists"));
}
if (!changes?.length) {
  throw badRequest(bundle.getText("errorNoChangesInformed"));
}
```

**Por quê:** o `throw new Error(error)` genérico do wiring em `services.js` continua sendo a rede
de segurança para qualquer exceção não prevista, mas ele sempre vira erro 500 para o cliente OData.
Quando o BO precisa recusar uma operação por uma razão de negócio identificável (conflito, recurso
inexistente), o cliente Fiori precisa do status certo para decidir como reagir — um 409 e um 500
não devem ser tratados da mesma forma na UI. A mensagem passada para a fábrica de erro segue a
mesma regra de i18n de qualquer outra mensagem voltada ao usuário: sempre `bundle.getText(<chave>)`
(ver [business-objects.md](business-objects.md)), nunca string literal.

## Handler central de erro por service, para cobrir `$batch`

```js
// srv/services.js (ou arquivo de wiring equivalente)
function errorHandler(error, req) {
  if (req.http.req.url.includes("$batch") || error.statusCode) {
    if (error.body) {
      error.message = error.body.message;
      error.statusCode = error.status;
    }
    return;
  }

  if (!error.status) {
    return req.http.res.status(500).json({ message: "Internal Server Error" });
  }

  req.http.res.status(error.status).json({ message: error.body?.message });
}

class MyService extends cds.ApplicationService {
  async init() {
    this.on("error", errorHandler);
    return super.init();
  }
}
```

Registrar com `srv.on("error", errorHandler)` uma vez por service. **Por quê:** dentro de uma
requisição `$batch`, o CAP já sabe extrair a mensagem certa de um erro com `statusCode` — sobrescrever
a resposta HTTP manualmente nesse caso quebra o formato esperado pelo cliente OData. Fora de
`$batch`, o handler é quem traduz o par `{ status, body }` das fábricas de erro acima numa resposta
JSON consistente (`{ message }`), com fallback para 500 quando o erro não tem `status` (exceção não
prevista, ainda coberta pela rede de segurança do `try/catch` do BO).

## Armadilha: as fábricas de erro nunca lançam sozinhas — sempre `throw`

```js
// Bug: a função continua executando e "retorna" um objeto de erro como se fosse dado válido
if (!resource) {
  return notFound(bundle.getText("errorResourceNotFound"));
}

// Correto
if (!resource) {
  throw notFound(bundle.getText("errorResourceNotFound"));
}
```

`badRequest`, `notFound`, `conflict` etc. são **fábricas** — só constroem e devolvem o objeto `{
status, body }`, elas mesmas não interrompem o fluxo. Um `return` no lugar de `throw` faz o método
terminar "com sucesso", devolvendo esse objeto de erro como se fosse o retorno esperado — o
chamador (controller, outro service, o wiring do CAP) não tem como distinguir isso de um resultado
válido, e o erro só aparece muito mais adiante, de forma confusa, quando algo tenta ler um campo
que não existe nesse objeto. Revisar com atenção qualquer guard clause que use uma dessas fábricas
sem `throw` na frente.
