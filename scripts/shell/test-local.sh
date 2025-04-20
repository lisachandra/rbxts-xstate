#!/bin/sh

set -e

OUTPUT=build/test-place.rbxl

rojo build "$1" --output "$OUTPUT"
run-in-roblox --place "$OUTPUT" --script "$2"
