#!/usr/bin/env bash
# oflow — fluxo "1 tarefa = 1 change OpenSpec = 1 branch = 1 MR".
#
#   scripts/oflow.sh start <nome-da-change>   no fim do propose: cria a branch change/<nome> a partir
#                                             da main atualizada e commita a proposta (idempotente)
#   scripts/oflow.sh check                    portão de qualidade: `npm run lint` e `npm test` do
#                                             projeto (corrido também pelo publish e pelo ship)
#   scripts/oflow.sh validate                 no fim do apply: checks (lint, testes, tasks) e pré-prompt
#                                             de auto-revisão da change antes do MR
#   scripts/oflow.sh publish                  depois do archive: check, commit, push e abertura do MR
#   scripts/oflow.sh ship                     sem agente: check, valida, arquiva (CLI) e corre o publish
#   scripts/oflow.sh review <url-do-MR>       pré-prompt de code review de um MR (MR, change, padrões
#                                             e diff), sem checkout; precisa do glab
#
# Independente de ferramenta de IA: pode ser corrido à mão ou por qualquer agente. Os pré-prompts
# vêm dos templates em scripts/prompts/ e saem no stdout; num terminal, vão também para o
# clipboard (o do review fica ainda em .git/oflow/).
# O MR é aberto com `glab` se estiver instalado; senão via push options do GitLab.
# Variáveis opcionais: OFLOW_BASE_BRANCH, OFLOW_REMOTE, OFLOW_MR_VIA (auto|glab|push),
# OFLOW_REVIEWERS (só glab, ex.: joao,maria), OFLOW_SKIP_CHECK=1 (salta o check; só em emergência).

set -euo pipefail

BASE_BRANCH="${OFLOW_BASE_BRANCH:-main}"
REMOTE="${OFLOW_REMOTE:-origin}"
REVIEWERS="${OFLOW_REVIEWERS:-}"
MR_VIA="${OFLOW_MR_VIA:-auto}"   # auto | glab | push
PREFIX="change/"

die() { echo "oflow: $*" >&2; exit 1; }

current_change() {
  local branch
  branch="$(git rev-parse --abbrev-ref HEAD)"
  [[ "$branch" == "$PREFIX"* ]] || die "branch atual '$branch' não é uma branch ${PREFIX}<nome>."
  echo "${branch#"$PREFIX"}"
}

archived_dir() {
  ls -d openspec/changes/archive/*-"$1" 2>/dev/null | tail -1 || true
}

# Primeira linha não vazia da secção "## Why" do proposal, para a descrição curta do MR.
proposal_summary() {
  awk '/^## /{in_why = ($0 ~ /^## Why/); next} in_why && NF {print; exit}' "$1"
}

# Portão de qualidade antes de publicar: corre os scripts `lint` e `test` do package.json da raiz,
# quando existirem. Um projeto sem esses scripts passa com aviso — o objetivo é que cada pack os
# traga (o cap-app traz eslint + cds test/cds-test) e que o agente não dê a change por pronta sem os
# correr. Falha ao primeiro script que falhar.
cmd_check() {
  if [[ "${OFLOW_SKIP_CHECK:-}" == 1 ]]; then
    echo "oflow: check saltado (OFLOW_SKIP_CHECK=1)." >&2
    return 0
  fi
  if [[ ! -f package.json ]]; then
    echo "oflow: sem package.json na raiz — nenhum check automático a correr." >&2
    return 0
  fi

  local script ran=0
  for script in lint test; do
    if node -e 'process.exit(require("./package.json").scripts?.[process.argv[1]] ? 0 : 1)' "$script"; then
      echo "oflow: a correr npm run ${script}..."
      npm run --silent "$script" || die "npm run ${script} falhou — corrige antes de continuar."
      ran=1
    else
      echo "oflow: package.json sem script '${script}' — saltado." >&2
    fi
  done
  (( ran )) && echo "oflow: check concluído sem erros." || echo "oflow: nenhum script lint/test configurado." >&2
  return 0
}

cmd_start() {
  local name="${1:-}"
  [[ -n "$name" ]] || die "uso: oflow.sh start <nome-da-change>"
  [[ "$name" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]] || die "o nome deve ser kebab-case (ex.: add-sales-order-approval)."

  local branch="${PREFIX}${name}" message="docs(openspec): propose ${name}"
  if [[ "$(git rev-parse --abbrev-ref HEAD)" == "$branch" ]]; then
    # Corrido de novo (ex.: proposta revista ou apply): só commita o que mudou na proposta.
    message="docs(openspec): update proposal ${name}"
  elif git show-ref --verify --quiet "refs/heads/${branch}"; then
    git switch "$branch"
    message="docs(openspec): update proposal ${name}"
  else
    # A proposta é escrita antes da branch existir: só se aceitam alterações dentro dela.
    local dirty
    dirty="$(git status --porcelain --untracked-files=all | awk '{print $NF}' | grep -v "^openspec/changes/${name}/" || true)"
    [[ -z "$dirty" ]] || die "há alterações fora de openspec/changes/${name}/ — faz commit ou stash antes:"$'\n'"$dirty"

    git fetch --quiet "$REMOTE" "$BASE_BRANCH"
    # --no-track: sem isto um `git push` simples iria para a main.
    git switch --no-track -c "$branch" "${REMOTE}/${BASE_BRANCH}"
  fi

  if [[ -n "$(git status --porcelain --untracked-files=all "openspec/changes/${name}" 2>/dev/null)" ]]; then
    git add "openspec/changes/${name}"
    git commit --quiet -m "$message"
    echo "Proposta openspec/changes/${name}/ commitada na branch ${branch}."
  elif [[ -d "openspec/changes/${name}" ]]; then
    echo "Branch ${branch} ativa; a proposta não tem alterações por commitar."
  else
    echo "Branch ${branch} criada. Próximo passo: criar a proposta em openspec/changes/${name}/."
  fi
}

cmd_publish() {
  local name archived proposal summary
  name="$(current_change)"
  archived="$(archived_dir "$name")"
  [[ -n "$archived" ]] || die "a change '${name}' ainda não foi arquivada — corre o archive primeiro."
  proposal="${archived}/proposal.md"

  # O archive (skill ou CLI) só mexe em openspec/; qualquer outra alteração tem de ser commitada à parte.
  local stray
  stray="$(git status --porcelain --untracked-files=all | awk '{print $NF}' | grep -v '^openspec/' || true)"
  [[ -z "$stray" ]] || die "há alterações por commitar fora de openspec/:"$'\n'"$stray"

  cmd_check

  if [[ -n "$(git status --porcelain openspec)" ]]; then
    git add openspec
    git commit --quiet -m "chore(openspec): archive ${name}"
  fi

  summary="$(proposal_summary "$proposal")"
  [[ -n "$summary" ]] || summary="Change OpenSpec ${name}"
  local title="feat: ${name}"

  if [[ "$MR_VIA" == glab || ( "$MR_VIA" == auto && -n "$(command -v glab)" ) ]]; then
    git push --quiet -u "$REMOTE" "${PREFIX}${name}"
    local args=(--source-branch "${PREFIX}${name}" --target-branch "$BASE_BRANCH"
                --title "$title" --description "$(cat "$proposal")"
                --label openspec --remove-source-branch --yes)
    [[ -n "$REVIEWERS" ]] && args+=(--reviewer "$REVIEWERS")
    glab mr create "${args[@]}"
  else
    # Push options não aceitam quebras de linha: a descrição vai numa linha e aponta para a proposta.
    git push -u "$REMOTE" "${PREFIX}${name}" \
      -o merge_request.create \
      -o merge_request.target="$BASE_BRANCH" \
      -o merge_request.title="$title" \
      -o merge_request.description="${summary} — Proposta, design e tasks: ${archived}/" \
      -o merge_request.label=openspec \
      -o merge_request.remove_source_branch
  fi
}

cmd_ship() {
  local name change_dir
  name="$(current_change)"
  change_dir="openspec/changes/${name}"
  [[ -z "$(git status --porcelain)" ]] || die "há alterações por commitar — faz commit antes de continuar."
  [[ -d "$change_dir" ]] || die "não existe ${change_dir} — a change já foi arquivada ou tem outro nome."

  if grep -q -- '- \[ \]' "${change_dir}/tasks.md" 2>/dev/null; then
    grep -n -- '- \[ \]' "${change_dir}/tasks.md" >&2
    die "há tasks por concluir em ${change_dir}/tasks.md."
  fi

  cmd_check
  openspec validate "$name" --strict --no-interactive
  openspec archive "$name" --yes
  cmd_publish   # volta a correr o check, por segurança: é rápido e o archive não muda código
}

# --- Pré-prompts (validate e review) ---------------------------------------------------------------
# O comando recolhe o contexto e imprime as instruções; quem revê é o agente que o corre (ou a
# pessoa, a partir do clipboard).

# Conteúdo de um ficheiro num commit, ou na working tree com ".".
show_at() {
  if [[ "$1" == . ]]; then cat "$2"; else git show "$1:$2"; fi
}

# Ficheiros de uma pasta (recursivo) num commit, ou na working tree com ".".
ls_at() {
  if [[ "$1" == . ]]; then find "$2" -type f 2>/dev/null | sort; else git ls-tree -r --name-only "$1" -- "$2"; fi
}

# Pasta da change <nome>, ativa ou arquivada, em <ref|.>; vazio se não existir.
change_dir_at() {
  ls_at "$1" openspec/changes \
    | grep -E "^openspec/changes/(archive/[0-9]{4}-[0-9]{2}-[0-9]{2}-)?${2}/proposal\.md$" \
    | tail -1 | sed 's#/proposal\.md$##' || true
}

# Proposta, specs, design e tasks da change, para o pré-prompt.
change_section() {
  local ref="$1" name="$2" dir file
  dir="$(change_dir_at "$ref" "$name")"
  if [[ -z "$dir" ]]; then
    printf '## Change OpenSpec\n\n(não há change %s neste ramo)\n' "$name"
    return 0
  fi
  printf '## Change OpenSpec (%s/)\n' "$dir"
  for file in "$dir/proposal.md" $(ls_at "$ref" "$dir/specs" | grep '\.md$' || true) "$dir/design.md" "$dir/tasks.md"; do
    show_at "$ref" "$file" >/dev/null 2>&1 || continue
    printf '\n### %s\n\n%s\n' "${file#"$dir"/}" "$(show_at "$ref" "$file")"
  done
}

# README.md de cada pasta de docs/patterns/ das camadas tocadas (ficheiros no stdin).
patterns_section() {
  local ref="$1" files dirs="" dir readme body=""
  files="$(cat)"
  grep -qE '^(db|srv|test)/' <<<"$files" && dirs+=" cap"
  grep -qE '(^|/)(app|webapp)/|annotations\.cds$' <<<"$files" && dirs+=" fiori-elements fiori-freestyle"
  for dir in $dirs; do
    readme="docs/patterns/${dir}/README.md"
    show_at "$ref" "$readme" >/dev/null 2>&1 || continue
    body+=$'\n'"### ${readme}"$'\n\n'"$(show_at "$ref" "$readme")"$'\n'
  done
  if [[ -n "$body" ]]; then
    printf '## Padrões de código\n\nOs ficheiros de padrões citados abaixo estão na mesma pasta de cada README.md; abre os que a mudança tocar.\n%s' "$body"
  fi
  return 0
}

# Templates dos pré-prompts: scripts/prompts/<comando>.md, com placeholders <%= nome %>.
PROMPTS_DIR="$(dirname "$0")/prompts"
PROMPT_VARS=""

# As variáveis do template ficam em ficheiros, porque o diff pode exceder o limite de argumentos do
# sistema. A pasta é criada antes de qualquer set_var, que pode correr num subshell (num pipe).
init_prompt_vars() {
  PROMPT_VARS="$(mktemp -d)"
  trap 'rm -rf "$PROMPT_VARS"' EXIT
}

# Grava a variável <nome> do template (valor no 2.º argumento, ou no stdin se não houver).
set_var() {
  if (( $# > 1 )); then printf '%s' "$2" >"${PROMPT_VARS}/$1"; else cat >"${PROMPT_VARS}/$1"; fi
}

# Imprime o template <comando> com os <%= nome %> preenchidos; variáveis em falta ficam vazias.
render_template() {
  local template="${PROMPTS_DIR}/$1.md"
  [[ -f "$template" ]] || die "falta o template ${template}."
  node -e 'const fs = require("fs"), path = require("path");
    const [template, vars] = process.argv.slice(1);
    const value = (name) => {
      const file = path.join(vars, name);
      return fs.existsSync(file) ? fs.readFileSync(file, "utf8").replace(/\n+$/, "") : "";
    };
    process.stdout.write(fs.readFileSync(template, "utf8").replace(/<%=\s*(\w+)\s*%>/g, (_, name) => value(name)));' \
    "$template" "$PROMPT_VARS"
}

# Copia o stdin para o clipboard, se houver um: pbcopy (macOS), clip (Git Bash), wl-copy ou xclip.
copy_to_clipboard() {
  local tool
  for tool in pbcopy clip wl-copy "xclip -selection clipboard"; do
    command -v "${tool%% *}" >/dev/null 2>&1 || continue
    $tool && return 0
  done
  return 1
}

cmd_validate() {
  local name base dir files script output checks="" failed=0
  name="$(current_change)"
  base="${REMOTE}/${BASE_BRANCH}"
  git rev-parse --verify --quiet "$base" >/dev/null || base="$BASE_BRANCH"

  for script in lint test; do
    if [[ "${OFLOW_SKIP_CHECK:-}" == 1 ]]; then
      checks+="– ${script} (saltado: OFLOW_SKIP_CHECK=1)"$'\n'
    elif [[ ! -f package.json ]] || ! node -e 'process.exit(require("./package.json").scripts?.[process.argv[1]] ? 0 : 1)' "$script"; then
      checks+="– ${script} (sem script no package.json)"$'\n'
    elif output="$(npm run --silent "$script" 2>&1)"; then
      checks+="✓ ${script}"$'\n'
    else
      checks+="✗ ${script} — $(tail -c 300 <<<"$output" | tr '\n' ' ')"$'\n'
      failed=$((failed + 1))
    fi
  done

  dir="$(change_dir_at . "$name")"
  if [[ -n "$dir" && -f "$dir/tasks.md" ]]; then
    local total done_
    total="$(grep -cE '^[[:space:]]*- \[[ xX]\]' "$dir/tasks.md" || true)"
    done_="$(grep -cE '^[[:space:]]*- \[[xX]\]' "$dir/tasks.md" || true)"
    if (( total == 0 )); then
      checks+="– tasks (tasks.md sem checklist)"$'\n'
    elif (( done_ == total )); then
      checks+="✓ tasks — ${done_}/${total} concluídas"$'\n'
    else
      checks+="✗ tasks — ${done_}/${total} concluídas"$'\n'
      failed=$((failed + 1))
    fi
  else
    checks+="– tasks (sem ${dir:-openspec/changes/${name}}/tasks.md)"$'\n'
  fi

  files="$(git diff --name-only "${base}...HEAD"; git status --porcelain --untracked-files=all | awk '{print $NF " (por commitar)"}')"

  init_prompt_vars
  set_var changeName "$name"
  set_var branch "${PREFIX}${name}"
  set_var base "$base"
  change_section . "$name" | set_var changeSection
  sed 's/ (por commitar)$//' <<<"$files" | patterns_section . | set_var patternsSection
  set_var checksSection "$checks"
  set_var diffFilesSection "${files:-(nenhum ficheiro modificado)}"

  local prompt
  prompt="$(render_template validate)"
  printf '%s\n' "$prompt"
  if [[ -t 1 ]] && printf '%s\n' "$prompt" | copy_to_clipboard; then
    echo "oflow: pré-prompt copiado para o clipboard." >&2
  fi
  (( failed == 0 )) || die "${failed} check(s) falharam — corrige antes de abrir o MR."
}

# Campo do JSON no stdin, por uma expressão JS sobre `m` (ex.: m.diff_refs?.base_sha).
json_get() {
  node -e 'const m = JSON.parse(require("fs").readFileSync(0, "utf8"));
    process.stdout.write(String(new Function("m", `return ${process.argv[1]}`)(m) ?? ""));' "$1"
}

cmd_review() {
  local url="${1:-}"
  [[ "$url" =~ ^https?://([^/]+)/(.+)/-/merge_requests/([0-9]+) ]] \
    || die "uso: oflow.sh review <url-do-MR> (https://<host>/<projeto>/-/merge_requests/<n>)"
  local host="${BASH_REMATCH[1]}" project="${BASH_REMATCH[2]}" iid="${BASH_REMATCH[3]}"
  command -v glab >/dev/null 2>&1 || die "o review precisa do glab instalado e autenticado em ${host}."

  # O review usa os padrões e o código deste clone: tem de ser o projeto do MR.
  local origin
  origin="$(git remote get-url "$REMOTE")"
  origin="${origin%.git}"; origin="${origin#*://}"; origin="${origin#*@}"; origin="${origin/:/\/}"
  [[ "$origin" == "${host}/${project}" ]] \
    || die "o MR é de ${host}/${project}, mas o ${REMOTE} deste repositório é ${origin}: corre o review num clone desse projeto."

  local json
  json="$(glab mr view "$iid" -R "https://${host}/${project}" -F json)" \
    || die "não foi possível ler o MR !${iid} (sem acesso, ou falta glab auth login --hostname ${host})."
  local title state source target head base pipeline description
  title="$(json_get 'm.title' <<<"$json")"
  state="$(json_get 'm.state' <<<"$json")"
  source="$(json_get 'm.source_branch' <<<"$json")"
  target="$(json_get 'm.target_branch' <<<"$json")"
  head="$(json_get 'm.diff_refs?.head_sha || m.sha' <<<"$json")"
  base="$(json_get 'm.diff_refs?.base_sha' <<<"$json")"
  pipeline="$(json_get 'm.head_pipeline?.status || "sem pipeline"' <<<"$json")"
  description="$(json_get 'm.description || "(sem descrição)"' <<<"$json")"
  [[ "$state" == opened ]] || echo "oflow: o MR !${iid} está ${state}." >&2

  # O ref do MR existe sempre no GitLab, mesmo para MRs de forks; o checkout atual não muda.
  git fetch --quiet "$REMOTE" "refs/merge-requests/${iid}/head" "$target"
  [[ -n "$base" ]] || base="$(git merge-base "${REMOTE}/${target}" "$head")"

  local name="" diff files
  [[ "$source" == "$PREFIX"* ]] && name="${source#"$PREFIX"}"
  diff="$(git diff "$base" "$head" -- . ':(exclude)package-lock.json')"
  files="$(git diff --name-only "$base" "$head")"
  [[ -n "$diff" ]] || echo "oflow: o MR !${iid} não tem diff." >&2

  init_prompt_vars
  set_var mrId "$iid"
  set_var mrTitle "$title"
  set_var mrUrl "$url"
  set_var mrState "$state"
  set_var mrDescription "$description"
  set_var pipelineStatus "$pipeline"
  set_var sourceBranch "$source"
  set_var targetBranch "$target"
  set_var headSha "$head"
  if [[ -n "$name" ]]; then
    change_section "$head" "$name" | set_var changeSection
  else
    set_var changeSection "## Change OpenSpec"$'\n\n'"(a branch ${source} não é de uma change OpenSpec)"
  fi
  patterns_section "$head" <<<"$files" | set_var patternsSection
  set_var diff "${diff:-(nenhuma mudança encontrada)}"

  local prompt
  prompt="$(render_template review)"

  if [[ ! -t 1 ]]; then
    printf '%s\n' "$prompt"
    return 0
  fi
  local file
  file="$(git rev-parse --git-dir)/oflow/$(date +%Y%m%d-%H%M%S)-review-${iid}.md"
  mkdir -p "$(dirname "$file")"
  printf '%s\n' "$prompt" >"$file"
  printf '%s\n' "$prompt" | copy_to_clipboard && echo "oflow: pré-prompt copiado para o clipboard."
  echo "oflow: pré-prompt guardado em ${file}"
}

case "${1:-}" in
  start)    shift; cmd_start "$@" ;;
  check)    shift; cmd_check "$@" ;;
  validate) shift; cmd_validate "$@" ;;
  publish)  shift; cmd_publish "$@" ;;
  ship)     shift; cmd_ship "$@" ;;
  review)   shift; cmd_review "$@" ;;
  *)        sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'; exit 1 ;;
esac
