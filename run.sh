#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

PYTHON="${PYTHON:-python3}"
VENV_DIR="${VENV_DIR:-$DIR/.venv}"
HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-8104}"

if [ ! -x "$VENV_DIR/bin/python" ]; then
  if ! "$PYTHON" -m venv "$VENV_DIR" 2>/dev/null; then
    "$PYTHON" -m virtualenv "$VENV_DIR"
  fi
fi

"$VENV_DIR/bin/python" -m pip install --quiet --upgrade pip
"$VENV_DIR/bin/python" -m pip install --quiet -r "$DIR/requirements.txt"

if [ "${PELAGOS_SETUP_ONLY:-0}" = "1" ]; then
  exit 0
fi

exec "$VENV_DIR/bin/python" "$DIR/server.py" --host "$HOST" --port "$PORT"
