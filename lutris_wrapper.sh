#!/bin/bash

set -xe

SCRIPT_PATH=$(readlink -f "$0")
SCRIPT_DIR=$(dirname "$SCRIPT_PATH")

export PYTHONDONTWRITEBYTECODE=1

get_python_cmd() {
    if command -v python3 &>/dev/null; then
        echo "python3"
    elif command -v python &>/dev/null; then
        echo "python"
    else
        echo "Error: Could not find 'python3' or 'python' in your PATH." >&2
        exit 1
    fi
}

declare -a CMD_TO_RUN

if [[ "$FLATPAK_ID" == "net.lutris.Lutris" ]]; then
    CMD_TO_RUN=("$(get_python_cmd)" "$SCRIPT_DIR/lutris_wrapper.py" "$@")

elif command -v lutris &>/dev/null; then
    CMD_TO_RUN=("$(get_python_cmd)" "$SCRIPT_DIR/lutris_wrapper.py" "$@")

elif flatpak info net.lutris.Lutris &>/dev/null; then
    CMD_TO_RUN=(flatpak run --command=bash --filesystem="$SCRIPT_DIR" net.lutris.Lutris "$SCRIPT_PATH" "$@")

else
    echo "Error: Lutris installation not found." >&2
    exit 1
fi

exec "${CMD_TO_RUN[@]}"
