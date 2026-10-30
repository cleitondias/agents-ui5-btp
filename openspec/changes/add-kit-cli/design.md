## Context

O `new-project.sh` calcula a raiz do kit a partir do próprio caminho, o que não funciona pelo symlink
que o npm cria em `.bin`. O público é de projetos CAP, por isso o Node já está disponível.

## Decisions

- **Node sem dependências**: `node:util` chega para os argumentos e não há árvore de dependências
  para manter num kit cujo valor é o conteúdo.
- **O manifesto guarda o hash do kit, e não o do disco**: assim, um `AGENTS.md` com a base acrescentada
  e um ficheiro ignorado no `init` contam como alteração local, sem casos especiais no `update`.
- **Num conflito, o manifesto avança para a nova versão**: o aviso sai uma vez e o `.kit-new` fica
  visível no git; sem isso, cada `update` repetiria o mesmo conflito depois de resolvido.
- **`cap-app` fora do manifesto**: é um ponto de partida, sem relação com a versão seguinte do kit.
- **`init` exige a mesma versão do manifesto**: evita misturar versões do kit no mesmo projeto.
- **`update` recusa downgrade**: um `npx` com uma versão antiga em cache não pode reverter o projeto.
- **`gitignore` no pack**: o npm remove os `.gitignore` do tarball; a CLI repõe o nome. As regras que
  protegiam o `node_modules` do pack passam para um `.gitignore` na raiz.

## Risks / Trade-offs

- Sem o `.kit-new` reconciliado, um projeto fica sem a alteração do kit. Mitigação: o `update` lista-o.
- Ficheiros que saem do kit ficam no projeto: apagar por conta própria seria pior do que avisar.
