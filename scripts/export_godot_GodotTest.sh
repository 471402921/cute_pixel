#!/bin/bash

set -eu

SCRIPT_NAME="$0"
BASE_DIR="$( cd "$(dirname "$0")" ; pwd -P )"
REPO_ROOT="$( cd "$BASE_DIR/.." ; pwd -P )"

platform="${1:-}"
preset=""

case "$platform" in
    android)
        preset="Android"
    ;;
    ios)
        preset="iOS"
    ;;
    *)
        echo "Usage: $0 <android|ios>"
        exit 1
esac

"$BASE_DIR/export_godot.sh" --target "$REPO_ROOT" --name GodotTest --preset "$preset" --project "$REPO_ROOT/godot_project" --platform $platform
