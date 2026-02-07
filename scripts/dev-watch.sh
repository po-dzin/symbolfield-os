#!/usr/bin/env zsh
set -u

PORT="${1:-5173}"
HOST="${2:-0.0.0.0}"
DELAY_SECONDS="${DELAY_SECONDS:-1}"

echo "[dev-watch] starting watchdog for vite on ${HOST}:${PORT}"
echo "[dev-watch] press Ctrl+C to stop"

while true; do
  echo "[dev-watch] launching: npm run dev -- --host ${HOST} --port ${PORT}"
  npm run dev -- --host "${HOST}" --port "${PORT}"
  exit_code=$?
  echo "[dev-watch] vite exited with code ${exit_code}; restarting in ${DELAY_SECONDS}s..."
  sleep "${DELAY_SECONDS}"
done
