#!/bin/sh
# Automated Installer Verification Test Suite for Collagility (0.1.0beta)
# Usage: bash scripts/test-installer.sh

set -eu

CYAN="\033[36m"
GREEN="\033[32m"
RED="\033[31m"
RESET="\033[0m"
BOLD="\033[1m"
DIM="\033[2m"

PASS=0
FAIL=0

ok()   { printf "  ${GREEN}✓${RESET}  %s\n" "$1"; PASS=$((PASS+1)); }
fail() { printf "  ${RED}✖${RESET}  %s\n" "$1"; FAIL=$((FAIL+1)); }

printf "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n"
printf "       ${BOLD}Collagility Installer Verification Suite (0.1.0beta)${RESET}\n"
printf "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n\n"

# ── T1: install.sh existence & executable ─────────────────────────────────────
printf "${BOLD}Installer Integrity${RESET}\n"
if [ -f "./install.sh" ]; then
  ok "install.sh exists"
else
  fail "install.sh not found"
fi

if [ -x "./install.sh" ]; then
  ok "install.sh is executable"
else
  fail "install.sh is not executable"
fi

if [ -f "./uninstall.sh" ]; then
  ok "uninstall.sh exists"
else
  fail "uninstall.sh not found"
fi

if [ -f "./install.ps1" ]; then
  ok "install.ps1 exists"
else
  fail "install.ps1 not found"
fi

# ── T2: install.sh shebang & strict mode ─────────────────────────────────────
printf "\n${BOLD}install.sh Quality Checks${RESET}\n"
if head -1 ./install.sh | grep -q "#!/bin/sh"; then
  ok "Correct POSIX shebang (#!/bin/sh)"
else
  fail "Missing or incorrect shebang"
fi

if grep -q "set -eu" ./install.sh; then
  ok "Strict mode enabled (set -eu)"
else
  fail "Missing strict mode (set -eu)"
fi

if grep -q "trap" ./install.sh; then
  ok "Trap/cleanup handler present"
else
  fail "No trap/cleanup handler found"
fi

if grep -q "TAILSCALE\|tailscale" ./install.sh; then
  ok "Tailscale optional prompt present"
else
  fail "Tailscale prompt missing"
fi

if grep -q "\.zshrc\|\.bashrc\|\.profile\|config\.fish" ./install.sh; then
  ok "Shell PATH autoconfiguration present"
else
  fail "Shell PATH autoconfiguration missing"
fi

if grep -q "VERSION=" ./install.sh; then
  VER="$(grep 'VERSION=' ./install.sh | head -1 | sed 's/VERSION=//' | tr -d '"')"
  ok "Version declared: ${VER}"
else
  fail "VERSION not declared in install.sh"
fi

# ── T3: Version consistency ───────────────────────────────────────────────────
printf "\n${BOLD}Version Consistency (0.1.0beta)${RESET}\n"

check_version() {
  file="$1"
  if grep -q "0.1.0beta" "${file}" 2>/dev/null; then
    ok "$(basename "${file}") contains 0.1.0beta"
  else
    fail "$(basename "${file}") is missing 0.1.0beta"
  fi
}

check_version "./package.json"
check_version "./apps/cli/package.json"
check_version "./apps/cli/src/config/constants.ts"
check_version "./CHANGELOG.md"
check_version "./RELEASE_NOTES.md"
check_version "./INSTALL.md"

# ── T4: Documentation completeness ───────────────────────────────────────────
printf "\n${BOLD}Documentation Completeness${RESET}\n"

for doc in INSTALL.md CHANGELOG.md RELEASE_NOTES.md; do
  if [ -f "./${doc}" ] && [ -s "./${doc}" ]; then
    ok "${doc} present and non-empty"
  else
    fail "${doc} missing or empty"
  fi
done

if grep -q "collagility host" ./INSTALL.md; then
  ok "INSTALL.md documents 'collagility host'"
else
  fail "INSTALL.md missing 'collagility host'"
fi

if grep -q "0\.2\.0\|v0\.2\.0\|v0.2.0" ./RELEASE_NOTES.md; then
  ok "RELEASE_NOTES.md contains v0.2.0 roadmap"
else
  fail "RELEASE_NOTES.md missing v0.2.0 roadmap"
fi

# ── T5: CLI build artifact ────────────────────────────────────────────────────
printf "\n${BOLD}CLI Build Artifact${RESET}\n"

if [ -f "./apps/cli/dist/index.js" ]; then
  ok "CLI dist/index.js built and present"
else
  fail "CLI dist/index.js not built — run: pnpm --filter @collagility/cli build"
fi

if node ./apps/cli/dist/index.js --help >/dev/null 2>&1; then
  ok "CLI binary executes cleanly"
else
  fail "CLI binary execution failed"
fi

if node ./apps/cli/dist/index.js host --help 2>&1 | grep -q "start|host"; then
  ok "'collagility host' alias registered correctly"
else
  fail "'collagility host' alias not found in CLI help"
fi

# ── T6: install.sh dry-run ────────────────────────────────────────────────────
printf "\n${BOLD}Installer Dry-Run${RESET}\n"

# Run install.sh non-interactively via stdin=/dev/null (no tty prompts)
if sh ./install.sh </dev/null >/dev/null 2>&1; then
  ok "install.sh runs without error"
  if [ -d "${HOME}/.collagility/bin" ]; then
    ok "~/.collagility/bin/ directory created"
  else
    fail "~/.collagility/bin/ was not created"
  fi
else
  fail "install.sh exited with non-zero status"
fi

# ── T7: uninstall.sh cleanup ─────────────────────────────────────────────────
printf "\n${BOLD}Uninstaller Dry-Run${RESET}\n"

# Answer "y" automatically to the uninstall prompt
if printf "y\n" | sh ./uninstall.sh >/dev/null 2>&1; then
  ok "uninstall.sh runs cleanly"
  if [ ! -d "${HOME}/.collagility" ]; then
    ok "~/.collagility/ cleaned up successfully"
  else
    fail "~/.collagility/ was NOT removed by uninstall.sh"
  fi
else
  fail "uninstall.sh exited with non-zero status"
fi

# ── Results ───────────────────────────────────────────────────────────────────
TOTAL=$((PASS+FAIL))
printf "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n"
if [ $FAIL -eq 0 ]; then
  printf "  ${GREEN}✓ All ${TOTAL} tests passed.${RESET}\n"
else
  printf "  ${RED}✖ ${FAIL}/${TOTAL} tests FAILED.${RESET}\n"
fi
printf "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n\n"

[ $FAIL -eq 0 ]
