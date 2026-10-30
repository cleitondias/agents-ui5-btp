import cds from "@sap/cds";

/**
 * Smoke test do template: arranca o servidor CAP (SQLite em memória, auth mock) e confirma que
 * cada service responde. Os testes de cada domínio ficam em test/model/ — ver docs/patterns/cap/testing.md.
 * Corre com `npm test` (`cds test`, o runner do @sap/cds-dk sobre o node:test, com @cap-js/cds-test).
 */
const test = cds.test(import.meta.dirname + "/..");
const { GET, expect } = test;

// Os services exigem `authenticated-user`: em desenvolvimento a auth é mock e `alice` é um dos
// utilizadores pré-definidos pelo CAP.
test.axios.defaults.auth = { username: "alice", password: "" };

describe("Services do template", () => {
  it("expõe o $metadata do AdminService", async () => {
    const { status, data } = await GET`/odata/v4/api/admin/$metadata`;
    expect(status).to.equal(200);
    expect(data).to.include("Customer");
  });

  it("expõe o $metadata do UserService", async () => {
    const { status, data } = await GET`/odata/v4/api/user/$metadata`;
    expect(status).to.equal(200);
    expect(data).to.include("Customer");
  });

  it("lista Customer no UserService", async () => {
    const { status, data } = await GET`/odata/v4/api/user/Customer`;
    expect(status).to.equal(200);
    expect(data.value).to.be.an("array");
  });
});
