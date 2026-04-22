#!/usr/bin/env bash
set -e

# Activate mise shims — new tools installed via `mise use -g` are available
# immediately without restart, because shim directory is already in PATH.
if command -v mise &>/dev/null; then
  eval "$(mise activate bash --shims)"
  mise install --yes 2>/dev/null || true
fi

# Ensure npm global bin is in PATH
NPM_GLOBAL_BIN="$(npm config get prefix 2>/dev/null)/bin"
export PATH="${NPM_GLOBAL_BIN}:${PATH}"

exec "$@"
