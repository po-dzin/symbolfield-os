#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  scripts/safety/pre_handoff_check.sh [--role <ui|core|ops|docs>] [--skip-zone-check] [--skip-typecheck] [--paths "src tests"]

Checks:
  1) zone/allowlist check (agents/enforce_zone.sh)
  2) unresolved conflict markers in selected paths
  3) untracked files in selected paths
  4) optional TypeScript typecheck (npm run -s typecheck)
EOF
}

SKIP_TYPECHECK=0
SKIP_ZONE_CHECK=0
CHECK_PATHS="src tests"
ROLE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --role)
      ROLE="${2:-}"
      shift 2
      ;;
    --skip-zone-check)
      SKIP_ZONE_CHECK=1
      shift
      ;;
    --skip-typecheck)
      SKIP_TYPECHECK=1
      shift
      ;;
    --paths)
      CHECK_PATHS="${2:-src tests}"
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

if [[ -z "$ROLE" ]]; then
  BRANCH="$(git branch --show-current || true)"
  if [[ "$BRANCH" =~ ^agent/([^/]+)/ ]]; then
    ROLE="${BASH_REMATCH[1]}"
  fi
fi

echo "Running pre-handoff checks in: $REPO_ROOT"
echo "Paths: $CHECK_PATHS"
if [[ -n "$ROLE" ]]; then
  echo "Role: $ROLE"
else
  echo "Role: not set (zone check optional)"
fi

FAIL=0

echo
echo "[1/4] Zone check"
if [[ "$SKIP_ZONE_CHECK" -eq 1 ]]; then
  echo "SKIP: zone check skipped by flag."
elif [[ -z "$ROLE" ]]; then
  echo "SKIP: role is not set and could not be inferred from branch."
elif [[ ! -x "agents/enforce_zone.sh" ]]; then
  echo "SKIP: agents/enforce_zone.sh is missing or not executable."
else
  if bash agents/enforce_zone.sh --role "$ROLE" --staged --unstaged; then
    echo "OK: zone check passed."
  else
    echo "FAIL: zone check failed."
    FAIL=1
  fi
fi

echo
echo "[2/4] Conflict markers"
if command -v rg >/dev/null 2>&1; then
  CONFLICTS="$(rg -n '^(<<<<<<<|=======|>>>>>>>)' $CHECK_PATHS || true)"
else
  CONFLICTS="$(grep -R -n -E '^(<<<<<<<|=======|>>>>>>>)' $CHECK_PATHS 2>/dev/null || true)"
fi
if [[ -n "$CONFLICTS" ]]; then
  echo "$CONFLICTS"
  echo "FAIL: unresolved conflict markers found."
  FAIL=1
else
  echo "OK: no conflict markers."
fi

echo
echo "[3/4] Untracked files in guarded paths"
UNTRACKED="$(git ls-files --others --exclude-standard -- $CHECK_PATHS || true)"
if [[ -n "$UNTRACKED" ]]; then
  echo "$UNTRACKED"
  echo "FAIL: untracked files found in guarded paths."
  FAIL=1
else
  echo "OK: no untracked files in guarded paths."
fi

echo
echo "[4/4] Typecheck"
if [[ "$SKIP_TYPECHECK" -eq 1 ]]; then
  echo "SKIP: typecheck skipped by flag."
else
  if npm run -s typecheck; then
    echo "OK: typecheck passed."
  else
    echo "FAIL: typecheck failed."
    FAIL=1
  fi
fi

echo
if [[ "$FAIL" -ne 0 ]]; then
  echo "Pre-handoff check: FAILED"
  exit 1
fi

echo "Pre-handoff check: PASSED"
