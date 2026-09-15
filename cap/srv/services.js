import cds from "@sap/cds";

import CustomerBO from "./src/model/CustomerBO.js";

/**
 * services.js fica só com o roteamento de eventos CAP -> Business Objects.
 * Ver ../patterns/business-objects.md — nenhuma lógica de negócio deve ficar aqui.
 */
export default class UserService extends cds.ApplicationService {
  async init() {
    this.before("READ", "Customer", async (req) => {
      try {
        await new CustomerBO().beforeRead(this, req);
      } catch (error) {
        throw new Error(error);
      }
    });

    this.before("CREATE", "Customer", async (req) => {
      try {
        await new CustomerBO().beforeCreate(this, req);
      } catch (error) {
        throw new Error(error);
      }
    });

    this.before("UPDATE", "Customer", async (req) => {
      try {
        await new CustomerBO().beforeUpdate(this, req);
      } catch (error) {
        throw new Error(error);
      }
    });

    return super.init();
  }
}
