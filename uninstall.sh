#!/bin/sh
# Official Uninstaller Script for Collagility (v0.1.0beta)

set -eu

INSTALL_DIR="${HOME}/.collagility"
BIN_DIR="${INSTALL_DIR}/bin"

printf "\033[33mRemoving Collagility CLI (v0.1.0beta)...\033[0m\n"

if [ -d "${INSTALL_DIR}" ]; then
  rm -rf "${INSTALL_DIR}"
  printf "\033[32m✓ Removed ${INSTALL_DIR}\033[0m\n"
fi

printf "\n\033[32m✓ Collagility uninstalled successfully.\033[0m\n"
