#!/usr/bin/env bash
# Collagility Installer Script
# Usage: curl -fsSL https://raw.githubusercontent.com/JhaSourav07/Collagility/main/install.sh | bash

set -euo pipefail

# Terminal colors
if [ -t 1 ]; then
  BOLD='\033[1m'
  CYAN='\033[0;36m'
  GREEN='\033[0;32m'
  YELLOW='\033[0;33m'
  RED='\033[0;31m'
  RESET='\033[0m'
else
  BOLD=''
  CYAN=''
  GREEN=''
  YELLOW=''
  RED=''
  RESET=''
fi

log_info() {
  echo -e "${CYAN}ℹ${RESET} $1"
}

log_success() {
  echo -e "${GREEN}✓${RESET} ${BOLD}$1${RESET}"
}

log_warn() {
  echo -e "${YELLOW}⚠️${RESET} $1"
}

log_error() {
  echo -e "${RED}✖ Error:${RESET} $1" >&2
}

cleanup() {
  if [ -n "${TMP_DIR:-}" ] && [ -d "$TMP_DIR" ]; then
    rm -rf "$TMP_DIR"
  fi
}
trap cleanup EXIT

echo -e "${BOLD}⚡ Collagility Installer${RESET}"
echo "=================================================="

# 1. Detect OS
OS_TYPE="$(uname -s)"
case "$OS_TYPE" in
  Linux)
    OS="linux"
    ;;
  Darwin)
    OS="macos"
    ;;
  *)
    log_error "Unsupported operating system: $OS_TYPE. Collagility supports Linux and macOS."
    exit 1
    ;;
esac

# 2. Detect CPU Architecture
ARCH_TYPE="$(uname -m)"
case "$ARCH_TYPE" in
  x86_64|amd64)
    ARCH="x64"
    ;;
  arm64|aarch64)
    ARCH="arm64"
    ;;
  *)
    log_error "Unsupported CPU architecture: $ARCH_TYPE. Collagility supports x64 and arm64."
    exit 1
    ;;
esac

log_info "Detected Platform: ${OS}-${ARCH}"

# 3. Verify Required Dependencies
if command -v curl >/dev/null 2>&1; then
  FETCH_CMD="curl -fsSL"
elif command -v wget >/dev/null 2>&1; then
  FETCH_CMD="wget -qO-"
else
  log_error "Neither curl nor wget was found. Please install curl or wget to proceed."
  exit 1
fi

if ! command -v tar >/dev/null 2>&1; then
  log_error "tar command is required but not installed."
  exit 1
fi

# 4. Fetch Latest Release Info from GitHub API
REPO="JhaSourav07/Collagility"
API_URL="https://api.github.com/repos/${REPO}/releases/latest"

log_info "Fetching latest release metadata from GitHub..."

RELEASE_JSON="$(curl -sSL -H "Accept: application/vnd.github+json" "$API_URL" || true)"

if [ -z "$RELEASE_JSON" ] || echo "$RELEASE_JSON" | grep -q '"message": "Not Found"'; then
  log_error "No published GitHub release found for ${REPO} yet."
  log_info "Please check https://github.com/${REPO}/releases or tag a release to build binaries."
  exit 1
fi

# Extract tag_name using grep/sed (no jq dependency required)
TAG_NAME="$(echo "$RELEASE_JSON" | grep -m1 '"tag_name":' | sed -E 's/.*"tag_name":[[:space:]]*"([^"]+)".*/\1/')"

if [ -z "$TAG_NAME" ]; then
  log_error "Could not determine latest release tag from GitHub API response."
  exit 1
fi

log_info "Latest Release: ${BOLD}${TAG_NAME}${RESET}"

# 5. Construct Download Asset URL
ASSET_NAME="collagility-${OS}-${ARCH}.tar.gz"
DOWNLOAD_URL="https://github.com/${REPO}/releases/download/${TAG_NAME}/${ASSET_NAME}"

log_info "Downloading asset: ${ASSET_NAME}..."

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

# 6. Extract Archive
log_info "Extracting binary..."
tar -xzf "$ARCHIVE_PATH" -C "$TMP_DIR"

EXTRACTED_BIN="${TMP_DIR}/collagility"
if [ ! -f "$EXTRACTED_BIN" ]; then
  log_error "Extraction failed. 'collagility' binary missing in release archive."
  exit 1
fi

# 7. Install to ~/.local/bin
INSTALL_DIR="$HOME/.local/bin"
mkdir -p "$INSTALL_DIR"

TARGET_BIN="${INSTALL_DIR}/collagility"
cp "$EXTRACTED_BIN" "$TARGET_BIN"
chmod +x "$TARGET_BIN"

log_success "Collagility installed successfully to ${TARGET_BIN}"

# 8. Check PATH configuration
if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
  echo ""
  log_warn "${INSTALL_DIR} is not currently in your PATH!"
  echo "Add it to your shell configuration to run 'collagility' directly:"
  echo ""
  echo -e "  ${BOLD}export PATH=\"\$HOME/.local/bin:\$PATH\"${RESET}"
  echo ""
  echo "Add the line above to your ~/.bashrc or ~/.zshrc file."
fi

echo ""
echo "=================================================="
log_success "Installation Complete!"
echo ""
echo "Start the control server:"
echo -e "  ${BOLD}collagility server start${RESET}"
echo ""
echo "Create a collaborative AI session:"
echo -e "  ${BOLD}collagility start${RESET}"
echo ""
