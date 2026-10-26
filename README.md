# SAP AI Skills and Agents - Últimas Atualização foi: 26/10/2026

## Objetivo

Reunir instruções para agentes de IA que apoiam a criação de soluções SAP. Atualmente, o repositório oferece um agente para prototipar interfaces SAP Fiori a partir de requisitos funcionais e validá-las com usuários antes do desenvolvimento definitivo.

## Ferramentas

1. **sap-fiori-prototype-builder** - Últimas Atualização foi: 26/10/2026

   Agente para criar protótipos navegáveis com aparência e padrões SAP Fiori. Suas instruções estão em [`sap-fiori-prototype-builder/AGENTS-SAP-FIORI-PROTOTYPE-BUILDER.md`](sap-fiori-prototype-builder/AGENTS-SAP-FIORI-PROTOTYPE-BUILDER.md).

## Como usar

1. Forneça ao agente de IA o arquivo de instruções da ferramenta acima como contexto e descreva o processo de negócio, os usuários, os dados, as regras e as telas desejadas.
2. Informe, quando o agente perguntar, se o protótipo deve priorizar **Mobile** ou **Desktop**. A escolha define o layout prioritário, mas o resultado deve continuar responsivo.
3. Peça a geração do protótipo e abra o `index.html` produzido no navegador para validar os fluxos. Por padrão, ele é um único arquivo com HTML, CSS e JavaScript, utilizável localmente sem instalação, servidor ou acesso à internet.

Exemplo de pedido: “Usando as instruções de `sap-fiori-prototype-builder`, crie um protótipo Fiori para consultar pedidos de compra, filtrar por fornecedor e visualizar os detalhes de cada pedido.”
