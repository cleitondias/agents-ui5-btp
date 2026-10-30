import cds from "@sap/cds";
import CustomerBO from "../../srv/src/model/CustomerBO.js";

/**
 * Testes do domínio Customer: um ficheiro por BO, espelhando srv/src/model/CustomerBO.js.
 * Ver docs/patterns/cap/testing.md.
 */
const test = cds.test(import.meta.dirname + "/../..");
const { POST, expect } = test;

test.axios.defaults.auth = { username: "alice", password: "" };

const CUSTOMER_URL = "/odata/v4/api/user/Customer";
const customerData = { name: "Ana Silva", email: "ana@example.com" };

// Req mínimo para testar um método do BO sem passar pelo HTTP: guarda os erros de req.error.
function fakeReq(data) {
  const errors = [];
  return { data, errors, error: (status, message) => errors.push({ status, message }) };
}

// O UserService tem draft: criar um registo é criar o draft e ativá-lo.
async function createCustomer(data) {
  const { data: draft } = await POST(CUSTOMER_URL, data);
  return POST(
    `${CUSTOMER_URL}(customer_id=${draft.customer_id},IsActiveEntity=false)/UserService.draftActivate`,
    {},
  );
}

describe("CustomerBO", () => {
  beforeEach(() => test.data.reset());

  describe("normalizeEmail", () => {
    it("remove espaços e passa o e-mail a minúsculas", async () => {
      const req = fakeReq({ email: "  Ana@Example.COM " });

      await new CustomerBO().normalizeEmail(req);

      expect(req.data.email).to.equal("ana@example.com");
    });

    it("não cria o campo quando o payload não traz e-mail", async () => {
      const req = fakeReq({ name: "Ana" });

      await new CustomerBO().normalizeEmail(req);

      expect(req.data).to.not.have.property("email");
    });
  });

  describe("validateUniqueEmail", () => {
    it("aceita um e-mail que ainda não existe", async () => {
      const req = fakeReq({ email: "nova@example.com" });

      await new CustomerBO().validateUniqueEmail(cds.services.UserService, req);

      expect(req.errors).to.have.length(0);
    });

    it("recusa com 409 um e-mail que já existe", async () => {
      await createCustomer(customerData);
      const req = fakeReq({ email: customerData.email });

      await new CustomerBO().validateUniqueEmail(cds.services.UserService, req);

      expect(req.errors).to.have.length(1);
      expect(req.errors[0].status).to.equal(409);
    });
  });

  describe("pelo service", () => {
    it("guarda o e-mail normalizado ao criar", async () => {
      const { status, data } = await createCustomer({ ...customerData, email: " ANA@Example.com" });

      expect(status).to.equal(201);
      expect(data.email).to.equal("ana@example.com");
    });

    it("devolve 409 ao criar um e-mail duplicado", async () => {
      await createCustomer(customerData);

      await expect(createCustomer(customerData)).to.be.rejectedWith(/409/);
    });
  });
});
