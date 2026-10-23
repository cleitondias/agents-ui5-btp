# Views & Fragments — `view/*.view.xml` / `view/fragments/*.fragment.xml`

> Padrões de estruturação de XML. Ver [README.md](README.md) para o índice.

## View raiz: shell fixo + `App` control como container de roteamento

`view/App.view.xml` hospeda o chrome persistente da aplicação (cabeçalho, `IconTabHeader` de
navegação principal ligado a `navBarModel>/selectedPage`, com `select=".onTabSelect"`) e, dentro
dele, um `<App id="app">` — o `id` referenciado em `manifest.json` (`sap.ui5.routing.config.controlId`)
como container onde o roteador injeta cada página. Nenhuma outra view repete esse chrome — todas as
demais views são só conteúdo de página, roteadas para dentro do `App`.

## Muitos modelos nomeados pequenos, não um modelo único gigante

```xml
<Input value="{manageResource>/form/name}" />
<Text text="{i18n>label_name}" />
<ObjectStatus state="{path: 'main>status', formatter: '.formatter.formatStatusColor'}" />
```

Cada estado de UI transiente (dados de um formulário de diálogo, filtro selecionado, estado
`{bEdit, bView}` de uma tela) vive no seu próprio `JSONModel` nomeado (`manageResource`, `mode`,
`navBarModel`), setado via `this.setModel(...)`/`setComponentModel(...)` do controller (ver
[controllers.md](controllers.md)) — nunca acumulado dentro do model principal de negócio
(`main`, o `ODataModel`). Isso deixa claro, só pelo prefixo do binding, se um valor vem do backend
ou é estado local de UI.

## Binding de expressão para lógica booleana simples; `formatter` só para transformação real

```xml
<Link visible="{= ${mode>/bEdit} === true }" />
<Input enabled="{= ${manageResource>/action} === 'edit' }" />
```

Comparação/booleano simples inline como expression binding (`{= ... }`); reservar `formatter:`
para quando o valor exibido precisa de lógica não trivial (formatação de data, mapeamento
status→cor, i18n dinâmico) — ver [formatters-and-types.md](formatters-and-types.md). Não criar um
formatter só para inverter um booleano ou comparar com uma constante.

## Fragments de diálogo: `FragmentDefinition` → `Dialog` → rodapé Cancelar/Salvar

```xml
<core:FragmentDefinition xmlns="sap.m" xmlns:core="sap.ui.core">
  <Dialog title="{= ${manageResource>/action} === 'add' ? ${i18n>title_add_resource} : ${i18n>title_edit_resource} }">
    <VBox class="sapUiSmallMargin">
      <Label text="{i18n>label_name}" required="true" />
      <Input value="{manageResource>/form/name}" required="true" />
    </VBox>
    <buttons>
      <Button text="{i18n>btn_cancel}" type="Ghost" press=".onCloseDialog" />
      <Button text="{i18n>btn_save}" type="Emphasized" press=".handleSaveResource" />
    </buttons>
  </Dialog>
</core:FragmentDefinition>
```

- Todo fragment de diálogo é um `<core:FragmentDefinition>` com um único `<Dialog>` — nunca mais de
  um control raiz.
- Título dinâmico (`add` vs. `edit`) resolvido por expression binding sobre o model de formulário
  (`manageResource>/action`), nunca duplicando o fragment inteiro por modo.
- Rodapé sempre no padrão **Ghost/neutro (Cancelar) à esquerda, Emphasized/primário (Salvar) à
  direita**; uma ação destrutiva (`type="Reject"`, ex.: "Excluir") entra no lado oposto ao botão
  primário, nunca ao lado dele.
- Campo de formulário sempre `<Label required="true">` imediatamente seguido do controle de input
  ligado ao model de formulário transiente — o `required` visual do `Label`/`Input` reflete a mesma
  regra checada depois via `utils.validateRequiredInObject` (ver [data-connection.md](data-connection.md)),
  nunca uma das duas sem a outra.
- Validação de formato (e-mail, moeda) plugada via `type:` na própria expressão de binding do
  `value`, apontando pro custom type registrado no controller (ver
  [formatters-and-types.md](formatters-and-types.md)):

```xml
<Input value="{path: 'manageResource>/form/email', type: '.customTypes.customEmailType'}" />
```

## IDs de controle: `id<PropositoPascalCase>`

```xml
<Table id="idTableResources" items="{main>/Resource}"> ... </Table>
<List id="idListResourceVersions"> ... </List>
```

Prefixo `id` + o propósito do controle em PascalCase — facilita achar rapidamente, a partir do
código do controller (`this.byId("idTableResources")`), qual controle o ID se refere sem precisar
abrir a view.

## Geração programática de UI a partir de metadados: `utils/factories.js`

Quando a tela precisa renderizar colunas/campos que variam conforme os dados (uma tabela cujo
número de colunas depende da configuração do tenant, um formulário de detalhe para uma entidade
com shape flexível), gerar os controles programaticamente em vez de escrever XML estático:

```js
createColumns: function (sTableId, oDataContext) {
  const oProps = oDataContext.getProperty();
  const oElement = this._makeElementForType(oProps);
  return new Column({ label: new Label({ text: oProps.label }), template: oElement });
},
generateFormElements: function (oContext) {
  const sKey = oContext.getPath().split("/").at(-1);
  const sLabel = this.formatter.formatToI18nValue.call(this, sKey);
  return new FormElement({
    visible: sLabel !== sKey, // esconde campo sem tradução cadastrada (chave técnica, não de UI)
    label: sLabel,
    fields: [new Text({ text: oContext.getProperty() })]
  });
}
```

- Toda função de factory é chamada com `.call(this, ...)`/`.bind(this)` a partir do controller —
  precisa do `this` do controller para acessar `this.formatter`, `this.handleX` (para plugar
  `press` nos controles gerados), exatamente pela mesma convenção de `formatter.js` (ver
  [formatters-and-types.md](formatters-and-types.md)).
- Campos cuja chave técnica não tem entrada correspondente em i18n (`formatToI18nValue` retornou a
  própria chave) ficam `visible: false` — nunca exibir uma label crua tipo `internal_flag_x` numa
  tela gerada dinamicamente; é sinal de campo técnico que não deveria aparecer, não de tradução
  faltante.

## i18n: taxonomia de prefixo por tipo de texto

| Prefixo | Uso |
|---|---|
| _(sem prefixo)_ | Substantivo/rótulo simples reaproveitado em várias telas (`name`, `description`, `edit`, `delete`) — inclusive usado dinamicamente via `formatToI18nValue(nome_do_campo)` |
| `btn_*` | Texto de botão (`btn_save`, `btn_cancel`) |
| `msg_*` | Corpo de `MessageBox` (`msg_generic_delete_component`) |
| `toast_*` | Texto de `MessageToast` (`toast_control_variable_detected`) |
| `title_*` | Título de diálogo/página (`title_add_resource`) |
| `label_*` | Rótulo de campo de formulário (`label_name`) |
| `ph_*` | Placeholder de input (`ph_input_name`) |
| `value_state_*` | Texto de estado de validação de input |

Seguir essa taxonomia ao adicionar qualquer chave nova — permite adivinhar o tipo de uso de uma
chave só pelo prefixo, sem abrir o arquivo `.properties` para confirmar. Chaves sem prefixo
(substantivos genéricos) só se justificam quando o texto é literalmente reaproveitável em qualquer
tela sem precisar de contexto adicional — na dúvida, prefixar.
