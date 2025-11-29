#!/bin/bash

set -xe

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
SCRIPT_PATH="$SCRIPT_DIR/$(basename "$0")"

export PYTHONDONTWRITEBYTECODE=1

validate_python() {
    local executable=$1

    if [[ "$executable" != /* ]]; then
        executable=$(command -v "$executable" 2>/dev/null) || return 1
    fi

    if [[ ! -x "$executable" ]]; then
        return 1
    fi

    "$executable" -c "import lutris" &> /dev/null || return 1
}

get_python_cmd() {
    if validate_python "python3"; then
        echo "python3"
        return 0
    fi

    if validate_python "python"; then
        echo "python"
        return 0
    fi

    while IFS= read -r -d: directory; do
        if [[ -d "$directory" ]]; then
            directory=$(cd "$directory" && pwd)
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

    echo "Error: Could not find a valid 'python3' or 'python' with the 'lutris' module in your PATH." >&2
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
