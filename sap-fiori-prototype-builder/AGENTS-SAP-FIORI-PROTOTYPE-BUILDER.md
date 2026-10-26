# Prototipação SAP Fiori para Consultoria Funcional

## Objetivo

Este workspace é usado para criar protótipos navegáveis de aplicações SAP Fiori a partir de requisitos funcionais.

O consultor funcional deve concentrar-se no processo de negócio, nos usuários, nos dados e nas regras funcionais. O agente é responsável por tomar as decisões de implementação, arquitetura visual, responsividade, acessibilidade e organização técnica descritas neste documento.

O resultado deve permitir validação rápida com usuários finais antes do desenvolvimento definitivo em SAPUI5.

## Plataforma prioritária

Antes de criar o protótipo, perguntar ao consultor: **"Este protótipo será feito primariamente para Mobile ou para Desktop?"** Não inferir a resposta a partir dos requisitos. A escolha define o layout prioritário, não limita os dispositivos em que o protótipo deve funcionar.

- **Mobile:** manter as diretrizes atuais de layout adaptável, com conteúdo e ações prioritários acessíveis em telas estreitas, filtros recolhidos em celular e tablet e tabelas largas convertidas em listas, cards ou resumos no celular.
- **Desktop:** usar a largura disponível de forma mais ampla, com estrutura próxima de um template Fiori convencional: shell e cabeçalho de página, Filter Bar, toolbar e conteúdo principal distribuídos na área de trabalho. Quando o conteúdo justificar, usar tabelas com colunas relevantes, formulários em múltiplas colunas e mestre-detalhe lado a lado; evitar restringir toda a aplicação a uma coluna estreita ou a uma moldura de celular. Manter espaçamento, legibilidade e responsividade em tablet e celular.

## Idioma

- Usar português do Brasil na interface, nas mensagens e nos dados de exemplo, salvo indicação contrária.
- Usar terminologia familiar aos usuários SAP e ao processo de negócio informado.
- Evitar termos técnicos de desenvolvimento na interface.
- Textos devem ser claros, objetivos e orientados à ação.

## Entrega obrigatória

Salvo solicitação diferente, entregar um único arquivo:

```text
index.html
```

Esse arquivo deve:

- abrir diretamente em navegadores modernos com duplo clique;
- funcionar por meio de `file://`, sem servidor web;
- conter HTML, CSS e JavaScript no próprio arquivo;
- não exigir instalação, compilação, terminal ou gerenciador de pacotes;
- não depender de internet, APIs, CDNs, fontes externas ou bibliotecas remotas;
- poder ser enviado por e-mail e executado localmente;
- permanecer funcional em desktop, tablet e celular.

Não criar projeto Node.js, `package.json`, servidor local, framework, etapa de build ou múltiplos arquivos, exceto quando isso for solicitado explicitamente.

## Decisões técnicas predefinidas

Para protótipos padrão, utilizar:

- HTML5 semântico;
- CSS nativo com variáveis CSS;
- JavaScript moderno e nativo, sem frameworks;
- dados mockados em objetos JSON no próprio `index.html`;
- componentes reutilizáveis implementados com funções JavaScript simples;
- estado mantido apenas em memória durante a sessão;
- persistência em `localStorage` somente quando o requisito funcional exigir;
- ícones feitos com CSS, caracteres Unicode adequados ou SVG inline simples;
- fontes do sistema como fallback visual, sem baixar a fonte SAP 72;
- layout baseado em Flexbox e CSS Grid;
- breakpoints definidos pelo conteúdo e pelo comportamento da tela, não por modelos específicos de dispositivo.

Priorizar código fácil de entender e alterar. O protótipo não precisa reproduzir a arquitetura técnica final do SAPUI5, mas deve reproduzir de forma convincente a experiência, os padrões de interação e a estrutura de informação esperados na aplicação futura.

## Princípios SAP Fiori

O protótipo deve seguir os princípios do SAP Fiori:

- **Role-based:** mostrar apenas informações e ações relevantes ao papel do usuário.
- **Adaptive:** adaptar conteúdo e navegação ao espaço disponível.
- **Simple:** reduzir complexidade visual e evitar ações ou campos desnecessários.
- **Coherent:** manter componentes, textos e comportamentos consistentes.
- **Delightful:** fornecer feedback imediato, estados claros e uma experiência agradável.

Quando houver mais de uma solução visual possível, preferir o padrão mais próximo de uma aplicação SAP Fiori padrão e que possa ser implementado posteriormente com componentes SAPUI5.

## Diretrizes visuais

### Aparência geral

- Simular o tema SAP Horizon.
- Usar superfícies claras, hierarquia visual discreta, espaçamento consistente e bordas suaves.
- Evitar efeitos que não sejam característicos de aplicações corporativas SAP, como gradientes decorativos, excesso de sombras, animações chamativas ou estilos de landing page.
- Usar cor principalmente para indicar estado, prioridade, seleção ou ação.
- Manter densidade adequada para uso corporativo sem comprometer a leitura.

### Tokens visuais sugeridos

Definir os valores como variáveis CSS no início do arquivo:

```css
:root {
  --sap-brand: #0070f2;
  --sap-brand-hover: #0057d2;
  --sap-shell: #ffffff;
  --sap-page-bg: #f5f6f7;
  --sap-surface: #ffffff;
  --sap-border: #d9d9d9;
  --sap-text: #1d2d3e;
  --sap-text-secondary: #556b82;
  --sap-positive: #188918;
  --sap-critical: #e76500;
  --sap-negative: #bb0000;
  --sap-information: #0070f2;
  --sap-radius: 0.5rem;
  --sap-shadow: 0 0.125rem 0.5rem rgb(0 0 0 / 8%);
}
```

Esses valores podem ser ajustados para melhorar contraste e coerência, mas a identidade visual deve permanecer próxima do SAP Fiori Horizon.

### Estrutura de página

Quando aplicável, organizar a aplicação nesta ordem:

1. Shell ou cabeçalho principal.
2. Título da página, contexto e ações principais.
3. Filtros ou busca.
4. Conteúdo principal.
5. Ações contextuais, mensagens e rodapé, quando necessários.

Usar padrões equivalentes aos controles SAPUI5/Fiori:

| Necessidade funcional | Padrão visual esperado |
|---|---|
| Visão geral de registros | List Report |
| Detalhes de um registro | Object Page |
| Indicadores e tarefas | Overview Page ou cards |
| Criação e edição | Formulário responsivo |
| Seleção de registros | Tabela ou lista com seleção |
| Busca e filtros | Filter Bar |
| Ações globais | Page Header ou Toolbar |
| Ações de um registro | Overflow ou menu contextual |
| Confirmação importante | Dialog |
| Feedback breve | Message Toast |
| Erro ou aviso persistente | Message Strip |
| Navegação entre níveis | Breadcrumbs, tabs ou navegação mestre-detalhe |

Não é necessário mencionar os nomes técnicos desses padrões ao usuário final.

### Filtros recolhíveis

Toda área de busca e filtros deve ser recolhível para não ocupar permanentemente uma parte excessiva da tela.

- Incluir no cabeçalho da Filter Bar uma ação visível para alternar entre **Mostrar filtros** e **Ocultar filtros**.
- Em celular e tablet, iniciar os campos de filtro recolhidos por padrão, mantendo visíveis o título da área, o botão de alternância e um resumo dos filtros aplicados, quando houver.
- Em desktop, a área pode iniciar expandida quando houver espaço suficiente; ainda assim, deve oferecer a opção de recolhimento.
- Ao aplicar filtros, permitir recolher automaticamente a área em telas estreitas para priorizar a visualização dos resultados.
- Manter busca simples ou filtros essenciais acessíveis sem exigir que toda a área avançada permaneça aberta, quando isso beneficiar o fluxo.
- Preservar os valores informados ao recolher e expandir a área.
- Indicar filtros ativos por meio de contador, chips ou resumo textual, por exemplo **Filtros (2)**.
- Implementar o controle como um botão acessível, com `aria-expanded`, `aria-controls`, foco visível e rótulo atualizado conforme o estado.
- Usar transição discreta e respeitar `prefers-reduced-motion`; não depender apenas de animação para comunicar o estado.

## Responsividade

Toda aplicação deve ser projetada primeiro para conteúdo adaptável, e não apenas reduzida visualmente.

A plataforma prioritária orienta a composição inicial: em Mobile, conservar o padrão atual voltado a telas estreitas; em Desktop, aproveitar a área horizontal disponível sem sacrificar os comportamentos responsivos abaixo.

### Comportamento mínimo

- Não permitir rolagem horizontal na página.
- Manter ações essenciais acessíveis em qualquer largura.
- Fazer campos e botões se ajustarem sem sobreposição.
- Converter layouts em múltiplas colunas para uma coluna em telas estreitas.
- Permitir que toolbars quebrem linha ou movam ações secundárias para um menu.
- Em celular, substituir tabelas largas por listas, cards ou visualização resumida.
- Preservar as informações prioritárias e ocultar apenas conteúdo secundário.
- Em telas estreitas, manter áreas de filtros extensas recolhidas por padrão para que os resultados apareçam mais cedo na área visível.
- Usar áreas clicáveis confortáveis para toque, preferencialmente com pelo menos `44px`.
- Manter diálogos dentro da área visível e permitir rolagem interna.
- Adaptar navegação mestre-detalhe: lado a lado em telas amplas e em páginas sucessivas no celular.

### Faixas de referência

Usar como ponto de partida:

```css
/* Celular: até 599px */
/* Tablet: 600px a 1023px */
/* Desktop: 1024px ou mais */
```

Os breakpoints podem ser ajustados quando o conteúdo exigir.

## Dados mockados

Todos os dados devem ser fictícios, mas plausíveis no contexto SAP.

### Organização

Manter os mocks em uma seção identificável do JavaScript:

```javascript
const mockData = {
  currentUser: {},
  records: [],
  valueHelps: {},
  messages: []
};
```

### Regras

- Simular formatos e conceitos comuns de SAP quando forem relevantes.
- Usar chaves estáveis e nomes de propriedades consistentes.
- Representar códigos e descrições separadamente quando ambos forem necessários.
- Usar datas em formato ISO no JSON, por exemplo `2026-10-21`, e formatá-las para exibição.
- Usar números como valores numéricos, nunca como strings formatadas.
- Armazenar moeda e unidade em propriedades próprias.
- Incluir variedade suficiente para demonstrar filtros, estados, listas vazias e mensagens.
- Nunca usar dados pessoais reais, credenciais, números fiscais reais ou informações confidenciais de clientes.

Exemplo:

```javascript
const mockData = {
  currentUser: {
    id: "FUNCIONAL01",
    name: "Mariana Costa",
    role: "Analista de Compras"
  },
  purchaseOrders: [
    {
      id: "4500012847",
      supplierId: "100045",
      supplierName: "Fornecedor Exemplo Ltda.",
      companyCode: "1000",
      documentDate: "2026-10-18",
      totalAmount: 12850.75,
      currency: "BRL",
      status: "PENDING_APPROVAL",
      statusText: "Pendente de aprovação"
    }
  ]
};
```

## Interações obrigatórias

O protótipo não deve ser apenas uma imagem estática. Sempre que fizer sentido para o fluxo, implementar:

- navegação entre lista e detalhe;
- busca e filtros;
- ordenação ou agrupamento relevante;
- seleção de item;
- abertura e fechamento de diálogos;
- criação, edição ou simulação de envio;
- validação de campos obrigatórios;
- mensagens de sucesso, aviso e erro;
- estados de carregamento simulados;
- estado sem dados;
- confirmação antes de ações destrutivas ou irreversíveis;
- retorno ou cancelamento sem perda acidental de contexto.

As ações devem atualizar a interface e os dados em memória de forma coerente. Não deixar botões sem comportamento, exceto quando estiverem claramente identificados como fora do escopo.

## Estados que devem ser considerados

Para cada área principal, avaliar e implementar os estados relevantes:

- carregando;
- com dados;
- sem dados;
- sem resultados para o filtro;
- erro;
- somente leitura;
- edição;
- sucesso após ação;
- aviso ou bloqueio por regra de negócio;
- falta de autorização, quando fizer parte do cenário.

Não simular sucesso quando uma validação falhar.

## Formulários e validações

- Indicar visualmente os campos obrigatórios.
- Exibir a mensagem próxima ao campo com erro.
- Preservar os valores já preenchidos quando houver erro.
- Desabilitar ações apenas quando o motivo for compreensível.
- Usar máscaras e formatação apenas na apresentação.
- Diferenciar edição, visualização e campos calculados.
- Usar seletores e ajudas de valor quando o usuário não deve memorizar códigos.
- Confirmar ações de exclusão, rejeição, cancelamento ou envio irreversível.

## Acessibilidade

O protótipo deve ser utilizável com teclado e tecnologias assistivas básicas.

- Usar elementos HTML semânticos antes de recorrer a `div`.
- Associar todo campo ao seu `label`.
- Manter ordem lógica de foco.
- Exibir foco visível.
- Permitir ativação por teclado de botões, links, abas e menus.
- Não comunicar estado apenas por cor; incluir texto ou ícone com descrição.
- Adicionar `aria-label`, `aria-expanded`, `aria-selected`, `aria-live` e outros atributos quando necessários.
- Usar contraste legível.
- Respeitar `prefers-reduced-motion`.
- Evitar animações desnecessárias.

## Qualidade e segurança

- Não inserir credenciais, tokens, endpoints internos ou dados produtivos.
- Não executar código remoto.
- Não usar `eval`, `document.write` ou HTML vindo diretamente de entrada do usuário.
- Escapar ou inserir textos dinâmicos com `textContent`.
- Evitar handlers inline como `onclick`; registrar eventos no JavaScript.
- Não usar recursos experimentais sem fallback.
- Manter o console do navegador sem erros.
- Tratar entradas inválidas e estados inesperados com mensagem clara.

## Arquitetura interna do arquivo

Organizar o `index.html` nesta sequência:

1. Metadados, título e viewport.
2. Estilos e tokens visuais.
3. Estrutura HTML principal.
4. Templates HTML, se necessários.
5. Dados mockados.
6. Estado da aplicação.
7. Funções de formatação e utilitários.
8. Funções de renderização.
9. Regras funcionais e eventos.
10. Inicialização.

Separar claramente dados, estado, renderização e regras de negócio, mesmo dentro de um único arquivo. Evitar variáveis globais dispersas e duplicação de HTML.

## O que o consultor funcional deve informar

Quando a solicitação estiver incompleta, pedir somente informações que afetem significativamente o fluxo ou a experiência. Priorizar:

1. Qual problema de negócio o protótipo deve resolver?
2. Quem são os perfis de usuário?
3. Qual é o fluxo principal, do início ao fim?
4. Quais dados precisam aparecer na lista e no detalhe?
5. Quais filtros e ações são necessários?
6. Quais campos são obrigatórios, editáveis ou calculados?
7. Quais regras determinam sucesso, erro, bloqueio ou aprovação?
8. Quais status existem e quais transições são permitidas?
9. Há exemplos de dados, telas atuais ou aplicações Fiori de referência?
10. O que está explicitamente fora do escopo?

Independentemente de outras lacunas, perguntar antes da implementação se o protótipo é primariamente para Mobile ou Desktop, conforme a seção **Plataforma prioritária**.

Não perguntar ao consultor sobre framework, organização de CSS, breakpoints, bibliotecas, arquitetura JavaScript ou outros detalhes já decididos neste documento.

Se faltarem informações secundárias, usar suposições razoáveis e registrá-las de forma breve no próprio protótipo, em uma seção de ajuda ou informações, sem interromper desnecessariamente o trabalho.

## Processo esperado do agente

Ao receber um requisito:

1. Interpretar o processo de negócio e identificar lacunas críticas.
2. Perguntar se o protótipo é primariamente para Mobile ou Desktop e esclarecer decisões funcionais relevantes em aberto.
3. Escolher o padrão Fiori mais adequado.
4. Definir a hierarquia da informação e o fluxo de navegação.
5. Criar dados fictícios representativos.
6. Implementar o protótipo completo em `index.html`.
7. Verificar comportamento em desktop, tablet e celular.
8. Verificar navegação por teclado, validações e estados alternativos.
9. Informar objetivamente o que foi implementado e quais suposições foram adotadas.

## Critérios de aceite

Antes de considerar o protótipo concluído, confirmar:

- [ ] Existe um `index.html` autossuficiente.
- [ ] O arquivo abre e funciona sem internet e sem servidor.
- [ ] Não existem dependências externas.
- [ ] A aparência é coerente com SAP Fiori Horizon.
- [ ] A plataforma prioritária (Mobile ou Desktop) foi confirmada com o consultor e orienta o layout.
- [ ] O fluxo principal pode ser demonstrado do início ao fim.
- [ ] Botões e controles relevantes funcionam.
- [ ] Os dados são fictícios e plausíveis no contexto SAP.
- [ ] Há feedback para ações, erros e validações.
- [ ] Há estados de carregamento, vazio e erro quando relevantes.
- [ ] O layout funciona em desktop, tablet e celular.
- [ ] A área de filtros pode ser mostrada e ocultada, inicia recolhida em telas estreitas e preserva os filtros aplicados.
- [ ] A página não possui rolagem horizontal indevida.
- [ ] O protótipo é navegável por teclado.
- [ ] O console do navegador não apresenta erros.
- [ ] Nenhum dado confidencial ou endpoint interno foi incluído.

## Limites do protótipo

O protótipo serve para validar requisitos, conteúdo, navegação e experiência do usuário. Ele não deve ser apresentado como aplicação produtiva.

Não implementar, salvo solicitação explícita:

- integração real com SAP;
- autenticação produtiva;
- chamadas OData ou APIs;
- persistência em banco de dados;
- autorização real;
- upload efetivo de documentos;
- geração fiscal, contábil ou financeira real;
- assinatura digital;
- lógica que possa alterar dados reais.

Quando uma dessas capacidades fizer parte do fluxo, simulá-la de forma segura e deixar claro na interface que se trata de uma demonstração.

## Prioridade em caso de conflito

Quando houver conflito entre requisitos, seguir esta ordem:

1. Regras funcionais explicitamente fornecidas pelo consultor.
2. Segurança, privacidade e acessibilidade.
3. Funcionamento offline em arquivo único.
4. Coerência com SAP Fiori e futura implementação em SAPUI5.
5. Responsividade e usabilidade.
6. Preferências estéticas.
