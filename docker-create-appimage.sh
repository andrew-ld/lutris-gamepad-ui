#!/bin/bash

set -xe

tmpdir=$(mktemp -d)

function cleanup() {
    rm -rf "$tmpdir"
}

trap cleanup EXIT

docker buildx build --output type=local,dest="$tmpdir" --progress plain .

cp "$tmpdir"/release.AppImage .
