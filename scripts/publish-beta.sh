#!/usr/bin/env bash
set -e

# Collagility NPM Pre-release Beta Publisher
# Releases collagility under the 'beta' dist-tag on NPM

echo "========================================="
echo "  Publishing Collagility 0.1.1-beta.1"
echo "========================================="

echo "1. Cleaning and building monorepo..."
pnpm build

echo "2. Validating binary bundle..."
chmod +x apps/cli/dist/main.js

echo "3. Publishing collagility to NPM under the 'beta' dist-tag..."
cd apps/cli
# Note: --tag beta prevents this pre-release from overwriting the 'latest' stable tag on NPM
npm publish --tag beta --access public

echo ""
echo "✓ Successfully published collagility@0.1.1-beta.1 to NPM!"
echo "  Install globally:  npm install -g collagility@beta"
echo "  Run via npx:       npx collagility@beta start"
