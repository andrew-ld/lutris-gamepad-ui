#!/bin/bash

set -xe

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
SCRIPT_PATH="$SCRIPT_DIR/$(basename "$0")"
WRAPPER_PATH="$SCRIPT_DIR/lutris_wrapper.py"

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

    IFS=':' read -ra ADDR <<< "$PATH"
    for directory in "${ADDR[@]}"; do
        if [[ -d "$directory" ]]; then
            directory=$(cd "$directory" && pwd) || continue

            if validate_python "$directory/python3"; then
                echo "$directory/python3"
                return 0
            fi

            if validate_python "$directory/python"; then
                echo "$directory/python"
                return 0
            fi
        fi
    done

    echo "Error: Could not find a valid 'python3' or 'python' with the 'lutris' module in your PATH." >&2
    exit 1
}

if [[ -x "/usr/games/lutris" ]]; then
    export PATH="$PATH:/usr/games/"
fi

if command -v lutris &>/dev/null; then
    launch_wrapper() {
        local py_cmd
        if py_cmd=$(get_python_cmd); then
            exec "$py_cmd" "$WRAPPER_PATH" "$@"
        fi
        return 1
    }

    export PYTHONNOUSERSITE=1
    launch_wrapper || true

    unset PYTHONNOUSERSITE
    launch_wrapper || true

    echo "Warning: Lutris binary found, but could not import 'lutris' python module." >&2
    exit 1
fi

if [[ "$FLATPAK_ID" == "net.lutris.Lutris" ]]; then
    echo "Error: Running inside Flatpak but installation appears broken." >&2
    exit 1
fi

if flatpak info net.lutris.Lutris &>/dev/null; then
    exec flatpak run --command=bash --filesystem="$SCRIPT_DIR" net.lutris.Lutris "$SCRIPT_PATH" "$@"
fi

echo "Error: Lutris installation not found." >&2
exit 1
