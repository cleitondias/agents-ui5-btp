#!/usr/bin/env bash
# new-project — monta (ou complementa) um projeto a partir dos packs deste repositório.
#
#   scripts/new-project.sh <destino> [--packs <lista>] [--tools <lista>] [--name <nome>]
#
#   --packs  packs além da base, separados por vírgula:
#              cap-app                    código do template CAP (inclui cap-patterns)
#              cap-patterns               docs/patterns/cap/
#              fiori-elements-patterns    docs/patterns/fiori-elements/
#              fiori-freestyle-patterns   docs/patterns/fiori-freestyle/
#   --tools  ferramentas de IA para o `openspec init` (ex.: claude,codex,cursor); sem isto o init
#            não é corrido e o comando a usar é mostrado no fim
#   --name   nome do projeto (kebab-case) que substitui o placeholder `cap-template` do cap-app;
#            por omissão, o nome da pasta de destino
#
# O pack `base` (AGENTS.md, openspec/config.yaml, scripts/oflow.sh) é sempre copiado.
# Ficheiros que já existam no destino nunca são sobrescritos: o AGENTS.md recebe as instruções da
# base no fim, o resto é ignorado e listado.

set -euo pipefail

KIT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PACKS_DIR="$KIT_ROOT/packs"
PLACEHOLDER="cap-template"
AGENTS_MARKER="<!-- sap-btp-skills-and-agents: base -->"

die() { echo "new-project: $*" >&2; exit 1; }
usage() { sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'; exit 1; }

dest="" packs="" tools="" name=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --packs) packs="${2:-}"; shift 2 ;;
    --tools) tools="${2:-}"; shift 2 ;;
    --name)  name="${2:-}";  shift 2 ;;
    -h|--help) usage ;;
    -*) die "opção desconhecida: $1" ;;
    *)  [[ -z "$dest" ]] || die "só um destino é aceite."; dest="$1"; shift ;;
  esac
done
[[ -n "$dest" ]] || usage

# Resolve a lista final: base primeiro, dependências antes de quem depende delas, sem repetidos.
selected=(base)
add_pack() {
  local p="$1" s
  for s in "${selected[@]}"; do [[ "$s" == "$p" ]] && return; done
  [[ -d "$PACKS_DIR/$p" ]] || die "pack desconhecido: $p (disponíveis: $(ls "$PACKS_DIR" | grep -v '^base$' | paste -sd, -))"
  selected+=("$p")
}
IFS=',' read -r -a requested <<< "$packs"
for p in "${requested[@]}"; do
  [[ -n "$p" ]] || continue
  [[ "$p" == cap-app ]] && add_pack cap-patterns
  add_pack "$p"
done

mkdir -p "$dest"
dest="$(cd "$dest" && pwd)"
[[ "$dest" != "$KIT_ROOT"* ]] || die "o destino não pode estar dentro deste repositório."
[[ -n "$name" ]] || name="$(basename "$dest")"
has_cap_app=false
[[ " ${selected[*]} " == *" cap-app "* ]] && has_cap_app=true
if $has_cap_app && [[ ! "$name" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]; then
  die "nome '$name' inválido para o projeto CAP — usa --name em kebab-case."
fi

skipped=()
copy_pack() {
  local pack="$1" src rel target
  src="$PACKS_DIR/$pack"
  while IFS= read -r -d '' file; do
    rel="${file#"$src"/}"
    target="$dest/$rel"
    if [[ ! -e "$target" ]]; then
      mkdir -p "$(dirname "$target")"
      cp -p "$file" "$target"
    elif [[ "$rel" == AGENTS.md ]]; then
      if ! grep -qF "$AGENTS_MARKER" "$target"; then
        printf '\n%s\n' "$AGENTS_MARKER" >> "$target"
        sed '1,/^## /{/^## /!d;}' "$file" >> "$target"   # sem o título e a introdução da base
        echo "  AGENTS.md já existia — instruções da base acrescentadas no fim."
      fi
    else
      skipped+=("$rel")
    fi
  done < <(find "$src" \( -name node_modules -o -name gen -o -name .DS_Store \) -prune -o -type f -print0)
}

for p in "${selected[@]}"; do
  echo "pack: $p"
  copy_pack "$p"
done

if $has_cap_app; then
  for f in package.json package-lock.json mta.yaml xs-security.json; do
    [[ -f "$dest/$f" ]] && grep -q "$PLACEHOLDER" "$dest/$f" && sed -i.bak "s/$PLACEHOLDER/$name/g" "$dest/$f" && rm "$dest/$f.bak"
  done
  echo "  placeholder '$PLACEHOLDER' substituído por '$name'."
fi

if [[ ${#skipped[@]} -gt 0 ]]; then
  echo
  echo "Já existiam no destino e NÃO foram alterados (compara à mão com packs/):"
  printf '  %s\n' "${skipped[@]}"
fi

echo
if [[ -n "$tools" ]]; then
  command -v openspec >/dev/null 2>&1 || die "openspec não está instalado (npm i -g @fission-ai/openspec)."
  # O init mantém o openspec/config.yaml copiado da base e só gera as skills de cada ferramenta.
  openspec init --tools "$tools" --no-animation "$dest" >/dev/null
  echo "OpenSpec inicializado para: $tools"
else
  echo "Falta gerar as skills do OpenSpec para o agente da equipa, por exemplo:"
  echo "  openspec init --tools claude,codex,cursor \"$dest\""
fi
echo "Projeto pronto em $dest"
