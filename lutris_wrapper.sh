#!/bin/bash

set -xe

SCRIPT_PATH=$(readlink -f "$0")
SCRIPT_DIR=$(dirname "$SCRIPT_PATH")

declare -a CMD_TO_RUN

if [[ "$FLATPAK_ID" == "net.lutris.Lutris" ]]; then
    CMD_TO_RUN=(python "$SCRIPT_DIR/lutris_wrapper.py" "$@")

elif command -v lutris &>/dev/null; then
    CMD_TO_RUN=(python "$SCRIPT_DIR/lutris_wrapper.py" "$@")

elif flatpak info net.lutris.Lutris &>/dev/null; then
    CMD_TO_RUN=(flatpak run --command=bash --filesystem="$SCRIPT_DIR" net.lutris.Lutris "$SCRIPT_PATH" "$@")

else
    echo "Error: Lutris installation not found." >&2
    exit 1
fi

exec "${CMD_TO_RUN[@]}"
