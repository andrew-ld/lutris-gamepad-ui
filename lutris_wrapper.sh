#!/bin/bash

set -xe

SCRIPT_PATH=$(readlink -f "$0")
SCRIPT_DIR=$(dirname "$SCRIPT_PATH")

export PYTHONDONTWRITEBYTECODE=1

validate_python() {
    local executable=$1
    if [[ ! -x "$executable" ]]; then
        return 1
    fi
    "$executable" -c "import lutris" &> /dev/null
}

get_python_cmd() {
    while IFS= read -r -d: directory; do
    if [[ -d "$directory" ]]; then
        if validate_python "$directory/python3"; then
            echo "$directory/python3"
            return 0
        fi
        if validate_python "$directory/python"; then
            echo "$directory/python"
            return 0
        fi
    fi
    done < <(printf '%s:' "$PATH")

    echo "Error: Could not find 'python3' or 'python' in your PATH." >&2
    exit 1
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
