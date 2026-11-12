import BaseBO from "./BaseBO.js";

/**
 * Business Object da entidade Customer — ver docs/patterns/cap/business-objects.md.
 * services.js só chama estes métodos; nenhuma lógica de negócio deve viver no wiring de eventos.
 */
export default class CustomerBO extends BaseBO {
  constructor() {
    super();
  }

  async beforeRead(pThis, req) {
    await super.beforeRead(pThis, req);
  }

  async beforeCreate(pThis, req) {
    await super.beforeCreate(pThis, req);
    await this.normalizeEmail(req);
    await this.validateUniqueEmail(pThis, req);
  }

  async beforeUpdate(pThis, req) {
    await super.beforeUpdate(pThis, req);
    await this.normalizeEmail(req);
  }

  async normalizeEmail(req) {
    if (req.data.email) {
      req.data.email = req.data.email.trim().toLowerCase();
    }
  }

  async validateUniqueEmail(pThis, req) {
    const { Customer } = pThis.entities;

    const existingCustomer = await SELECT.one
      .from(Customer)
      .where({ email: req.data.email });

    if (existingCustomer) {
      req.error(409, this.getText("errorCustomerEmailDuplicate", req.data.email));
    }
  }
}
