# AGENTS.md — CAP Template (Inetum)

Este diretório é um **projeto template** de SAP CAP (Cloud Application Programming Model),
pensado como ponto de partida para novos projetos Inetum. Ele nasce como o `cds init` padrão (ver
`readme.md`), mas carrega também um conjunto de **padrões de código** consolidados em
[`patterns/`](patterns/) — convenções de modelagem, definição de services e organização da
lógica de negócio a seguir em qualquer projeto novo baseado neste template.

**Leia `patterns/` antes de tomar decisões estruturais em um novo projeto** — a maioria das
perguntas de "como devo organizar X" já tem resposta e justificativa lá.

## Como usar este template

Ao começar um projeto novo a partir daqui:

1. Leia [patterns/README.md](patterns/README.md) — é o índice de todos os padrões.
2. Modele o domínio em `db/schema.cds` seguindo [patterns/data-model.md](patterns/data-model.md)
   (namespace `<empresa>.<sigla>`, toda entidade estende `managed`, chaves `UUID` computadas,
   `snake_case`, Association vs. Composition).
3. Modele os services em `srv/services.cds` seguindo
   [patterns/service-layer.md](patterns/service-layer.md) — pense primeiro em "quantos perfis de
   acesso distintos este sistema tem" (tipicamente `admin` + `user`) antes de escrever a primeira
   entidade exposta.
4. Escreva a lógica de negócio em `srv/src/model/*BO.js` seguindo
   [patterns/business-objects.md](patterns/business-objects.md) — nunca lógica de negócio inline
   em `srv/services.js`, que deve ficar só como roteamento de eventos para os BOs. Se o projeto
   precisa de algum escopo de acesso automático (tenant, unidade organizacional), implemente-o
   como comportamento transversal no `BaseBO`, não espalhado pelos BOs individuais.

## Visão geral da arquitetura de referência

```
projeto/
  db/
    schema.cds          # modelo de domínio (namespace <empresa>.<sigla>)
    data/                # CSVs de dados mestre
  srv/
    services.cds         # services OData por perfil de acesso (admin/user), projections
    services.js           # wiring de eventos CAP -> Business Objects (sem lógica própria)
    src/
      model/*BO.js         # 1 classe por entidade: BaseBO -> <Entidade>BO -> <Entidade>DraftBO
      objectStore.js       # wrapper único de acesso a Object Store externo (anexos)
  app/                   # apps Fiori Elements consumindo os services acima
  package.json            # perfis cds.requires.db/auth (development/hybrid/production)
```

### Decisões arquiteturais centrais (detalhes em `patterns/`)

- **Um service por perfil de acesso** (não um service único "faz-tudo"), com as mesmas entidades
  projetadas de forma diferente (`@readonly` vs. editável) em cada um.
- **Camada de Business Object separada do wiring de eventos**: `services.js` só chama métodos de
  classes `*BO.js`; toda regra de negócio, cálculo e integração externa mora nelas.
- **Comportamento transversal (escopo de acesso, auditoria, normalização) centralizado no
  `BaseBO`**, herdado por toda entidade — nunca duplicado BO por BO.
- **Anexos/binários passam por Object Store externo**, nunca ficam persistidos como `LargeString`
  no banco além do trânsito do upload.

## Convenção de idioma

Comentários de código e documentação de arquitetura deste template ficam em **português**. Nomes
de entidades, campos, classes e métodos ficam em **inglês** (`Resource`, `beforeCreate`),
seguindo a convenção do próprio CAP/UI5.
