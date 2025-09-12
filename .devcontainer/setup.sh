#!/bin/bash

ROKIT_BIN_DIR="$HOME/.rokit/bin"
export PATH="$PATH:$ROKIT_BIN_DIR"
echo "$ROKIT_BIN_DIR" >> "$GITHUB_PATH"
source ~/.bashrc

curl -sSf https://raw.githubusercontent.com/rojo-rbx/rokit/main/scripts/install.sh | bash
rokit install --no-trust-check
npm install -g corepack
corepack enable
corepack install
pnpm install
