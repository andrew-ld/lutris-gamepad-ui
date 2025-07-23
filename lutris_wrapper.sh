#!/bin/bash

set -xe

SCRIPT_PATH=$(readlink -f "$0")
SCRIPT_DIR=$(dirname "$SCRIPT_PATH")

if [[ "$FLATPAK_ID" == "net.lutris.Lutris" ]]; then
    python "$SCRIPT_DIR"/lutris_wrapper.py "$@"
    exit $?
fi

if command -v lutris &>/dev/null; then
    python "$SCRIPT_DIR"/lutris_wrapper.py "$@"
    exit $?
fi

if flatpak info net.lutris.Lutris &>/dev/null; then
    flatpak run --command=bash --filesystem="$SCRIPT_DIR" net.lutris.Lutris "$SCRIPT_PATH" "$@"
    exit $?
fi

exit 1
