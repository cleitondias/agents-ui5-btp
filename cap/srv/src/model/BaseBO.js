import textbundle from "@sap/textbundle";

// Mesmo bundle usado pelos rótulos de campo em ../../../db/schema.cds ({i18n>chave}) —
// ver ../../../patterns/business-objects.md.
const bundle = new textbundle.TextBundle({ path: "../../../_i18n/i18n" });

/**
 * Raiz comum de todo Business Object — ver ../../../patterns/business-objects.md.
 * Concentra aqui qualquer comportamento transversal (auditoria, escopo de acesso,
 * normalização de payload) que deva rodar em toda entidade, sem duplicação BO por BO.
 */
export default class BaseBO {
  constructor() {}

  /**
   * Mensagens voltadas ao usuário sempre passam por aqui — nunca string literal
   * espalhada pelos BOs. Chaves vivem em ../../../_i18n/i18n.properties.
   */
  getText(key, ...args) {
    return bundle.getText(key, args.length === 1 ? args[0] : args);
  }

  async beforeRead(pThis, req) {}

  async afterRead(pThis, req) {}

  async beforeCreate(pThis, req) {}

  async beforeUpdate(pThis, req) {}

  async afterNew(pThis, req) {}

  async afterUpdate(pThis, req) {}

  async getCurrentUserId(req) {
    return req.user.id;
  }

  async getDraftData(pEntity, req) {
    return await SELECT.one.from(pEntity.drafts).where({
      DraftAdministrativeData_DraftUUID: req.DraftAdministrativeData_DraftUUID,
    });
  }
}
