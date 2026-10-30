# Testes — `test/`

> Como testar a camada de Business Objects. Ver [README.md](README.md) para o índice.

## Um ficheiro de teste por modelo

Os testes organizam-se por domínio: cada `srv/src/model/<Entidade>BO.js` tem o seu
`test/model/<Entidade>BO.test.js`, com o mesmo nome e a mesma estrutura de pastas.

```
srv/src/model/
  BaseBO.js
  CustomerBO.js
  OrderBO.js
test/
  services.test.js          # smoke test: cada service arranca e responde
  model/
    CustomerBO.test.js      # tudo o que diz respeito a Customer
    OrderBO.test.js         # tudo o que diz respeito a Order
```

**Por quê:** quem altera `OrderBO.js` sabe qual o ficheiro de teste a abrir, e um BO sem par em
`test/model/` salta à vista na revisão. Regras que atravessam entidades ficam no ficheiro do BO
que as implementa. Um `<Entidade>DraftBO` que só herda não precisa de ficheiro próprio; se tiver
regras próprias, tem o seu.

## Quando escrever

Os testes fazem parte da task, não vêm depois dela: cada task que cria ou altera um método de BO
escreve ou atualiza os testes desse método no mesmo commit. A change não está pronta enquanto
`npm test` não passar.

- **Regra nova:** um teste para o caminho feliz e um para cada recusa ou ramo.
- **Bug corrigido:** primeiro um teste que falha e reproduz o bug, depois a correção.
- **Regra alterada:** atualiza o teste que descreve o comportamento antigo; não o apagues para o
  build passar.

## Dois níveis no mesmo ficheiro

Cada ficheiro segue a estrutura do BO: um `describe` por método público com regra de negócio,
mais um `describe("pelo service")` para o que só existe no fluxo completo.

| Nível | Chama | Usar para |
|---|---|---|
| **Unitário** | o método do BO, com um `req` mínimo | regras, ramos e recusas: é a maioria dos testes |
| **Pelo service** | HTTP, com `POST`/`GET` do `cds.test` | confirmar que `services.js` liga o evento ao BO, e o status HTTP real |

Os testes pelo service são poucos, um ou dois por evento registado em `services.js`. Os ramos
ficam nos unitários, que são mais rápidos e dizem logo qual o método partido.

```js
import cds from "@sap/cds";
import CustomerBO from "../../srv/src/model/CustomerBO.js";

const test = cds.test(import.meta.dirname + "/../..");
const { POST, expect } = test;

test.axios.defaults.auth = { username: "alice", password: "" };

// Req mínimo: guarda os erros de req.error para o teste os inspecionar.
function fakeReq(data) {
  const errors = [];
  return { data, errors, error: (status, message) => errors.push({ status, message }) };
}

describe("CustomerBO", () => {
  beforeEach(() => test.data.reset());

  describe("validateUniqueEmail", () => {
    it("recusa com 409 um e-mail que já existe", async () => {
      await createCustomer(customerData);
      const req = fakeReq({ email: customerData.email });

      await new CustomerBO().validateUniqueEmail(cds.services.UserService, req);

      expect(req.errors).to.have.length(1);
      expect(req.errors[0].status).to.equal(409);
    });
  });
});
```

O exemplo completo, com o `createCustomer` e os testes pelo service, está no template em
`test/model/CustomerBO.test.js`.

## Regras

- **Base de dados real, não mocks.** O `cds.test` arranca o CAP com SQLite em memória, por isso
  `SELECT`/`UPSERT` correm de verdade. Mock de CQL só testa o mock.
- **Mock só na fronteira externa.** Destinations, Object Store e outros sistemas são substituídos
  no ponto de injeção (ver [business-objects.md](business-objects.md)); nunca se chama um sistema
  real num teste.
- **Cada teste é independente.** `beforeEach(() => test.data.reset())` repõe a base, e cada teste
  cria os dados de que precisa.
- **Sem APIs específicas de um runner.** Usa só `describe`, `it`, hooks e o `expect` do
  `cds.test`, como a [documentação do CAP](https://cap.cloud.sap/docs/node.js/cds-test) recomenda.
- **Verifica o comportamento, não a mensagem.** Para erros, confirma o status; o texto muda com o
  i18n.
- **Nomes em português, a descrever a regra:** `recusa com 409 um e-mail que já existe`, e não
  `testa validateUniqueEmail`.
- **Autenticação mock.** Os services exigem `authenticated-user`: usa os utilizadores mock do CAP
  (`alice`), e testa cada perfil de acesso com que a regra varia.

## Service com draft

Num service com `@odata.draft.enabled`, o `POST` cria só o draft, e o `CREATE` do BO corre na
ativação. O teste pelo service tem de passar pelos dois passos:

```js
async function createCustomer(data) {
  const { data: draft } = await POST(CUSTOMER_URL, data);
  return POST(
    `${CUSTOMER_URL}(customer_id=${draft.customer_id},IsActiveEntity=false)/UserService.draftActivate`,
    {},
  );
}
```

## Como correr

```bash
npm test                  # todos os testes (cds test)
npx cds test CustomerBO   # só os ficheiros cujo nome corresponde
```

`scripts/oflow.sh check` corre o `npm test` antes de qualquer MR.
