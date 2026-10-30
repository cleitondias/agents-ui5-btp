import { join } from "node:path";

import textbundle from "@sap/textbundle";

// Mesmo bundle usado pelos rótulos de campo em ../../../db/schema.cds ({i18n>chave}) —
// ver docs/patterns/cap/business-objects.md.
// Caminho absoluto: em ESM o textbundle não resolve bem caminhos relativos (procura em `file:...`).
const bundle = new textbundle.TextBundle({
  path: join(import.meta.dirname, "../../../_i18n/i18n"),
});

/**
 * Raiz comum de todo Business Object — ver docs/patterns/cap/business-objects.md.
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

  async beforeRead(_pThis, _req) {}

  async afterRead(_pThis, _req) {}

  async beforeCreate(_pThis, _req) {}

  async beforeUpdate(_pThis, _req) {}

  async afterNew(_pThis, _req) {}

  async afterUpdate(_pThis, _req) {}

  async getCurrentUserId(req) {
    return req.user.id;
  }

  async getDraftData(pEntity, req) {
    return await SELECT.one.from(pEntity.drafts).where({
      DraftAdministrativeData_DraftUUID: req.DraftAdministrativeData_DraftUUID,
    });
  }
}
