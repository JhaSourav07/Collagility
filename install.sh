#!/usr/bin/env bash
# Collagility Installer Script
# Usage: curl -fsSL https://raw.githubusercontent.com/JhaSourav07/Collagility/main/install.sh | bash

set -euo pipefail

# Terminal colors & styling
if [ -t 1 ]; then
  BOLD='\033[1m'
  DIM='\033[2m'
  BLUE='\033[0;34m'
  CYAN='\033[0;36m'
  GREEN='\033[0;32m'
  MAGENTA='\033[0;35m'
  YELLOW='\033[0;33m'
  RED='\033[0;31m'
  RESET='\033[0m'
else
  BOLD=''
  DIM=''
  BLUE=''
  CYAN=''
  GREEN=''
  MAGENTA=''
  YELLOW=''
  RED=''
  RESET=''
fi

log_step() {
  echo -e "\n${MAGENTA}❯${RESET} ${BOLD}$1${RESET}"
}

log_info() {
  echo -e "  ${CYAN}ℹ${RESET} $1"
}

log_success() {
  echo -e "  ${GREEN}✔${RESET} $1"
}

log_warn() {
  echo -e "  ${YELLOW}⚠️${RESET} $1"
}

log_error() {
  echo -e "  ${RED}✖ Error:${RESET} $1" >&2
}

cleanup() {
  if [ -n "${TMP_DIR:-}" ] && [ -d "$TMP_DIR" ]; then
    rm -rf "$TMP_DIR"
  fi
}
trap cleanup EXIT

# -------------------------------------------------------------------
# Header Banner
# -------------------------------------------------------------------
echo ""
echo -e "${CYAN}${BOLD}   ____ _____ _     _        _    ____ ___ _     ___ _____ __   __${RESET}"
echo -e "${CYAN}${BOLD}  / ___/ _ \\ |   | |      / \\  / ___|_ _| |   |_ _|_   _\\ \\ / /${RESET}"
echo -e "${BLUE}${BOLD} | |  | | | | |   | |     / _ \\| |  _ | || |    | |  | |   \\ V / ${RESET}"
echo -e "${BLUE}${BOLD} | |__| |_| | |___| |___ / ___ \\ |_| || || |___ | |  | |    | |  ${RESET}"
echo -e "${MAGENTA}${BOLD}  \\____\\___/|_____|_____/_/   \\_\\____|___|_____|___| |_|    |_|  ${RESET}"
echo -e " ${DIM}Realtime Collaborative AI Coding & Session Control Plane${RESET}"
echo -e " ${DIM}-------------------------------------------------------${RESET}"


# 1. Platform Detection
log_step "[1/5] Detecting Platform & Architecture"

OS_TYPE="$(uname -s)"
case "$OS_TYPE" in
  Linux)
    OS="linux"
    OS_NAME="Linux"
    ;;
  Darwin)
    OS="macos"
    OS_NAME="macOS"
    ;;
  *)
    log_error "Unsupported operating system: $OS_TYPE. Collagility supports Linux and macOS."
    exit 1
    ;;
esac

ARCH_TYPE="$(uname -m)"
case "$ARCH_TYPE" in
  x86_64|amd64)
    ARCH="x64"
    ARCH_NAME="x64 (64-bit)"
    ;;
  arm64|aarch64)
    ARCH="arm64"
    ARCH_NAME="ARM64 (Apple Silicon / AArch64)"
    ;;
  *)
    log_error "Unsupported CPU architecture: $ARCH_TYPE. Collagility supports x64 and arm64."
    exit 1
    ;;
esac

log_success "Target Platform: ${BOLD}${OS_NAME} (${ARCH_NAME})${RESET}"

# 2. Dependency Verification
log_step "[2/5] Verifying System Dependencies"

if command -v curl >/dev/null 2>&1; then
  FETCH_CMD="curl -fsSL"
  log_success "HTTP Client: ${BOLD}curl${RESET}"
elif command -v wget >/dev/null 2>&1; then
  FETCH_CMD="wget -qO-"
  log_success "HTTP Client: ${BOLD}wget${RESET}"
else
  log_error "Neither curl nor wget was found. Please install curl or wget."
  exit 1
fi

if command -v tar >/dev/null 2>&1; then
  log_success "Archive Tool: ${BOLD}tar${RESET}"
else
  log_error "tar command is required but not installed."
  exit 1
fi

# 3. Fetch Release Metadata
log_step "[3/5] Resolving Latest Release from GitHub"

REPO="JhaSourav07/Collagility"
API_URL="https://api.github.com/repos/${REPO}/releases/latest"

log_info "Fetching release metadata from ${CYAN}https://github.com/${REPO}${RESET}..."

RELEASE_JSON="$(curl -sSL -H "Accept: application/vnd.github+json" "$API_URL" || true)"

if [ -z "$RELEASE_JSON" ] || echo "$RELEASE_JSON" | grep -q '"message": "Not Found"'; then
  API_URL="https://api.github.com/repos/${REPO}/releases"
  RELEASE_JSON="$(curl -sSL -H "Accept: application/vnd.github+json" "$API_URL" || true)"
fi

if [ -z "$RELEASE_JSON" ] || echo "$RELEASE_JSON" | grep -q '"message": "Not Found"'; then
  log_error "No published GitHub release found for ${REPO}."
  log_info "Check release status at https://github.com/${REPO}/releases"
  exit 1
fi

TAG_NAME="$(echo "$RELEASE_JSON" | grep -m1 '"tag_name":' | sed -E 's/.*"tag_name":[[:space:]]*"([^"]+)".*/\1/')"

if [ -z "$TAG_NAME" ]; then
  log_error "Could not determine release version tag from GitHub API response."
  exit 1
fi

log_success "Latest Version: ${BOLD}${GREEN}${TAG_NAME}${RESET}"

# 4. Download Release Asset
log_step "[4/5] Downloading Release Asset"

ASSET_NAME="collagility-${OS}-${ARCH}.tar.gz"
DOWNLOAD_URL="https://github.com/${REPO}/releases/download/${TAG_NAME}/${ASSET_NAME}"

log_info "Downloading ${CYAN}${ASSET_NAME}${RESET}..."

TMP_DIR="$(mktemp -d)"
ARCHIVE_PATH="${TMP_DIR}/${ASSET_NAME}"

if command -v curl >/dev/null 2>&1; then
  curl -fsSL "$DOWNLOAD_URL" -o "$ARCHIVE_PATH"
else
  wget -q "$DOWNLOAD_URL" -O "$ARCHIVE_PATH"
fi

if [ ! -f "$ARCHIVE_PATH" ]; then
  log_error "Download failed. Asset not found at ${DOWNLOAD_URL}"
  exit 1
fi

log_success "Package downloaded successfully."

# 5. Extract & Install Executable
log_step "[5/5] Installing Standalone Executable"

log_info "Extracting package contents..."
tar -xzf "$ARCHIVE_PATH" -C "$TMP_DIR"

EXTRACTED_BIN="${TMP_DIR}/collagility"
if [ ! -f "$EXTRACTED_BIN" ]; then
  log_error "Extraction failed. 'collagility' binary missing in archive."
  exit 1
fi

INSTALL_DIR="$HOME/.local/bin"
mkdir -p "$INSTALL_DIR"

TARGET_BIN="${INSTALL_DIR}/collagility"
cp "$EXTRACTED_BIN" "$TARGET_BIN"
chmod +x "$TARGET_BIN"

log_success "Binary installed to ${BOLD}${GREEN}${TARGET_BIN}${RESET}"

# -------------------------------------------------------------------
# Installation Summary & Next Steps
# -------------------------------------------------------------------
echo ""
echo -e "${GREEN}${BOLD}=======================================================${RESET}"
echo -e "${GREEN}${BOLD}  ✨ Collagility ${TAG_NAME} Installed Successfully!${RESET}"
echo -e "${GREEN}${BOLD}=======================================================${RESET}"
echo ""

if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
  log_warn "${BOLD}${INSTALL_DIR}${RESET} is not in your current PATH environment variable."
  echo ""
  echo -e "  To enable 'collagility' command globally, add this to your shell config (${CYAN}~/.bashrc${RESET} or ${CYAN}~/.zshrc${RESET}):"
  echo -e "    ${BOLD}${CYAN}export PATH=\"\$HOME/.local/bin:\$PATH\"${RESET}"
  echo ""
fi

echo -e "${BOLD}🚀 Quick Start Guide:${RESET}"
echo ""
echo -e "  ${DIM}1. Start the local control server:${RESET}"
echo -e "     ${BOLD}${CYAN}collagility server start${RESET}"
echo ""
echo -e "  ${DIM}2. Create and host a collaborative AI session:${RESET}"
echo -e "     ${BOLD}${CYAN}collagility start${RESET}"
echo ""
echo -e "  ${DIM}3. Check server health status:${RESET}"
echo -e "     ${BOLD}${CYAN}collagility server status${RESET}"
echo ""
