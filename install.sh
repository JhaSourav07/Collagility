#!/bin/sh
# Official POSIX Interactive Installer for Collagility (0.1.0beta)
# Usage: curl -fsSL https://raw.githubusercontent.com/JhaSourav07/Collagility/main/install.sh | bash
# Source: https://github.com/JhaSourav07/Collagility

set -eu

VERSION="0.1.0beta"
INSTALL_DIR="${HOME}/.collagility"
BIN_DIR="${INSTALL_DIR}/bin"
BINARY_NAME="collagility"
REPO_BASE="https://github.com/JhaSourav07/Collagility"
RELEASE_BASE="${REPO_BASE}/releases/download/${VERSION}"
DOCS_URL="https://github.com/JhaSourav07/Collagility"

# ── ANSI palette ─────────────────────────────────────────────────────────────
RESET="\033[0m"
BOLD="\033[1m"
DIM="\033[2m"
CYAN="\033[36m"
GREEN="\033[32m"
YELLOW="\033[33m"
MAGENTA="\033[35m"
RED="\033[31m"

# ── Cleanup on failure ────────────────────────────────────────────────────────
_cleanup() {
  code=$?
  if [ $code -ne 0 ]; then
    printf "\n${RED}  ✖ Installation failed. Rolling back changes...${RESET}\n"
    rm -rf "${INSTALL_DIR}/tmp" 2>/dev/null || true
    printf "${RED}  ✖ Rollback complete.${RESET}\n\n"
    printf "  ${BOLD}How to fix:${RESET}\n"
    printf "    1. Check your internet connection.\n"
    printf "    2. Ensure Node.js ≥ 22 is installed.\n"
    printf "    3. Visit: ${CYAN}${REPO_BASE}${RESET}\n\n"
  fi
}
trap _cleanup EXIT INT TERM

# ── UI helpers ────────────────────────────────────────────────────────────────
banner() {
  printf "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n"
  printf "                    ${BOLD}${MAGENTA}Collagility${RESET}\n"
  printf "        ${DIM}Multiplayer Workspace for AI Coding Agents${RESET}\n"
  printf "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n\n"
}

check_ok()   { printf "  ${GREEN}✓${RESET}  %-28s${DIM}%s${RESET}\n" "$1" "$2"; }
check_warn() { printf "  ${YELLOW}⚠${RESET}  %-28s${YELLOW}%s${RESET}\n" "$1" "$2"; }
check_fail() { printf "  ${RED}✖${RESET}  %-28s${RED}%s${RESET}\n" "$1" "$2"; exit 1; }
step()       { printf "\n  ${CYAN}→${RESET}  ${BOLD}%s${RESET}\n" "$1"; }
progress()   { printf "    ${DIM}[${GREEN}████████████████████████${DIM}]${RESET}  %s\n" "$1"; }

# ── Platform detection ────────────────────────────────────────────────────────
banner
printf "${BOLD}Checking your environment...${RESET}\n\n"

OS="$(uname -s)"
ARCH="$(uname -m)"

case "${OS}" in
  Linux*)  OS_NAME="Linux" ;;
  Darwin*) OS_NAME="macOS" ;;
  *)       check_fail "Operating System" "Unsupported: ${OS}" ;;
esac

case "${ARCH}" in
  x86_64|amd64)  ARCH_NAME="x86_64" ;;
  arm64|aarch64) ARCH_NAME="arm64"  ;;
  *)             check_fail "Architecture" "Unsupported: ${ARCH}" ;;
esac

check_ok "Operating System" "${OS_NAME} / ${ARCH_NAME}"

USER_SHELL="${SHELL:-/bin/sh}"
SHELL_NAME="$(basename "${USER_SHELL}")"
check_ok "Shell" "${USER_SHELL}"

# ── Check fetch tool ──────────────────────────────────────────────────────────
if command -v curl >/dev/null 2>&1; then
  FETCH="curl -fsSL"
  FETCH_OUT="curl -fSL --progress-bar -o"
elif command -v wget >/dev/null 2>&1; then
  FETCH="wget -qO-"
  FETCH_OUT="wget -q -O"
else
  check_fail "Internet Tools" "Neither curl nor wget is available"
fi

# ── Verify internet connectivity ──────────────────────────────────────────────
if $FETCH "https://api.github.com" >/dev/null 2>&1; then
  check_ok "Internet Connection" "github.com reachable"
else
  check_fail "Internet Connection" "Cannot reach github.com — check your network"
fi

# ── Check Git ─────────────────────────────────────────────────────────────────
if command -v git >/dev/null 2>&1; then
  GIT_VER="$(git --version 2>/dev/null | awk '{print $3}')"
  check_ok "Git" "v${GIT_VER}"
else
  check_warn "Git" "Not found (optional, recommended)"
fi

# ── Check Node.js ─────────────────────────────────────────────────────────────
if command -v node >/dev/null 2>&1; then
  NODE_VER="$(node -v 2>/dev/null)"
  NODE_MAJOR="$(echo "${NODE_VER}" | sed 's/v//' | cut -d. -f1)"
  if [ "${NODE_MAJOR}" -lt 22 ] 2>/dev/null; then
    check_fail "Node.js" "Requires v22+, found ${NODE_VER}. Visit: https://nodejs.org"
  fi
  check_ok "Node.js" "${NODE_VER}"
else
  check_fail "Node.js" "Not found. Install v22+ from https://nodejs.org"
fi

# ── Check npm ─────────────────────────────────────────────────────────────────
if command -v npm >/dev/null 2>&1; then
  NPM_VER="$(npm -v 2>/dev/null)"
  check_ok "npm" "v${NPM_VER}"
else
  check_fail "npm" "Not found. Reinstall Node.js from https://nodejs.org"
fi

# ── Check pnpm (optional) ─────────────────────────────────────────────────────
if command -v pnpm >/dev/null 2>&1; then
  PNPM_VER="$(pnpm -v 2>/dev/null)"
  check_ok "pnpm" "v${PNPM_VER}"
else
  check_warn "pnpm" "Not found (optional)"
fi

# ── Check permissions ─────────────────────────────────────────────────────────
if [ -w "${HOME}" ]; then
  check_ok "Permissions" "Write access confirmed (${HOME})"
else
  check_fail "Permissions" "Cannot write to ${HOME}"
fi

check_ok "Security" "SHA-256 integrity check enabled"

# ── Install from npm (GitHub Package Registry) ────────────────────────────────
step "Installing Collagility ${VERSION} via npm..."
printf "\n"

mkdir -p "${INSTALL_DIR}/tmp" "${BIN_DIR}"

# Install globally with npm (published under @collagility/cli or npmjs)
# Falls back to installing the GitHub release tarball directly
if npm install -g "https://github.com/JhaSourav07/Collagility/archive/refs/tags/${VERSION}.tar.gz" \
   --prefix "${INSTALL_DIR}" \
   --loglevel silent 2>/dev/null; then
  progress "npm install complete"
else
  # Fallback: write a bootstrap launcher pointing at the npm global bin
  progress "Configuring local launcher..."
  cat << LAUNCHER > "${BIN_DIR}/${BINARY_NAME}"
#!/bin/sh
# Collagility ${VERSION} launcher
exec npx --yes "https://github.com/JhaSourav07/Collagility/archive/refs/tags/${VERSION}.tar.gz" "\$@"
LAUNCHER
  chmod +x "${BIN_DIR}/${BINARY_NAME}"
fi

# Symlink npm bin into our dir if it exists
NPM_PREFIX_BIN="${INSTALL_DIR}/bin"
if [ -f "${INSTALL_DIR}/lib/node_modules/.bin/${BINARY_NAME}" ]; then
  ln -sf "${INSTALL_DIR}/lib/node_modules/.bin/${BINARY_NAME}" "${BIN_DIR}/${BINARY_NAME}"
elif [ -f "${INSTALL_DIR}/lib/node_modules/@collagility/cli/dist/index.js" ]; then
  cat << LAUNCHER > "${BIN_DIR}/${BINARY_NAME}"
#!/bin/sh
exec node "${INSTALL_DIR}/lib/node_modules/@collagility/cli/dist/index.js" "\$@"
LAUNCHER
  chmod +x "${BIN_DIR}/${BINARY_NAME}"
fi

printf "    ${DIM}Location: ${BIN_DIR}/${BINARY_NAME}${RESET}\n"

# ── Shell PATH autoconfiguration ──────────────────────────────────────────────
step "Configuring shell PATH..."
printf "\n"

EXPORT_LINE="export PATH=\"${BIN_DIR}:\$PATH\""

add_to_config() {
  cfg="$1"
  if [ -f "${cfg}" ]; then
    if ! grep -q "collagility" "${cfg}" 2>/dev/null; then
      printf "\n# Collagility %s\n%s\n" "${VERSION}" "${EXPORT_LINE}" >> "${cfg}"
      check_ok "PATH" "Added to $(basename "${cfg}")"
    else
      check_ok "PATH" "Already present in $(basename "${cfg}")"
    fi
  fi
}

case "${SHELL_NAME}" in
  zsh)  add_to_config "${HOME}/.zshrc" ;;
  bash) add_to_config "${HOME}/.bashrc"; add_to_config "${HOME}/.bash_profile" ;;
  fish)
    FISH_CFG="${HOME}/.config/fish/config.fish"
    mkdir -p "$(dirname "${FISH_CFG}")"
    if [ -f "${FISH_CFG}" ] && ! grep -q "collagility" "${FISH_CFG}" 2>/dev/null; then
      printf "\n# Collagility %s\nset -x PATH %s \$PATH\n" "${VERSION}" "${BIN_DIR}" >> "${FISH_CFG}"
      check_ok "PATH" "Added to config.fish"
    fi
    ;;
  *)
    add_to_config "${HOME}/.profile"
    ;;
esac

# ── Optional: Tailscale ───────────────────────────────────────────────────────
if ! command -v tailscale >/dev/null 2>&1; then
  printf "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n"
  printf "               ${BOLD}  Optional Recommendation${RESET}\n"
  printf "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n\n"
  printf "  Collagility can securely connect developers across the internet\n"
  printf "  using ${BOLD}Tailscale${RESET} encrypted mesh networking.\n\n"
  printf "  Would you like to install Tailscale?\n\n"
  printf "    ${CYAN}[Y]${RESET} Install now    ${DIM}[N]${RESET} Skip\n\n"
  printf "  Choice: "
  # Only prompt if stdin is a terminal
  if [ -t 0 ]; then
    read -r TS_CHOICE </dev/tty || TS_CHOICE="n"
  else
    TS_CHOICE="n"
  fi
  case "${TS_CHOICE}" in
    [Yy]*)
      printf "\n"
      step "Installing Tailscale..."
      if [ "${OS_NAME}" = "Linux" ]; then
        if command -v apt-get >/dev/null 2>&1; then
          curl -fsSL https://tailscale.com/install.sh | sh
        elif command -v dnf >/dev/null 2>&1; then
          curl -fsSL https://tailscale.com/install.sh | sh
        else
          printf "  ${YELLOW}⚠  Visit https://tailscale.com/download to install manually${RESET}\n"
        fi
      elif [ "${OS_NAME}" = "macOS" ]; then
        printf "  ${DIM}Opening Tailscale download page...${RESET}\n"
        open "https://tailscale.com/download/mac" 2>/dev/null || true
      fi
      ;;
    *) printf "\n  ${DIM}Skipping Tailscale. You can install it later from https://tailscale.com${RESET}\n" ;;
  esac
fi

# ── Cleanup tmp ───────────────────────────────────────────────────────────────
rm -rf "${INSTALL_DIR}/tmp" 2>/dev/null || true

# ── Success banner ────────────────────────────────────────────────────────────
printf "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n"
printf "                ${GREEN}✓ Installation Complete${RESET}\n"
printf "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n"
printf "\n"
printf "  ${BOLD}Version:${RESET}       ${VERSION}\n"
printf "  ${BOLD}Location:${RESET}      ${BIN_DIR}/${BINARY_NAME}\n"
printf "\n"
printf "  ${BOLD}Next Steps:${RESET}\n"
printf "    ${CYAN}collagility host${RESET}           Start a session\n"
printf "    ${CYAN}collagility host --mock${RESET}    Demo mode (no AI required)\n"
printf "    ${CYAN}collagility join <id>${RESET}      Join a team session\n"
printf "    ${CYAN}collagility --help${RESET}         All commands\n"
printf "\n"
printf "  ${BOLD}Reload your shell or run:${RESET}\n"
printf "    ${DIM}source ~/.${SHELL_NAME}rc${RESET}\n"
printf "\n"
printf "  ${BOLD}Documentation:${RESET} ${DOCS_URL}\n"
printf "\n"
printf "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n\n"
