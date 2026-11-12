# `annotations.cds` — apresentação da tela

> Ver [component-and-manifest.md](component-and-manifest.md) para como o `entitySet` anotado aqui
> vira rota/target no `manifest.json`, e [controller-extensions.md](controller-extensions.md) para
> o que fazer quando a anotação genuinamente não cobre o caso.

Cada app Fiori Elements tem um `annotations.cds` na raiz (`app/<feature>/annotations.cds`) que
importa o service CAP e anota as entidades expostas. **Esse arquivo é a tela** — List Report e
Object Page são gerados a partir dele, não escritos à mão.

```cds
using AdminService as service from '../../srv/services';
using from '../../db/schema';
```

## Lista (`UI.LineItem`)

Uma entrada por coluna da tabela do List Report, na ordem em que aparecem. `Label` sempre via chave
i18n (`{i18n>Chave}`), nunca texto solto — a chave existe em `i18n/i18n.properties` antes de a tela
ser testada.

```cds
annotate service.Currencies with @(
    UI.LineItem : [
        { $Type: 'UI.DataField', Value: code, Label: '{i18n>Currencies}' },
        { $Type: 'UI.DataField', Value: descr, Label: '{i18n>description}' },
    ]
);
```

Campo derivado de associação (chave estrangeira) some da lista quando só a chave interessa e
`@Common.FieldControl: #ReadOnly` + `![@UI.Hidden]` quando o campo é técnico mas ainda precisa
existir na Object Page (ver [Facets](#object-page-uifacets--uifieldgroup) abaixo).

## `UI.HeaderInfo`

Título/subtítulo mostrados no cabeçalho da Object Page e na linha do List Report. `Title` é sempre
o campo "nome de negócio" da entidade (nunca a chave técnica); `Description` complementa quando há
um segundo campo textual relevante.

```cds
annotate service.Currencies with @(UI.HeaderInfo: {
    TypeName: '{i18n>Currency}',
    TypeNamePlural: '{i18n>Currencies}',
    Title: { $Type: 'UI.DataField', Value: code },
    Description: { $Type: 'UI.DataField', Value: descr },
});
```

## Object Page (`UI.Facets` + `UI.FieldGroup`)

`UI.Facets` lista as seções da Object Page na ordem em que aparecem; cada `UI.ReferenceFacet` aponta
para um `UI.FieldGroup` (campos escalares) ou, para uma composição/associação 1:N, para o
`UI.LineItem` qualificado da entidade filha (tabela embutida — ver seção
[Faceta de tabela (composição 1:N)](#faceta-de-tabela-composição-1n)).

```cds
annotate service.Currencies with @(
    UI.Facets : [
        { $Type: 'UI.ReferenceFacet', Label: '{i18n>basic_info}', ID: 'i18nbasic_info', Target: '@UI.FieldGroup#i18nbasic_info' },
        { $Type: 'UI.ReferenceFacet', Label: '{i18n>add_info}', ID: 'i18nadd_info', Target: '@UI.FieldGroup#i18nadd_info' },
    ],
    UI.FieldGroup #i18nbasic_info: {
        $Type: 'UI.FieldGroupType',
        Data: [
            { $Type: 'UI.DataField', Value: code, Label: '{i18n>Currency}' },
            { $Type: 'UI.DataField', Value: descr, Label: '{i18n>description}' },
        ],
    }
);
```

Convenções:

- `ID` do facet é o nome do `#qualifier` do `FieldGroup` prefixado por `i18n` só por consistência de
  nomenclatura com a chave de tradução — não tem efeito funcional, mas mantenha o padrão em telas
  novas para grep previsível.
- Um `FieldGroup` por bloco temático (dados básicos, validade, valores, ativo/inativo) — nunca um
  único `FieldGroup` gigante com todos os campos da entidade.
- Campo só leitura dentro de um `FieldGroup` (derivado, calculado, chave de associação mostrada por
  transparência): `@Common.FieldControl: #ReadOnly`. Campo técnico que não deveria aparecer de jeito
  nenhum: `![@UI.Hidden]` no `DataField`, mantendo-o só para satisfazer bindings internos.

### Faceta de tabela (composição 1:N)

Quando a entidade tem uma composição (ex.: `Catalog` → `catalog_items`), a faceta aponta direto para
um `UI.LineItem` qualificado da entidade filha, anotado separadamente:

```cds
{ $Type: 'UI.ReferenceFacet', Label: '{i18n>CatalogItems}', ID: 'CatalogItems', Target: 'catalog_items/@UI.LineItem#CatalogItems' }
```

```cds
annotate service.CatalogItem with @(UI.LineItem #CatalogItems: [
    { $Type: 'UI.DataField', Value: vehicle_vehicle_id, Label: '{i18n>Vehicle}', @Common.FieldControl: #ReadOnly },
]);
```

## Texto associado a chave estrangeira (`Common.Text`)

Toda associação/chave estrangeira mostrada numa tela precisa de `Common.Text` apontando para o campo
"nome de negócio" da entidade referenciada, com `TextArrangement: #TextOnly` para mostrar só o texto
(não `"chave (texto)"`) — sem isso o campo aparece só como ID técnico.

```cds
annotate service.Vehicle with {
    vehicle_id @Common.Text: { $value: brand, ![@UI.TextArrangement]: #TextOnly }
};
```

## Value help (`Common.ValueList`)

Toda chave estrangeira editável precisa de `Common.ValueList` na própria associação (não na chave
escalar), com pelo menos um `Common.ValueListParameterInOut` (o campo que é de fato gravado) e um ou
mais `Common.ValueListParameterDisplayOnly`/`...Out` (colunas mostradas no diálogo de seleção, sem
gravar de volta a menos que preencham outro campo local).

```cds
annotate service.CatalogItem with {
    renting_company @(Common.ValueList: {
        $Type: 'Common.ValueListType',
        CollectionPath: 'RentingCompany',
        Parameters: [
            { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: renting_company_renting_company_id, ValueListProperty: 'renting_company_id' },
            { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'renting_company_name' },
        ],
        Label: '{i18n>Rentingcompanyrentingcompanyid}',
        PresentationVariantQualifier: 'vh_CatalogItem_renting_company',
    }, Common.ValueListWithFixedValues: false)
};
```

Sempre que o value help precisar de ordenação previsível, anote um
`UI.PresentationVariant #<qualifier>` na entidade alvo com o mesmo `PresentationVariantQualifier`
referenciado acima — nunca confie na ordem natural da tabela.

```cds
annotate service.RentingCompany with @(
    UI.PresentationVariant #vh_CatalogItem_renting_company: {
        $Type: 'UI.PresentationVariantType',
        SortOrder: [{ $Type: 'Common.SortOrderType', Property: renting_company_name, Descending: false }],
    }
);
```

## Efeito colateral entre campos (`Common.SideEffects`)

Quando um campo calculado depende de outros campos editáveis da mesma entidade (ex.: total de
aluguer recalculado ao editar tarifa/seguro), anote `Common.SideEffects` para o Fiori Elements
re-ler os campos-alvo automaticamente após a edição — nunca recalcule isso em JavaScript de
controller.

```cds
annotate service.CatalogItem @(Common: {
    SideEffects #CalcRentIns: {
        SourceProperties: ['rent', 'insurance_amount'],
        TargetProperties: ['rent_ins', 'rent_total', 'rent_serv_tax'],
    },
});
```

## Checklist ao anotar uma entidade nova

1. `UI.LineItem` (lista) e `UI.HeaderInfo` (título) — sem isso a tela nem abre.
2. `UI.Facets`/`UI.FieldGroup` (Object Page), um grupo por bloco temático.
3. `Common.Text` em toda associação mostrada como campo simples.
4. `Common.ValueList` (+ `UI.PresentationVariant` de ordenação) em toda associação editável.
5. `Common.FieldControl`/`UI.Hidden` nos campos derivados/técnicos.
6. `Common.SideEffects` em todo campo calculado a partir de outros campos editáveis.
7. Toda chave `{i18n>...}` usada acima já existe em `i18n/i18n.properties` (ver
   [project-structure-and-i18n.md](project-structure-and-i18n.md)).
