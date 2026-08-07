#!/usr/bin/env bash
set -e

# Collagility NPM Pre-release Beta Publisher
# Releases collagility under the 'beta' dist-tag on NPM

echo "========================================="
echo "  Publishing Collagility 0.1.5"
echo "========================================="

if [ "$1" != "--skip-build" ]; then
  echo "1. Building monorepo..."
  pnpm build
  chmod +x apps/cli/dist/main.js
fi

echo "2. Publishing collagility to NPM under the 'beta' dist-tag..."
cd apps/cli
OTP="$1"
if [ "$1" = "--skip-build" ]; then
  OTP="$2"
fi

if [ -n "$OTP" ]; then
  npm publish --tag beta --access public --otp="$OTP"
else
  npm publish --tag beta --access public
fi

echo ""
echo "✓ Successfully published collagility@beta to NPM!"
echo "  Install globally:  npm install -g collagility@beta"
echo "  Run via npx:       npx collagility@beta start"
