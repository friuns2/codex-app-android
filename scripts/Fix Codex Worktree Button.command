#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TARGET_SCRIPT="$SCRIPT_DIR/fix-codex-worktree-button.sh"

if [[ ! -x "$TARGET_SCRIPT" ]]; then
  echo "Error: script not found or not executable: $TARGET_SCRIPT"
  read -r -p "Press Enter to close..." _
  exit 1
fi

cd "$SCRIPT_DIR"
"$TARGET_SCRIPT"

read -r -p "Done. Press Enter to close..." _
