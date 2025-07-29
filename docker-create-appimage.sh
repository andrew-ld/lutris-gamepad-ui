#!/bin/bash

set -xe

tmpdir=$(mktemp -d)

function cleanup() {
    rm -rf "$tmpdir"
}

trap cleanup EXIT

declare -a PLATFORM_ARGS

if [[ -n "$1" ]]; then
  PLATFORM_ARGS=("--platform" "linux/$1")
fi

docker buildx build "${PLATFORM_ARGS[@]}" --output type=local,dest="$tmpdir" --progress plain .

cp "$tmpdir"/release.AppImage .
