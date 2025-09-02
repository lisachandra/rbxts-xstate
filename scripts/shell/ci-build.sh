#!/bin/bash

for package in packages/*/; do
	(cd "$package" && pnpm build && pnpm install)
done

attempt=0

while [ $attempt -lt 3 ]; do
	pnpm build:test
	if [ $? -eq 0 ]; then
		break
	else
		attempt=$((attempt+1))
		if [ $attempt -eq 3 ]; then
			exit 1
		fi
	fi
done
