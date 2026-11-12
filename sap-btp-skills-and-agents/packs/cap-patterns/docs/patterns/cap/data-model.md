# Data Model — `db/schema.cds`

> Padrões de modelagem CDS. Ver [README.md](README.md) para o índice.

## Namespace

Um único namespace por projeto, no formato `<empresa>.<sigla-do-projeto>`:

```cds
using { sap, managed, Currency, Language } from '@sap/cds/common';

namespace inetum.<sigla>;
```

Todas as entidades de domínio vivem nesse namespace. `sap`, `managed`, `Currency` e `Language`
vêm sempre de `@sap/cds/common` — não redefinir tipos de moeda/idioma manualmente.

## Toda entidade estende `managed`

```cds
entity Resource : managed {
  key resource_id : UUID @(Core.Computed: true);
  ...
}
```

`managed` adiciona `createdAt`, `createdBy`, `modifiedAt`, `modifiedBy` automaticamente.
**Por quê:** auditoria (quem criou/alterou) é requisito padrão — não reimplementar isso
manualmente entidade por entidade.

Quando os campos de auditoria precisam aparecer na UI com rótulo diferente do técnico, criar um
aspect próprio que reexporta `managed` com nomes traduzidos:

```cds
aspect custom.managed {
  createdAt     : managed:createdAt;
  createdBy     : managed:createdBy;
  LastChangedAt : managed:modifiedAt;
  LastChangedBy : managed:modifiedBy;
}
```

## Chaves: UUID computado pelo servidor

```cds
key resource_id : UUID @(Core.Computed: true);
```

- Nome da chave é sempre `<nome_da_entidade_em_snake_case>_id`, nunca `ID` genérico — facilita
  join legível em CDS (`order.order_id`) e evita colisão de nome quando a entidade participa de
  várias associações.
- `@(Core.Computed: true)` sinaliza ao Fiori Elements que o campo é gerado pelo backend e não deve
  virar input editável em telas de criação.
- Chaves compostas (chave estrangeira + campo de negócio) são usadas quando a granularidade
  natural do registro exige isso — ex.: um histórico datado, ou uma associação N:N com atributos
  próprios:

```cds
entity ResourceAssignment : managed {
  key resource : Association to Resource;
  key begin_date : Date;
  ...
}
```

## Nomenclatura de campos: `snake_case`

Todos os campos de negócio usam `snake_case` (`reference_number`, `total_amount`,
`is_active`), nunca camelCase — só os campos herdados de um aspect de auditoria customizado
(`LastChangedAt`) fogem à regra porque batem com o rótulo de UI. Manter essa convenção uniforme em
todo o schema; o CAP expõe o campo com o mesmo nome via OData, então divergir gera atrito no
front-end (o binding do Fiori Elements usa o nome exato do campo).

## Association vs. Composition

- **Association**: referência a uma entidade "dona de si mesma" (não é deletada em cascata).
  Ex.: `Order.customer : Association to Customer` — o pedido referencia o cliente, mas apagar o
  pedido não apaga o cliente.
- **Composition**: relação pai-filho onde o filho não existe sem o pai e é deletado em cascata.
  Ex.:

```cds
entity Order : managed {
  key order_id    : UUID @(Core.Computed: true);
      order_items : Composition of many OrderItem
                      on order_items.order = $self;
}
```

Regra prática: se o filho aparece como uma tabela/seção dentro da Object Page do pai no Fiori
Elements (itens de um pedido, anexos de um contrato, imagens de um produto), é `Composition`. Se é
só uma referência/lookup, é `Association`.

## Entidade "hub" com Association reversa, quando o domínio exige escopo compartilhado

Quando o domínio tem um conceito central que todo o resto referencia (ex.: um tenant de negócio,
uma unidade organizacional, um projeto), essa entidade centraliza a associação e declara a
inversa para cada entidade dependente:

```cds
entity Tenant : managed {
  key tenant_id : UUID @(Core.Computed: true);
      name      : String(120) @mandatory;
      orders    : Association to many Order
                    on orders.tenant = $self;
      resources : Association to many Resource
                    on resources.tenant = $self;
      // ... uma linha por entidade dependente
}
```

Isso não é normalização de banco — é o que viabiliza um filtro automático de escopo na camada de
Business Object (ver [business-objects.md](business-objects.md)). Ao criar uma nova entidade que
precisa desse escopo, sempre: (a) adicionar a Association direta nela, e (b) adicionar a linha
correspondente na entidade hub.

## Campos calculados/monetários

Campos de valor monetário são sempre `Decimal(8, 2)` com sufixos de negócio explícitos
(`net_amount`, `tax_amount`, `total_amount`) em vez de um único campo genérico `amount` —
cada estágio do cálculo fica persistido e auditável, não só o resultado final. A lógica de
cálculo correspondente mora na camada de Business Object, nunca no schema.

## Extensão de tipos comuns do CAP

Tipos de `@sap/cds/common` (`sap.common.Currencies`, `sap.common.Languages`) podem ser estendidos
com `extend` quando o domínio precisa de metadados adicionais:

```cds
extend sap.common.Currencies with {
  numcode  : Integer;
  exponent : Integer; //> e.g. 2 --> 1 Dollar = 10^2 Cent
  minor    : String;  //> e.g. 'Cent'
}
```

Preferir `extend` a recriar a entidade do zero, para manter a integração automática com value
helps e traduções que o CAP já fornece para esses tipos comuns.

## Anexos/documentos: um shape fixo para toda entidade que precisa de upload

```cds
entity ResourceDocument : managed {
  key resource               : Association to Resource;
  key resource_document_id   : UUID @(Core.Computed: true);
      document_title         : String(120) @mandatory;
      filename                : String;
      file                    : LargeString;
      filetype                : String;
      visibleDownload         : Boolean default false;
      visibleUpload           : Boolean default true;
      public                  : Boolean;
}
```

`file: LargeString` guarda o conteúdo (base64) apenas em trânsito — depois do upload, a camada de
Business Object grava o binário num Object Store externo (S3 ou equivalente) e limpa esse campo
para não inchar o banco (ver [business-objects.md](business-objects.md)). Sempre que uma entidade
nova precisar de anexos, replicar esse mesmo conjunto de campos.
