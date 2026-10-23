# Patterns — SAP CAP (Inetum)

> Padrões de arquitetura e código para projetos SAP CAP.
> Os exemplos usam entidades/nomes genéricos — não são referência a um projeto específico.

Leia os padrões desta pasta antes de tomar decisões estruturais — a maioria das perguntas de
"como devo organizar X" já tem resposta e justificativa aqui.

## Índice

| Arquivo | Conteúdo |
|---|---|
| [data-model.md](data-model.md) | Convenções do `db/schema.cds`: namespace, chaves, `managed`, Association vs. Composition, entidade hub de escopo compartilhado |
| [service-layer.md](service-layer.md) | Estrutura de `srv/services.cds`: services por perfil de acesso, projections, drafts, actions/functions |
| [business-objects.md](business-objects.md) | Camada de handlers (`srv/src/model/*BO.js`): `BaseBO`, herança, hooks `before/after/on`, escopo automático, anexos, integração externa via destination |
| [error-handling.md](error-handling.md) | Erros tipados com status HTTP (`HTTPHelpers.js`) e handler central de erro por service, incluindo `$batch` |
| [code-style.md](code-style.md) | Regras de clareza a nível de método: guard clauses, tabela de dispatch, evitar duplicação de query, um método por responsabilidade |

## Começar um projeto CAP

1. Modele o domínio em `db/schema.cds` seguindo [data-model.md](data-model.md)
   (namespace `<empresa>.<sigla>`, toda entidade estende `managed`, chaves `UUID` computadas,
   `snake_case`, Association vs. Composition).
2. Modele os services em `srv/services.cds` seguindo
   [service-layer.md](service-layer.md) — pense primeiro em "quantos perfis de
   acesso distintos este sistema tem" (tipicamente `admin` + `user`) antes de escrever a primeira
   entidade exposta.
3. Escreva a lógica de negócio em `srv/src/model/*BO.js` seguindo
   [business-objects.md](business-objects.md) — nunca lógica de negócio inline
   em `srv/services.js`, que deve ficar só como roteamento de eventos para os BOs. Se o projeto
   precisa de algum escopo de acesso automático (tenant, unidade organizacional), implemente-o
   como comportamento transversal no `BaseBO`, não espalhado pelos BOs individuais.

## Adicionar uma entidade nova

Ao estender um projeto existente com uma entidade nova (`<Entidade>`), siga esta ordem — não pule
etapa, e revise a etapa anterior antes de avançar:

1. **`db/schema.cds`** — adicione a entidade seguindo
   [data-model.md](data-model.md): `extend managed`, chave `UUID` computada,
   campos em `snake_case`, `Association`/`Composition` conforme a relação com entidades já
   existentes.
2. **`srv/services.cds`** — projete `<Entidade>` em cada service de perfil de acesso já existente
   (`admin`, `user`, ...), seguindo [service-layer.md](service-layer.md) — não
   crie um service novo só para essa entidade.
3. **`srv/src/model/<Entidade>BO.js`** — nova classe estendendo `BaseBO`, seguindo
   [business-objects.md](business-objects.md). Só sobrescreva os hooks
   (`beforeCreate`, `afterRead`, ...) que essa entidade realmente precisa.
4. **`srv/services.js`** — registre os handlers de `<Entidade>` chamando `<Entidade>BO`, um
   handler por evento, sem lógica inline, com o mesmo `try { } catch (error) { throw new
   Error(error); }` das entidades existentes.

Ao terminar, confira que nenhuma regra de negócio da entidade nova ficou em `services.js`
(deveria estar toda em `<Entidade>BO.js`) e que o comportamento transversal que já existe no
`BaseBO` (escopo, auditoria) não foi duplicado na classe nova.

## Visão geral da arquitetura de referência

```
projeto/
  db/
    schema.cds          # modelo de domínio (namespace <empresa>.<sigla>)
    data/                # CSVs de dados mestre
    undeploy.json        # artefactos HDI gerados que o deployer pode remover (views, índices, drafts…)
  srv/
    services.cds         # services OData por perfil de acesso (admin/user), projections
    services.js           # wiring de eventos CAP -> Business Objects (sem lógica própria)
    src/
      model/*BO.js         # 1 classe por entidade: BaseBO -> <Entidade>BO -> <Entidade>DraftBO
      objectStore.js       # wrapper único de acesso a Object Store externo (anexos)
  app/                   # apps Fiori Elements consumindo os services acima
  package.json            # perfis cds.requires.db/auth (development/hybrid/production)
```

### Decisões arquiteturais centrais (detalhes nos padrões desta pasta)

- **Um service por perfil de acesso** (não um service único "faz-tudo"), com as mesmas entidades
  projetadas de forma diferente (`@readonly` vs. editável) em cada um.
- **Camada de Business Object separada do wiring de eventos**: `services.js` só chama métodos de
  classes `*BO.js`; toda regra de negócio, cálculo e integração externa mora nelas.
- **Comportamento transversal (escopo de acesso, auditoria, normalização) centralizado no
  `BaseBO`**, herdado por toda entidade — nunca duplicado BO por BO.
- **Anexos/binários passam por Object Store externo**, nunca ficam persistidos como `LargeString`
  no banco além do trânsito do upload.

## Convenção de idioma

Comentários de código e documentação de arquitetura destes padrões ficam em **português**. Nomes
de entidades, campos, classes e métodos ficam em **inglês** (`Resource`, `beforeCreate`),
seguindo a convenção do próprio CAP/UI5.
