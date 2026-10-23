# Formatters & Custom Types — `model/formatter.js` / `utils/customTypes.js`

> Padrões de formatação e validação de binding. Ver [README.md](README.md) para o índice.

## `formatter.js`: funções puras, nomeadas pelo dado que produzem, chamadas via `parts`/`formatter` no XML

```js
// model/formatter.js
formatStatusColor: function (sStatus) {
  const byStatus = { approved: "Success", rejected: "Error", pending: "Warning" };
  return sStatus ? byStatus[sStatus.toLowerCase()] : "None";
},
formatDate: function (sDate) {
  if (!sDate) return null;
  return new Intl.DateTimeFormat("pt-BR", {
    year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", hour12: false
  }).format(new Date(sDate));
}
```

```xml
<ObjectStatus state="{path: 'status', formatter: '.formatter.formatStatusColor'}" />
```

- Todo formatter recebe valores primitivos (string/number/array simples), nunca uma entidade
  completa — quando o XML precisa combinar mais de um campo, usar `parts` em vez de passar um
  objeto:

```xml
<Text text="{parts: [{path: 'amount'}, {path: 'operator'}], formatter: '.formatter.formatAmountWithOperator'}" />
```

- Formatters ficam registrados no controller (`this.formatter = formatter`, feito uma vez no
  `BaseController` — ver [controllers.md](controllers.md)) e são referenciados no XML sempre como
  `.formatter.<nome>`, nunca reimplementados inline em `press`/`text` do XML.

## Tradução de valor técnico para label amigável, com fallback pra própria chave

```js
formatToI18nValue: function (sKey) {
  if (!sKey) return "";
  const oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
  const sKeyLower = String(sKey).toLowerCase();
  return oResourceBundle.hasText(sKeyLower) ? oResourceBundle.getText(sKeyLower) : sKey;
}
```

Usado sempre que um valor vindo do backend (um `enum`/código de status/tipo) precisa aparecer
como texto amigável na UI: a chave de i18n é o próprio valor técnico em minúsculo. Mesmo padrão de
fallback do `getI18nText` do controller (ver [controllers.md](controllers.md)) — nunca deixar um
valor sem tradução virar `undefined` na tela.

## Formatação de número/moeda "compactada" com sufixo textual

```js
formatCompactAmount: function (amount) {
  const iAmount = Number(amount);
  const tiers = [[1e9, "Bilhão", "Bilhões"], [1e6, "Milhão", "Milhões"], [1e3, "Mil", "Mil"]];
  for (const [divisor, singular, plural] of tiers) {
    if (iAmount >= divisor) {
      const v = (iAmount / divisor).toFixed(1);
      return `${v} ${Number(v) < 2 ? singular : plural}`;
    }
  }
  return String(iAmount);
}
```

Padrão para qualquer tela dashboard/relatório que precisa mostrar valores grandes de forma
compacta (KPI tiles, cards resumo) — nunca deixar o `Intl.NumberFormat` genérico decidir a
abreviação quando a regra de negócio exige um texto específico (singular/plural, unidade custom).

## `customTypes.js`: `sap.ui.model.SimpleType` para validação de binding, não para formatação de exibição

```js
customEmailType: sap.ui.model.SimpleType.extend("email", {
  formatValue: function (oValue) { return oValue; },
  parseValue: function (oValue) { return oValue; },
  validateValue: function (oValue) {
    if (oValue === "") return;
    const rex = /^\w+[\w-+.]*@\w+([-.]\w+)*\.[a-zA-Z]{2,}$/;
    if (!oValue.match(rex)) {
      throw new sap.ui.model.ValidateException(`'${oValue}' não é um e-mail válido`);
    }
  }
})
```

```xml
<Input value="{
  path: 'email',
  type: 'inetum.mytemplate.utils.customTypes.customEmailType'
}" />
```

- Usar `SimpleType` (e não validação manual num handler de `change`) toda vez que a regra é "esse
  campo só pode conter valores nesse formato" — o UI5 já integra a `ValidateException` com o
  estado de erro visual do campo (borda vermelha + `ValueState`) automaticamente, sem código extra
  no controller.
- `validateValue` pode consultar outro model para regra de unicidade/contexto (ex.: "esse valor já
  está em uso nesta tela"), sempre lendo o model já carregado (`sap.ui.getCore().getModel(...)`),
  nunca disparando uma chamada de rede dentro do validador — validação de binding deve ser
  síncrona.
- `formatValue`/`parseValue` só fazem transformação de **apresentação** (ex.: inserir separador de
  milhar ao exibir, remover ao editar); a regra de negócio de validação sempre vai em
  `validateValue`, nunca misturada em `parseValue`.
