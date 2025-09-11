#!/bin/sh

curl -sSf https://raw.githubusercontent.com/rojo-rbx/rokit/main/scripts/install.sh | bash
source ~/.bashrc
rokit install --no-trust-check
npm install -g corepack
corepack enable
corepack install
pnpm install
