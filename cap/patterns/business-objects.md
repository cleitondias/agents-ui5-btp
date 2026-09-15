# Business Objects — `srv/src/model/*BO.js`

> Padrão de organização da camada de lógica de negócio dos services CAP. Ver [README.md](README.md) para o índice.

## Por quê essa camada existe

`srv/services.js` (o `.on()`/`.before()`/`.after()` que o `@sap/cds` espera) fica **só com o
roteamento de eventos**. Toda a lógica de negócio mora em uma classe `*BO` (Business Object) por
entidade, em `srv/src/model/`. Isso mantém o arquivo de wiring legível como um índice de "o que
dispara o quê", e torna cada regra de negócio testável isoladamente e reutilizável entre a
entidade normal e a sua variante de draft.

```js
// srv/services.js
const ResourceBO = require("./src/model/ResourceBO");

class UserService extends cds.ApplicationService {
  async init() {
    this.before("READ", "Resource", async (req) => {
      try {
        await new ResourceBO().beforeRead(this, req);
      } catch (error) {
        throw new Error(error);
      }
    });
    // ...
    return super.init();
  }
}

module.exports = UserService;
```

Convenções fixas nesse arquivo:
- Um `require` por BO, nomeado exatamente `<Entidade>BO`.
- Todo handler é `async` e chama **um único método** do BO correspondente — nenhuma lógica inline.
- Todo handler embrulha a chamada em `try { } catch (error) { throw new Error(error); }`. Isso
  garante que qualquer exceção (inclusive `req.error(...)` deixado sem `return`) vira uma falha
  visível ao cliente OData em vez de travar o request silenciosamente.
- Comentário de bloco documentando entidade/descrição acima de handlers não triviais, em
  português, quando o nome do evento não é autoexplicativo.

## `BaseBO`: raiz comum de toda entidade

```js
// srv/src/model/BaseBO.js
module.exports = class BaseBO {
  async beforeRead(pThis, req) {}
  async afterRead(pThis, req) {}
  async beforeCreate(pThis, req) {}
  async beforeUpdate(pThis, req) {}
  async afterNew(pThis, req) {}
  async afterUpdate(pThis, req) {}

  async getCurrentUserId(req) { return req.user.id; }
  async getDraftData(pEntity, req) { /* SELECT.one.from(pEntity.drafts).where({...}) */ }
  async getFileStore(req) { /* download via Object Store, ver adiante */ }
};
```

Toda `*BO` estende `BaseBO` e, em cada método sobrescrito, **chama `super.<metodo>()` primeiro**
antes de acrescentar a lógica própria:

```js
// srv/src/model/ResourceBO.js
const BaseBO = require("./BaseBO");

module.exports = class ResourceBO extends BaseBO {
  async beforeRead(pThis, req) {
    await super.beforeRead(pThis, req);
  }
  async beforeCreate(pThis, req) {
    await super.beforeCreate(pThis, req);
    await this.applyDefaults(pThis, req);
  }
};
```

**Por quê:** qualquer comportamento transversal que precise rodar em **toda** leitura/criação do
sistema (auditoria, escopo de acesso, normalização de payload) vai no `BaseBO` — nunca duplicado
entidade por entidade. Disciplinar "sempre chame `super` primeiro" é o que garante que uma
entidade nova não escape desse comportamento por esquecimento.

### Exemplo de comportamento transversal: escopo automático de acesso

Um caso de uso comum do `BaseBO` é resolver, a partir do usuário autenticado, um identificador de
escopo (tenant, unidade organizacional, projeto) e aplicá-lo automaticamente em toda query e
criação — sem exigir que cada BO de entidade reimplemente esse filtro:

```js
// BaseBO.js
async getScopeIdForCurrentUser(req, AppUser) {
  const userId = await this.getCurrentUserId(req);
  const appUser = await SELECT.one.from(AppUser).where({ user_id: userId });
  return appUser?.scope_id;
}

async beforeRead(pThis, req) {
  const { AppUser } = pThis.entities;
  const scope_id = await this.getScopeIdForCurrentUser(req, AppUser);
  if (!scope_id) return;

  req.query.SELECT.where = req.query.SELECT.where || [];
  if (req.query.SELECT.where.length > 0) req.query.SELECT.where.push("and");
  req.query.SELECT.where.push({ ref: ["scope_id"] }, "=", { val: scope_id });
}

async beforeCreate(pThis, req) {
  const { AppUser } = pThis.entities;
  req.data.scope_id = await this.getScopeIdForCurrentUser(req, AppUser);
}
```

Manipula a árvore de query CQN diretamente (`req.query.SELECT.where`), preservando qualquer
filtro que o Fiori Elements já tenha adicionado (por isso concatena com `"and"` em vez de
substituir o `where`). Em criação, o valor de escopo nunca vem do payload do cliente — é sempre
resolvido no servidor a partir do usuário autenticado, o que fecha a porta para um cliente forjar
o campo.

## Assinatura fixa: `(pThis, req)`

Todo método de BO recebe `pThis` (a instância do service, para acessar `pThis.entities`) e `req`
(o request do CAP). Manter essa assinatura — mesmo quando um método não usa `pThis` — para que
qualquer BO seja chamável da mesma forma a partir de `services.js` e de outro BO.

## Herança entre BOs para reaproveitar regra de negócio na entidade + no draft

```js
// srv/src/model/ResourceDraftBO.js
const ResourceBO = require("./ResourceBO");

module.exports = class ResourceDraftBO extends ResourceBO {
  async afterNew(pThis, req) {
    await super.afterNew(pThis, req);
    await this.applyDraftDefaults(pThis, req);
  }
  async afterUpdate(pThis, req) {
    await this.recalculateDerivedFields(pThis, req);
  }
};
```

Padrão: para cada entidade com draft habilitado, existe `<Entidade>BO` (regra "ativa") e
`<Entidade>DraftBO extends <Entidade>BO` (regra do rascunho), e o `services.js` liga os eventos
`*.drafts` (`"CREATE", "Resource.drafts"`, `"NEW", "Resource.drafts"`, `"CANCEL",
"Resource.drafts"`) ao Draft BO. Isso evita duplicar a lógica de negócio pura (cálculos,
validações) entre a versão salva e a versão em edição.

## Cálculos de negócio: métodos puros e nomeados por fórmula

```js
async calculateNetAmount(p_price, p_discount) {
  let lv_price = p_price ? p_price : 0;
  let lv_discount = p_discount ? p_discount : 0;
  return lv_price - lv_discount;
}

async calculateTotalAmount(p_net_amount, p_tax_amount) {
  let lv_net_amount = p_net_amount ? p_net_amount : 0;
  let lv_tax_amount = p_tax_amount ? p_tax_amount : 0;
  return lv_net_amount + lv_tax_amount;
}
```

- Um método por fórmula de negócio, nomeado com o mesmo sufixo do campo que ele calcula
  (`net_amount` → `calculateNetAmount`). Facilita rastrear "de onde vem esse número" direto pelo
  nome do campo no schema.
- Parâmetros prefixados `p_` (parâmetro) e variáveis locais `lv_` (local variable) — convenção
  mantida para os métodos de cálculo puro. Todo parâmetro numérico tem fallback
  `p_x ? p_x : 0` porque campos `Decimal` opcionais chegam como `null`/`undefined` do banco.
- O método "orquestrador" busca os dados necessários, chama os cálculos elementares em sequência e
  persiste o resultado com `UPSERT(...).into(Entity.drafts)` — nunca grava campo a campo.

## Query direta com `SELECT`/`UPSERT` globais do `@sap/cds`

```js
const selectedAppUser = await SELECT.one
  .from(AppUser)
  .where({ user_id: userId });

if (draft_data) await UPSERT(draft_data).into(Resource.drafts);
```

`SELECT`, `UPSERT`, `INSERT`, `DELETE` são globais injetados pelo runtime do `@sap/cds` — não
importar/instanciar nada para usá-los dentro de um BO. Sempre obter a referência da entidade via
`pThis.entities` (`const { Resource } = pThis.entities;`) em vez de importar o CDS compilado
diretamente.

## Anexos/upload: limpar o campo binário depois de subir pro Object Store

```js
// srv/src/model/ResourceImageBO.js
async saveImages(pThis, req) {
  const objectStore = new ObjectStore();
  const { images } = req.data;
  for (const image of images ?? []) {
    if (image.file && !image.uploaded) {
      await objectStore.uploadFile(image.image_id, image.file);
      image.file = null;   // não persistir o binário no banco
      image.uploaded = true;
    }
  }
}

async getImagesFromObjectStore(pThis, req) {
  // no afterRead, hidrata req[i].images[j].file sob demanda a partir do Object Store
}
```

Padrão: o campo `file` (`LargeString`) nunca fica persistido no banco além do necessário para o
upload em si — `beforeUpdate` sobe o arquivo para o Object Store e zera o campo; `afterRead` faz o
caminho inverso, baixando o binário sob demanda usando o UUID do próprio registro como chave do
objeto. Isso vale para qualquer entidade de anexo — sempre a mesma dupla de métodos `save<X>` /
`get<X>FromObjectStore`.

## `ObjectStore`: wrapper único do S3/AWS SDK

```js
// srv/src/objectStore.js
class ObjectStore {
  constructor() {
    const key = JSON.parse(process.env.OBJECT_STORE_KEY ?? "{}");
    // configura AWS.S3 com as credenciais do binding do serviço BTP
  }
  async uploadFile(fileId, fileContent) { /* s3.upload */ }
  async downloadFile(fileId) { /* s3.getObject */ }
  async deleteFile(fileId) { /* s3.deleteObject */ }
}
module.exports = ObjectStore;
```

Nunca instanciar o `AWS.S3` diretamente em um BO — sempre via `new ObjectStore()`. Credenciais
vêm de `process.env.OBJECT_STORE_KEY` (binding de serviço do Cloud Foundry), nunca hardcoded.

## Internacionalização de mensagens de erro: `@sap/textbundle`

```js
const textbundle = require("@sap/textbundle");
const bundle = new textbundle.TextBundle({ path: "../../../_i18n/i18n" });
// ...
req.error(409, bundle.getText("errorUserId"));
```

Toda mensagem de erro voltada ao usuário passa por `bundle.getText(<chave>)`, nunca string
literal — as chaves vivem em `_i18n/i18n*.properties` na raiz do projeto (compartilhado entre
back-end e apps).

## Integração com sistema externo isolada num BO dedicado

Chamadas a serviços externos ficam encapsuladas em um BO próprio (ex.: `ExternalSystemBO`),
chamado a partir de uma `action` — nunca dentro do BO da entidade de domínio. Isso mantém a lógica
de mapeamento externo→interno (ver o tipo "espelho" em [service-layer.md](service-layer.md))
isolada e substituível sem tocar no BO principal.
