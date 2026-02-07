#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  scripts/safety/clean_temp.sh [--apply]

Removes known temporary folders/files only.
Default mode is dry-run.

Never touches:
  - .codex
  - agents
  - docs
  - src
  - tracked files
EOF
}

APPLY=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --apply)
      APPLY=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

CANDIDATES=(
  "_docs_work"
  ".merge-backups"
  "test-results"
  "playwright-report"
)

echo "Repo: $REPO_ROOT"
echo "Mode: $([[ "$APPLY" -eq 1 ]] && echo apply || echo dry-run)"
echo

for path in "${CANDIDATES[@]}"; do
  [[ -e "$path" ]] || continue
  if [[ "$path" == ".codex" || "$path" == "agents" || "$path" == "docs" || "$path" == "src" ]]; then
    echo "SKIP (protected): $path"
    continue
  fi
  # `git ls-files --error-unmatch` is unreliable for directories.
  # Check for any tracked files under the path instead.
  if [[ -n "$(git ls-files -- "$path")" ]]; then
    echo "SKIP (tracked): $path"
    continue
  fi
  if [[ "$APPLY" -eq 1 ]]; then
    rm -rf "$path"
    echo "REMOVED: $path"
  else
    echo "WOULD REMOVE: $path"
  fi
done

echo
git status --short
