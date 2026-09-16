# `ext/fragment/*.fragment.xml` + `.js` — UI customizada declarativa

> Ver [component-and-manifest.md](component-and-manifest.md) para onde o fragment é registrado no
> manifest, e [controller-extensions.md](controller-extensions.md) para quando usar
> `ControllerExtension` em vez do handler leve descrito aqui.

Todo fragment em `ext/fragment/` resolve um destes três casos: **seção customizada** da Object Page,
**coluna customizada** numa tabela de faceta, ou **controle isolado** (botão de upload/download)
dentro de uma seção existente. Em todos os casos o par é sempre `<Nome>.fragment.xml` +
`<Nome>.js`, nunca um fragment sem handler companion quando há interação.

## Handler companion (`core:require`)

O `.js` do fragment **não** é um `ControllerExtension` — é um objeto plano de handlers, injetado no
XML via `core:require`, com `this` resolvido para o controller da Object Page em runtime:

```xml
<Button core:require="{ handler: 'companyconfig/ext/fragment/Actions' }" press="handler.readAttachments" />
```

```js
sap.ui.define([
    "sap/m/MessageToast", "sap/m/MessageBox", "sap/ui/core/util/File"
], function (MessageToast, MessageBox, FileDownload) {
    'use strict';
    return {
        readAttachments: function (oEvent) {
            this.sAttachmentId = oEvent.getSource().getBindingContext().getProperty("attachment_id");
            // this.getModel(...) resolve porque `this` é o controller da Object Page
        }
    };
});
```

Dentro do handler, `this.getModel("i18n")`, `this.getModel("v2")`, `this._view`/`this.getView()`
funcionam normalmente — é o mesmo `this` que um controller extension teria via `this.base`, só que
sem o wrapper `ControllerExtension`.

## Seção customizada

Registrada em `content.body.sections` do target `ObjectPage` no manifest (ver
[component-and-manifest.md](component-and-manifest.md#sapui5routingtargetsobjectpageoptionssettingscontentbodysections)),
posicionada relativamente a uma seção existente ou a outra seção customizada via `anchor`:

```json
"sections": {
    "Documents": {
        "template": "myrentingcontract.ext.fragment.Documents",
        "position": { "placement": "After", "anchor": "MileageHistory" },
        "title": "Documents",
        "type": "XMLFragment"
    }
}
```

Conteúdo típico: tabela ligada a um `JSONModel` auxiliar populado por
[controller-extensions.md](controller-extensions.md), nunca ao model principal (o dado não pertence
ao `entitySet` anotado):

```xml
<core:FragmentDefinition xmlns:core="sap.ui.core" xmlns="sap.m">
    <Table core:require="{ handler: 'myrentingcontract/ext/fragment/Documents' }"
        id="idDocumentTable" items="{documents>/results}" growing="true" growingThreshold="10"
        updateFinished="handler.updateFinished">
        <columns>
            <Column><Text text="{i18n>document_title}" /></Column>
        </columns>
        <items>
            <ColumnListItem>
                <cells>
                    <Text text="{documents>title}" />
                    <Button core:require="{ handler: 'myrentingcontract/ext/fragment/Documents' }"
                        icon="sap-icon://download" press="handler.readAttachment" />
                </cells>
            </ColumnListItem>
        </items>
    </Table>
</core:FragmentDefinition>
```

Prefixo de binding (`documents>`) sempre igual ao nome do `JSONModel` registrado no manifest — nunca
o binding default (sem prefixo), que apontaria para o model principal.

## Coluna customizada

Registrada em `controlConfiguration.<caminho>/@com.sap.vocabularies.UI.v1.LineItem#<qualifier>.columns`
do target `ObjectPage`, para injetar uma coluna (tipicamente de ação) numa tabela de faceta gerada
por `UI.LineItem` qualificado (ver [annotations.md](annotations.md#faceta-de-tabela-composição-1n)):

```json
"controlConfiguration": {
    "company_config_documents/@com.sap.vocabularies.UI.v1.LineItem#DefaultDocuments": {
        "columns": {
            "Actions": {
                "header": "{i18n>actions}",
                "position": { "anchor": "DataField::public", "placement": "Before" },
                "template": "companyconfig.ext.fragment.Actions",
                "width": "10%"
            }
        }
    }
}
```

O fragment referenciado por `template` contém só os controles da célula (sem `<Table>`/`<Column>`
em volta — a tabela e a coluna já são geradas pelo template):

```xml
<core:FragmentDefinition xmlns:core="sap.ui.core" xmlns="sap.m" xmlns:u="sap.ui.unified">
    <HBox>
        <u:FileUploader core:require="{ handler: 'companyconfig/ext/fragment/Actions' }"
            enabled="{= ${ui>/editMode} === 'Editable'}" buttonOnly="true"
            icon="sap-icon://attachment" iconOnly="true" name="myFileUpload"
            change="handler.handleUploadComplete" />
        <Button core:require="{ handler: 'companyconfig/ext/fragment/Actions' }"
            icon="sap-icon://download" press="handler.readAttachments" />
    </HBox>
</core:FragmentDefinition>
```

## Upload/download binário

Sempre via `callFunction` no model `v2` (o `v4` do `sap.fe` não expõe upload de conteúdo binário
arbitrário de forma direta). Upload lê o arquivo como base64 e grava direto no binding context da
linha (o valor é persistido no próximo save do Object Page, não imediatamente):

```js
handleUploadComplete: function (oEvent) {
    var file = oEvent.getParameter("files")[0];
    var reader = new FileReader();
    reader.onload = function (e) {
        var mediaType = e.target.result.split(";");
        oEvent.getSource().getBindingContext().setProperty("filename", oEvent.getParameter("newValue"));
        oEvent.getSource().getBindingContext().setProperty("file", e.target.result.split(",")[1]);
        oEvent.getSource().getBindingContext().setProperty("filetype", mediaType[0].split(":")[1]);
    }.bind(this);
    reader.readAsDataURL(file);
}
```

Download decodifica o base64 recebido e usa `sap/ui/core/util/File` para salvar — sempre com
`MessageToast` de "obtendo arquivo"/"download em progresso" antes da chamada assíncrona, e
`MessageBox.error` no `error` do `callFunction`:

```js
readAttachments: function (oEvent) {
    let gettingFileMessage = this.getModel("i18n").getResourceBundle().getText("gettingFile");
    MessageToast.show(gettingFileMessage);
    this.getModel("v2").callFunction("/readAttachments", {
        method: "GET",
        urlParameters: { attachment_id: this.sAttachmentId, filename: this.sFileName },
        success: function (oData) {
            var base64 = atob(oData.readAttachments.content);
            // ... monta Blob e chama FileDownload.save(...)
        }.bind(this),
        error: function () { MessageBox.error("Error reading file"); }.bind(this)
    });
}
```

## Quando não criar um fragment

Se o controle cabe inteiramente numa anotação (`UI.DataFieldForAction`, `UI.DataFieldWithUrl`,
campo simples com `Common.FieldControl`), não crie fragment — anote (ver
[annotations.md](annotations.md)). Fragment é só para o que a anotação não expressa: leitura de
dado fora do `entitySet`, upload/download binário, controle de terceiros (carrossel, mapa).
