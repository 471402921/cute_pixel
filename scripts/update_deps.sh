#!/bin/bash

set -eux

SCRIPT_DIR="$( cd "$(dirname "$0")" ; pwd -P )"
REPO_ROOT="$( cd "$SCRIPT_DIR/.." ; pwd -P )"

LOCAL_DEP_PATH="${1:-}"

if [ "$LOCAL_DEP_PATH" != "" ]
then
    export LIBGODOT_XCFRAMEWORK_PATH=$LOCAL_DEP_PATH/libgodot.xcframework.zip
    export LIBGODOT_CPP_XCFRAMEWORK_PATH=$LOCAL_DEP_PATH/libgodot-cpp.xcframework.zip
    export LIBGODOT_CPP_ANDROID_PATH=$LOCAL_DEP_PATH/godot-cpp-android.zip
    export LIBGODOT_ANDROID_PATH=$LOCAL_DEP_PATH/libgodot-android.zip
    export REPLACE_EXISTING=true
    export SHASUM_CHECK=false
fi

cd "$REPO_ROOT"

yarn install

yarn download-prebuilt

cd "$REPO_ROOT/ios"
bundle install
bundle exec pod install
