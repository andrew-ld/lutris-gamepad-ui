#!/usr/bin/env bash
set -euo pipefail

SOURCE="${BASH_SOURCE[0]}"

while [ -h "$SOURCE" ]; do
    SCRIPT_DIR="$(cd -P "$(dirname "$SOURCE")" >/dev/null 2>&1 && pwd)"
    SOURCE="$(readlink "$SOURCE")"
    [[ $SOURCE != /* ]] && SOURCE="$SCRIPT_DIR/$SOURCE"
done

SCRIPT_DIR="$(cd -P "$(dirname "$SOURCE")" >/dev/null 2>&1 && pwd)"
SCRIPT_NAME="$(basename "$SOURCE")"

exec "$SCRIPT_DIR/$SCRIPT_NAME.bin" --no-sandbox "$@"
