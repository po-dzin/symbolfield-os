#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  scripts/safety/snapshot.sh [--out DIR] [--label NAME]

Creates a full git working-state snapshot:
  - status (short + porcelain)
  - unstaged patch
  - staged patch
  - untracked file list
  - metadata (branch/head/time)
EOF
}

OUT_DIR=""
LABEL="snapshot"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --out)
      OUT_DIR="${2:-}"
      shift 2
      ;;
    --label)
      LABEL="${2:-}"
      shift 2
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

TS="$(date +%Y%m%d-%H%M%S)"
if [[ -z "$OUT_DIR" ]]; then
  OUT_DIR="/private/tmp/sf_snapshots/${TS}-${LABEL}"
fi

mkdir -p "$OUT_DIR"

git status --short > "$OUT_DIR/status.short.txt"
git status --porcelain=v1 > "$OUT_DIR/status.porcelain.txt"
git diff > "$OUT_DIR/unstaged.patch"
git diff --cached > "$OUT_DIR/staged.patch"
git ls-files --others --exclude-standard > "$OUT_DIR/untracked.txt"

{
  echo "timestamp=$TS"
  echo "repo=$REPO_ROOT"
  echo "branch=$(git branch --show-current)"
  echo "head=$(git rev-parse --short HEAD)"
} > "$OUT_DIR/meta.txt"

echo "Snapshot saved: $OUT_DIR"
