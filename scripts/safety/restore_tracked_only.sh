#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  scripts/safety/restore_tracked_only.sh [--apply] [--keep-regex REGEX]

Restores only changed tracked files (staged + unstaged), excluding paths
matched by --keep-regex.

Defaults:
  dry-run mode (no changes)
  keep-regex: ^(\.gitignore|docs/)
EOF
}

APPLY=0
KEEP_REGEX='^(\.gitignore|docs/)'

while [[ $# -gt 0 ]]; do
  case "$1" in
    --apply)
      APPLY=1
      shift
      ;;
    --keep-regex)
      KEEP_REGEX="${2:-}"
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
SNAP_DIR="/private/tmp/sf_restore_snapshots/$TS"
mkdir -p "$SNAP_DIR"
git status --short > "$SNAP_DIR/status-before.txt"
git diff > "$SNAP_DIR/unstaged-before.patch"
git diff --cached > "$SNAP_DIR/staged-before.patch"

FILES_RAW="$( { git diff --name-only; git diff --cached --name-only; } | sort -u )"
if [[ -n "$KEEP_REGEX" ]]; then
  FILES_RAW="$(printf '%s\n' "$FILES_RAW" | grep -Ev "$KEEP_REGEX" || true)"
fi

if [[ -z "$FILES_RAW" ]]; then
  echo "No tracked files to restore."
  echo "Snapshot: $SNAP_DIR"
  exit 0
fi

echo "Tracked files selected for restore:"
printf '%s\n' "$FILES_RAW"
echo
echo "Snapshot: $SNAP_DIR"

if [[ "$APPLY" -ne 1 ]]; then
  echo
  echo "Dry-run only. Re-run with --apply to execute restore."
  exit 0
fi

while IFS= read -r f; do
  [[ -n "$f" ]] || continue
  git restore --staged --worktree -- "$f"
done <<< "$FILES_RAW"

echo
echo "Restore completed."
git status --short
