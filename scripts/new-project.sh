#!/usr/bin/env bash
# new-project — atalho para `sap-btp-kit init` a partir de um clone deste repositório.
# As opções estão em `scripts/new-project.sh --help`.

exec node "$(dirname "${BASH_SOURCE[0]}")/../bin/cli.js" init "$@"
