#!/usr/bin/env bash
set -e

# Collagility Installer for macOS & Linux
# Target Release: 0.1.1-beta.1

BOLD="\033[1m"
GREEN="\033[32m"
CYAN="\033[36m"
RED="\033[31m"
RESET="\033[0m"

echo -e "${CYAN}${BOLD}"
echo "  ⚡ Collagility 0.1.1-beta.1 Installer"
echo "  The Realtime Agentic Terminal for Collaborative AI Pair Programming"
echo -e "${RESET}\n"

# 1. Check Node.js runtime
if ! command -v node &> /dev/null; then
    echo -e "${RED}✖ Error: Node.js is not installed.${RESET}"
    echo "Please install Node.js (v18.0.0 or higher) from https://nodejs.org/ before running this installer."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d 'v' -f 2)
NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d '.' -f 1)

if [ "$NODE_MAJOR" -lt 18 ]; then
    echo -e "${RED}✖ Error: Node.js version v$NODE_VERSION is unsupported (>= v18 required).${RESET}"
    echo "Please upgrade Node.js from https://nodejs.org/ and try again."
    exit 1
fi

echo -e "${GREEN}✓ Node.js v$NODE_VERSION detected${RESET}"

# 2. Install collagility globally via NPM
echo -e "\n${BOLD}Installing collagility@0.1.1-beta.1 globally...${RESET}"
if command -v sudo &> /dev/null && [ "$EUID" -ne 0 ] && [ ! -w "$(npm config get prefix)/lib/node_modules" 2>/dev/null ]; then
    echo "Elevated permissions required for global NPM install:"
    sudo npm install -g collagility@0.1.1-beta.1
else
    npm install -g collagility@0.1.1-beta.1
fi

# 3. Verify installation
echo -e "\n${GREEN}${BOLD}✓ Installation Complete!${RESET}"
echo -e "\nVerifying installation..."
collagility version

echo -e "\nTo start a pair programming session, run:"
echo -e "  ${CYAN}collagility start${RESET}\n"
echo -e "To join an existing session, run:"
echo -e "  ${CYAN}collagility join <sessionId>@<host-ip>${RESET}\n"
