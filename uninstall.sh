#!/bin/sh
# Official Collagility Uninstaller (0.1.0beta)
# Usage: ./uninstall.sh  OR  curl -fsSL https://install.collagility.dev/uninstall | sh

set -eu

INSTALL_DIR="${HOME}/.collagility"
BIN_DIR="${INSTALL_DIR}/bin"

RESET="\033[0m"
BOLD="\033[1m"
DIM="\033[2m"
CYAN="\033[36m"
GREEN="\033[32m"
YELLOW="\033[33m"
RED="\033[31m"

printf "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n"
printf "                  ${BOLD}Collagility Uninstaller${RESET}\n"
printf "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n\n"

printf "  This will remove:\n"
printf "    ${DIM}${INSTALL_DIR}${RESET}\n\n"

printf "  Continue? ${CYAN}[y/N]${RESET} "

if [ -t 0 ]; then
  # Interactive terminal: read directly from terminal
  read -r CONFIRM </dev/tty || CONFIRM="n"
else
  # Piped / non-interactive: read from stdin
  read -r CONFIRM || CONFIRM="n"
fi

case "${CONFIRM}" in
  [Yy]*)
    printf "\n"

    if [ -d "${INSTALL_DIR}" ]; then
      rm -rf "${INSTALL_DIR}"
      printf "  ${GREEN}✓${RESET}  Removed ${INSTALL_DIR}\n"
    else
      printf "  ${YELLOW}⚠${RESET}  ${INSTALL_DIR} not found — already removed?\n"
    fi

    # Remove PATH lines from shell configs
    for cfg in "${HOME}/.bashrc" "${HOME}/.bash_profile" "${HOME}/.zshrc" "${HOME}/.profile"; do
      if [ -f "${cfg}" ] && grep -q "collagility" "${cfg}" 2>/dev/null; then
        # Remove collagility PATH block (2 lines: comment + export)
        sed -i '/# Collagility/d; /collagility.*PATH/d' "${cfg}" 2>/dev/null || true
        printf "  ${GREEN}✓${RESET}  Cleaned PATH entry from $(basename "${cfg}")\n"
      fi
    done

    # fish shell
    FISH_CFG="${HOME}/.config/fish/config.fish"
    if [ -f "${FISH_CFG}" ] && grep -q "collagility" "${FISH_CFG}" 2>/dev/null; then
      sed -i '/# Collagility/d; /collagility/d' "${FISH_CFG}" 2>/dev/null || true
      printf "  ${GREEN}✓${RESET}  Cleaned PATH entry from config.fish\n"
    fi

    printf "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n"
    printf "       ${GREEN}✓ Collagility has been completely removed.${RESET}\n"
    printf "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n\n"
    printf "  Reinstall anytime with:\n"
    printf "    ${DIM}curl -fsSL https://install.collagility.dev | sh${RESET}\n\n"
    ;;
  *)
    printf "\n  ${YELLOW}Uninstall cancelled.${RESET}\n\n"
    ;;
esac
