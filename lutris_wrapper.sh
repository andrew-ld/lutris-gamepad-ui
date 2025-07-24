#!/bin/bash

set -xe

SCRIPT_PATH=$(readlink -f "$0")
SCRIPT_DIR=$(dirname "$SCRIPT_PATH")

if command -v python3 &>/dev/null; then
    PYTHON_CMD="python3"
elif command -v python &>/dev/null; then
    PYTHON_CMD="python"
else
    echo "Error: Could not find 'python3' or 'python' in your PATH." >&2
    exit 1
fi

declare -a CMD_TO_RUN

if [[ "$FLATPAK_ID" == "net.lutris.Lutris" ]]; then
    CMD_TO_RUN=("$PYTHON_CMD" "$SCRIPT_DIR/lutris_wrapper.py" "$@")

elif command -v lutris &>/dev/null; then
    CMD_TO_RUN=("$PYTHON_CMD" "$SCRIPT_DIR/lutris_wrapper.py" "$@")

elif flatpak info net.lutris.Lutris &>/dev/null; then
    CMD_TO_RUN=(flatpak run --command=bash --filesystem="$SCRIPT_DIR" net.lutris.Lutris "$SCRIPT_PATH" "$@")

else
    echo "Error: Lutris installation not found." >&2
    exit 1
fi

exec "${CMD_TO_RUN[@]}"
