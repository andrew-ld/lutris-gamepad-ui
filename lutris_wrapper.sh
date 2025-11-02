#!/bin/bash

set -xe

if [[ -r "/etc/profile" ]]; then
    # shellcheck source=/dev/null
    source "/etc/profile"
fi

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

if [[ -x "/usr/games/lutris" ]]; then
    export PATH="$PATH:/usr/games/"
fi

if command -v lutris &>/dev/null; then
    exec "$(get_python_cmd)" "$SCRIPT_DIR/lutris_wrapper.py" "$@"
fi

if [[ "$FLATPAK_ID" == "net.lutris.Lutris" ]]; then
    echo "Error: Broken flatpak lutris installation." >&2
    exit 1
fi

if flatpak info net.lutris.Lutris &>/dev/null; then
    exec flatpak run --command=bash --filesystem="$SCRIPT_DIR" net.lutris.Lutris "$SCRIPT_PATH" "$@"
fi

echo "Error: Lutris installation not found." >&2
exit 1
