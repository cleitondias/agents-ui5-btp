# Service Layer — `srv/services.cds`

> Padrões de definição de services CAP. Ver [README.md](README.md) para o índice.

## Um service por perfil de acesso, não um service único

Modele **um service distinto por perfil de acesso** sobre o mesmo modelo de domínio, cada um com
o conjunto de entidades e permissões que aquele perfil precisa, em vez de um único service
"faz-tudo":

```cds
using {inetum.<sigla> as db} from '../db/schema';

@path    : 'api/admin'
@requires: 'authenticated-user'
service AdminService {
  @odata.draft.enabled
  entity Tenant as projection on db.Tenant;

  @readonly
  entity Resource as projection on db.Resource;
  // ...
}

@path    : 'api/user'
@requires: 'authenticated-user'
service UserService {
  @readonly
  entity Tenant as projection on db.Tenant;

  entity Resource as projection on db.Resource;
  // ...
}
```

**Por quê:** um service de administração/configuração tem um público e um ciclo de mudança
diferente do service operacional do dia a dia — separar os dois evita que uma regra de permissão
pensada para um perfil vaze para o outro. Autorização fina por scope fica em `xs-security.json`;
`@requires: 'authenticated-user'` é só o piso mínimo de autenticação.

Ao decidir se uma entidade precisa de service próprio ou de projection num service existente:
sempre projection dentro de um dos services por perfil — nunca criar um `service` novo por
entidade.

## `@readonly` vs. draft-enabled

- `@readonly`: entidade só é lida por aquele service (mesmo que outro service a exponha com
  escrita). Uma mesma entidade pode ser `@readonly` num service de consulta e editável (com
  draft) no service operacional.
- `@odata.draft.enabled`: habilita o ciclo de rascunho do Fiori Elements (edição com "Save"/
  "Cancel" em vez de PATCH direto). Usar em toda entidade que tem Object Page editável no Fiori
  Elements. Entidades somente de leitura, ou que só recebem `entity X = projection on ...` simples,
  não passam por esse ciclo — não adicionar `@odata.draft.enabled` "por padrão" em entidade que
  não tem tela de edição própria.

## Redirection target para variações de uma mesma entidade

Uma entidade pode ser reexposta com filtros/nome diferentes para o front-end (ex.: uma visão
"meus registros" vs. uma visão "todos os registros ativos"), sempre como `projection on` a mesma
entidade física:

```cds
@cds.redirection.target
entity MyResource       as projection on db.Resource;

entity ActiveResources as projection on db.Resource;
```

`@cds.redirection.target` marca qual dessas variações deve receber a navegação `$expand`/deep
link quando o CAP precisa escolher automaticamente entre projections concorrentes da mesma
entidade base.

## Custom queries com `select ... from ... join`

Quando o Fiori precisa de uma leitura "achatada" que não é uma simples projection (ex.: navegar de
uma tabela de associação até um atributo de outra entidade sem expor toda a entidade
intermediária):

```cds
entity ResourceAssignmentByOwner as
    select
        key a.resource.resource_id as resource_id,
        key a.owner.owner_id       as owner_id,
            b.owner_name           as owner_name
    from ResourceAssignment as a
    join Owner as b
        on a.owner.owner_id = b.owner_id;
```

Preferir isso a criar um endpoint REST customizado — mantém a entidade navegável/filtrável via
OData como qualquer outra.

## Actions e functions para lógica que não é CRUD

```cds
type fileRet {
  content   : LargeString;
  mediaType : String;
}

// Actions: alteram estado, sem retorno tipado obrigatório
action importFromExternalSystem();
action recalculateTotals(resource_id : UUID);

// Functions: leitura pura, sempre com "returns"
function readAttachment(attachment_id : UUID, filename : String) returns fileRet;
function readDocuments(resource_id : UUID)                        returns array of documents;
```

Regra: `action` para qualquer operação que grava/dispara efeito colateral (importar dados
externos, recalcular valores derivados); `function` para qualquer leitura que não é uma query
OData padrão (download de anexo, listagem calculada). Tipos de retorno customizados (`fileRet`,
`documents`) são declarados no topo do arquivo de service, não em `db/schema.cds` — eles são forma
de transporte da API, não modelo de domínio persistido.

## Integração com sistemas externos: tipos "espelho"

```cds
define type ExternalRecord {
    external_id   : String(50);
    display_name  : String(100);
    email         : String(100);
}
```

Ao integrar com um sistema externo, declarar um `type` que espelha o payload externo em vez de
reaproveitar a entidade de domínio interna — o mapeamento entre os dois formatos fica explícito na
camada de Business Object (ver [business-objects.md](business-objects.md)), e mudanças no
contrato externo não colidem com o schema interno.

## Comentários de intenção, não de código morto

Se uma alternativa foi tentada e descartada, remover o código — não deixar blocos comentados
"para o caso de precisar depois". Manter o `.cds` refletindo só a decisão atual.
