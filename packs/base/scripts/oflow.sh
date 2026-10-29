#!/usr/bin/env bash
# oflow — fluxo "1 tarefa = 1 change OpenSpec = 1 branch = 1 MR".
#
#   scripts/oflow.sh start <nome-da-change>   no fim do propose: cria a branch change/<nome> a partir
#                                             da main atualizada e commita a proposta (idempotente)
#   scripts/oflow.sh publish                  depois do archive: commit, push e abertura do MR
#   scripts/oflow.sh ship                     sem agente: valida, arquiva (CLI) e corre o publish
#
# Independente de ferramenta de IA: pode ser corrido à mão ou por qualquer agente.
# O MR é aberto com `glab` se estiver instalado; senão via push options do GitLab.
# Variáveis opcionais: OFLOW_BASE_BRANCH, OFLOW_REMOTE, OFLOW_MR_VIA (auto|glab|push),
# OFLOW_REVIEWERS (só glab, ex.: joao,maria).

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

  openspec validate "$name" --strict --no-interactive
  openspec archive "$name" --yes
  cmd_publish
}

case "${1:-}" in
  start)   shift; cmd_start "$@" ;;
  publish) shift; cmd_publish "$@" ;;
  ship)    shift; cmd_ship "$@" ;;
  *)       sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'; exit 1 ;;
esac
