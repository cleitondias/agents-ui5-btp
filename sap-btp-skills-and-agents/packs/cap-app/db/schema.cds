using { managed } from '@sap/cds/common';

namespace inetum.template;

/**
 * Entidade de exemplo, seguindo os padrões descritos em docs/patterns/cap/data-model.md:
 * - namespace <empresa>.<sigla>
 * - toda entidade estende `managed` (createdAt/createdBy/modifiedAt/modifiedBy automáticos)
 * - chave `<entidade>_id` como UUID computado pelo servidor
 * - campos de negócio em snake_case
 * - rótulos via i18n (../_i18n/i18n.properties), nunca texto fixo — o mesmo bundle é lido em
 *   runtime pela camada de Business Object (ver ../srv/src/model/BaseBO.js) para mensagens de erro.
 */
@title: '{i18n>Customer}'
entity Customer : managed {
  key customer_id : UUID        @(Core.Computed: true) @title: '{i18n>customer_id}';
      name         : String(120) @mandatory             @title: '{i18n>name}';
      email        : String(150) @mandatory             @title: '{i18n>email}';
      phone        : String(20)                         @title: '{i18n>phone}';
      active       : Boolean default true                @title: '{i18n>active}';
}
