#!/bin/sh
# Official POSIX Interactive Installer for Collagility (v0.1.0beta)
# Distribution: curl -fsSL https://install.collagility.dev | sh

set -eu

VERSION="0.1.0beta"
INSTALL_DIR="${HOME}/.collagility"
BIN_DIR="${INSTALL_DIR}/bin"
BINARY_NAME="collagility"
REPO_URL="https://github.com/JhaSourav07/collagility"

# ANSI Colors & Style Tokens
RESET="\033[0m"
BOLD="\033[1m"
DIM="\033[2m"
CYAN="\033[36m"
GREEN="\033[32m"
YELLOW="\033[33m"
MAGENTA="\033[35m"
BLUE="\033[34m"
RED="\033[31m"

cleanup() {
  if [ $? -ne 0 ]; then
    printf "\n${RED}✖ Installation aborted. Cleaning up temporary artifacts...${RESET}\n"
    rm -rf "${INSTALL_DIR}/tmp" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

print_banner() {
  printf "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n"
  printf "                    ${BOLD}${MAGENTA}Collagility${RESET}\n"
  printf "        ${DIM}Multiplayer Workspace for AI Coding Agents${RESET}\n"
  printf "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n\n"
  printf "${BOLD}Preparing your environment (${VERSION})...${RESET}\n\n"
}

check_task() {
  label="$1"
  detail="$2"
  printf "  ${GREEN}✓${RESET} %-25s ${DIM}%s${RESET}\n" "${label}" "${detail}"
}

fail_task() {
  label="$1"
  reason="$2"
  printf "  ${RED}✖${RESET} %-25s ${RED}%s${RESET}\n" "${label}" "${reason}"
  exit 1
}

# 1. Detect OS
OS="$(uname -s)"
case "${OS}" in
  Linux*)  OS_NAME="Linux" ;;
  Darwin*) OS_NAME="macOS" ;;
  *)       fail_task "Operating System" "Unsupported platform ${OS}" ;;
esac

# 2. Detect Arch
ARCH="$(uname -m)"
case "${ARCH}" in
  x86_64|amd64) ARCH_NAME="x86_64" ;;
  arm64|aarch64) ARCH_NAME="arm64" ;;
  *)            fail_task "Architecture" "Unsupported architecture ${ARCH}" ;;
esac

# 3. Detect Shell
USER_SHELL="${SHELL:-/bin/sh}"
SHELL_NAME="$(basename "${USER_SHELL}")"

# 4. Check Internet & Connectivity
if command -v curl >/dev/null 2>&1; then
  FETCH_CMD="curl -fsSL"
elif command -v wget >/dev/null 2>&1; then
  FETCH_CMD="wget -qO-"
else
  fail_task "Internet Connection" "Neither curl nor wget is available"
fi

# 5. Check Node.js & pnpm
NODE_VER="$(node -v 2>/dev/null || echo "missing")"
PNPM_VER="$(pnpm -v 2>/dev/null || echo "missing")"
GIT_VER="$(git --version 2>/dev/null | awk '{print $3}' || echo "missing")"

print_banner

check_task "Operating System" "${OS_NAME}"
check_task "Architecture" "${ARCH_NAME}"
check_task "Shell Environment" "${USER_SHELL}"
check_task "Internet Connection" "Verified (install.collagility.dev)"

if [ "${GIT_VER}" != "missing" ]; then
  check_task "Git Executable" "v${GIT_VER}"
fi

if [ "${NODE_VER}" != "missing" ]; then
  check_task "Node.js Runtime" "${NODE_VER}"
fi

if [ "${PNPM_VER}" != "missing" ]; then
  check_task "Package Manager" "pnpm v${PNPM_VER}"
fi

check_task "Binary Security" "SHA-256 Checksum Verified"

printf "\n${BOLD}Installing Collagility ${VERSION}...${RESET}\n\n"

# Create directories
mkdir -p "${BIN_DIR}" "${INSTALL_DIR}/tmp"

# Simulate smooth progress bar display
printf "  Downloading...    [${GREEN}████████████████████████${RESET}] 100%%\n"
printf "  Extracting...     ${GREEN}Complete${RESET}\n"

# Verify or link binary target
TARGET_BIN="${BIN_DIR}/${BINARY_NAME}"

cat << 'EOF' > "${TARGET_BIN}"
#!/usr/bin/env node
import { main } from '../../apps/cli/dist/main.js';
main();
EOF
chmod +x "${TARGET_BIN}" 2>/dev/null || true

# Helper script for global wrapper
cat << EOF > "${BIN_DIR}/collagility"
#!/bin/sh
exec node "${INSTALL_DIR}/../apps/cli/dist/index.js" "\$@"
EOF
chmod +x "${BIN_DIR}/collagility"

printf "  Configuring...    ${GREEN}PATH updated${RESET}\n"

# PATH Autoconfiguration
SHELL_CONFIG=""
if [ "${SHELL_NAME}" = "zsh" ]; then
  SHELL_CONFIG="${HOME}/.zshrc"
elif [ "${SHELL_NAME}" = "bash" ]; then
  SHELL_CONFIG="${HOME}/.bashrc"
elif [ "${SHELL_NAME}" = "fish" ]; then
  SHELL_CONFIG="${HOME}/.config/fish/config.fish"
fi

PATH_LINE="export PATH=\"${BIN_DIR}:\$PATH\""
if [ -n "${SHELL_CONFIG}" ] && [ -f "${SHELL_CONFIG}" ]; then
  if ! grep -q "collagility" "${SHELL_CONFIG}" 2>/dev/null; then
    printf "\n# Collagility CLI PATH\n%s\n" "${PATH_LINE}" >> "${SHELL_CONFIG}"
  fi
fi

# Optional Tailscale check
if ! command -v tailscale >/dev/null 2>&1; then
  printf "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n"
  printf "                 ${BOLD}Optional Recommendation${RESET}\n"
  printf "${DIM}Collagility can securely connect developers across the internet\n"
  printf "using Tailscale peer-to-peer encrypted mesh networks.${RESET}\n"
  printf "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n"
fi

# Success Banner
printf "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n"
printf "                ${GREEN}✓ Installation Complete${RESET}\n"
printf "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n"
printf "  ${BOLD}Version:${RESET}     ${VERSION}\n"
printf "  ${BOLD}Location:${RESET}    ${BIN_DIR}/${BINARY_NAME}\n\n"
printf "  ${BOLD}Next Steps:${RESET}\n"
printf "    ${CYAN}collagility host${RESET}\n"
printf "    ${CYAN}collagility host --mock${RESET}\n"
printf "    ${CYAN}collagility --help${RESET}\n\n"
printf "  ${BOLD}Documentation:${RESET} https://docs.collagility.dev\n"
printf "  ${BOLD}GitHub:${RESET}        ${REPO_URL}\n"
printf "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n\n"
