#!/usr/bin/env bash
set -euo pipefail

echo "==> Running npm install"
npm install

echo "==> Running npm run release (tests + build + deploy)"
npm run release

echo "==> Staging changes"
git add .

echo "==> Committing"
git commit -m "fix(stage): complete Sand Dunes rebuild and optimization ✅"

echo "==> Pushing to remote"
git push

echo "==> Release workflow complete."
