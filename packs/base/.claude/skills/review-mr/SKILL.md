---
name: review-mr
description: Code review de um Merge Request do GitLab a partir da sua URL — corre `scripts/oflow.sh review <url>`, que junta o MR, a change OpenSpec, os padrões de docs/patterns/ e o diff num pré-prompt, e segue esse pré-prompt. Usa quando o utilizador colar a URL de um MR (…/-/merge_requests/<n>) e pedir review, revisão ou análise do MR.
---

Gera o pré-prompt de review do MR e segue-o.

**Workflow:**

1. Se o utilizador não passou a URL do MR, pede-a.
2. Corre `scripts/oflow.sh review <url-do-MR>` na raiz do projeto.
3. Segue o pré-prompt impresso: ele traz o MR (título, descrição, branches, estado, pipeline), a
   change OpenSpec da branch, os padrões das camadas tocadas, o diff completo e as instruções do
   review, que terminam num veredito (Aprovado, Aprovado com ressalvas ou Bloqueado).

**Exemplo:**

```
scripts/oflow.sh review https://git.pt-ibl-inetum.group/<grupo>/<projeto>/-/merge_requests/42
```

**Notas:**

- Precisa do `glab` autenticado na instância do MR e de correr num clone do projeto do MR; se não,
  o comando falha com a causa — mostra-a ao utilizador e para.
- O comando lê o código com `git fetch` do ref do MR, sem checkout: a branch e o trabalho em curso
  de quem revê não mudam.
- Para ler um ficheiro inteiro do MR além do diff, usa `git show <commit>:<caminho>`, com o commit
  indicado no pré-prompt.

**Fora de escopo:**

- Não aprova, não faz merge, não comenta no MR e não altera código: só revê.
