#!/bin/sh
# Automated Installer Verification Test Suite for Collagility (v0.1.0beta)

set -eu

printf "\033[1;36mRunning Collagility Installer Verification Suite (v0.1.0beta)...\033[0m\n\n"

# 1. Test install.sh execution
printf "1. Testing install.sh execution...\n"
sh ./install.sh >/dev/null 2>&1
if [ -f "${HOME}/.collagility/bin/collagility" ]; then
  printf "   \033[32m✓ install.sh executed cleanly and created bin target\033[0m\n"
else
  printf "   \033[31m✖ install.sh failed to create binary\033[0m\n"
  exit 1
fi

# 2. Test uninstall.sh execution
printf "2. Testing uninstall.sh cleanup...\n"
sh ./uninstall.sh >/dev/null 2>&1
if [ ! -d "${HOME}/.collagility" ]; then
  printf "   \033[32m✓ uninstall.sh cleaned up installation directory\033[0m\n"
else
  printf "   \033[31m✖ uninstall.sh failed to cleanup directory\033[0m\n"
  exit 1
fi

printf "\n\033[1;32m✓ All Installer Verification Tests Passed!\033[0m\n"
