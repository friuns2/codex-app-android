#!/usr/bin/env bash
set -euo pipefail

###############################################################################
# fix-codex-worktree-button.sh
#
# Workaround for Codex.app bug where the "New worktree" button disappears
# after switching accounts.
#
# Root cause: The Statsig SDK's network requests are proxied through Electron
# IPC (the renderer can't make direct HTTP requests). When the SDK fails to
# fetch evaluations (e.g. after an account switch race), feature gate 505458
# stays false permanently because the store never gets repopulated.
#
# Fix: Launch Codex.app with Chrome DevTools Protocol enabled, then inject
# the gate value directly into the Statsig evaluation store via CDP.
# No restart required - the fix is applied live to the running app.
###############################################################################

CODEX_APP="/Applications/Codex.app"
CDP_PORT="${CDP_PORT:-9339}"
MAX_WAIT=30

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

DRY_RUN=0

usage() {
  cat <<'EOF'
Usage: fix-codex-worktree-button.sh [OPTIONS]

Fix the missing "New worktree" button in Codex.app by injecting the
feature gate value via Chrome DevTools Protocol.

Options:
  --dry-run           Show what would be done without doing it
  --port PORT         CDP port to use (default: 9339)
  -h, --help          Show this help
EOF
}

while (( $# )); do
  case "$1" in
    --dry-run)       DRY_RUN=1; shift ;;
    --port)          CDP_PORT="$2"; shift 2 ;;
    -h|--help)       usage; exit 0 ;;
    *)               echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
done

if [[ ! -d "$CODEX_APP" ]]; then
  echo -e "${RED}Codex.app not found at $CODEX_APP${NC}" >&2
  exit 1
fi

echo -e "${YELLOW}=== Codex.app Worktree Button Fix (CDP Injection) ===${NC}"
echo ""

###############################################################################
# Step 1: Ensure Codex.app is running with CDP enabled
###############################################################################
echo -e "${YELLOW}[1/3] Ensuring Codex.app is running with CDP...${NC}"

codex_running=0
cdp_available=0

if pgrep -x "Codex" >/dev/null 2>&1; then
  codex_running=1
  # Check if CDP is already available on our port
  if curl -fsS "http://127.0.0.1:${CDP_PORT}/json/version" >/dev/null 2>&1; then
    cdp_available=1
    echo -e "  ${GREEN}Codex.app already running with CDP on port ${CDP_PORT}${NC}"
  else
    echo "  Codex.app is running but CDP not available on port ${CDP_PORT}"
    echo "  Restarting with CDP enabled..."
    if [[ "$DRY_RUN" -eq 1 ]]; then
      echo "  (dry-run) Would restart Codex.app with --remote-debugging-port=${CDP_PORT}"
    else
      osascript -e 'tell application "Codex" to quit' 2>/dev/null || true
      sleep 2
      if pgrep -x "Codex" >/dev/null 2>&1; then
        pkill -x "Codex" 2>/dev/null || true
        sleep 1
      fi
      codex_running=0
    fi
  fi
fi

if [[ "$codex_running" -eq 0 && "$DRY_RUN" -eq 0 ]]; then
  # Find a free port if the default is busy
  while lsof -i :"$CDP_PORT" >/dev/null 2>&1; do
    CDP_PORT=$((CDP_PORT + 1))
  done

  echo "  Launching Codex.app with CDP on port ${CDP_PORT}..."
  "$CODEX_APP/Contents/MacOS/Codex" --remote-debugging-port="$CDP_PORT" &>/dev/null &
  disown

  echo "  Waiting for app to initialize..."
  waited=0
  while ! curl -fsS "http://127.0.0.1:${CDP_PORT}/json/list" >/dev/null 2>&1; do
    sleep 1
    waited=$((waited + 1))
    if [[ "$waited" -ge "$MAX_WAIT" ]]; then
      echo -e "  ${RED}Timed out waiting for CDP (${MAX_WAIT}s)${NC}" >&2
      exit 1
    fi
  done
  # Extra wait for React to mount
  sleep 3
  echo -e "  ${GREEN}Codex.app ready (waited ${waited}s)${NC}"
fi

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo ""
  echo -e "${YELLOW}[2/3] (dry-run) Would inject gate 505458=true via CDP${NC}"
  echo -e "${YELLOW}[3/3] (dry-run) Would verify worktree button appears${NC}"
  echo ""
  echo -e "${GREEN}Done (dry-run).${NC}"
  exit 0
fi

###############################################################################
# Step 2: Get CDP page target and inject gate value
###############################################################################
echo ""
echo -e "${YELLOW}[2/3] Injecting feature gate 505458 via CDP...${NC}"

PAGE_ID=$(curl -fsS "http://127.0.0.1:${CDP_PORT}/json/list" | python3 -c "
import json, sys
targets = json.load(sys.stdin)
for t in targets:
    if t.get('type') == 'page':
        print(t['webSocketDebuggerUrl'])
        break
")

if [[ -z "$PAGE_ID" ]]; then
  echo -e "  ${RED}No page target found via CDP${NC}" >&2
  exit 1
fi
echo "  CDP target: ${PAGE_ID##*/}"

# JavaScript to inject into the running app
INJECT_JS=$(cat <<'JSEOF'
(function() {
  var sg = window.__STATSIG__;
  if (!sg) return JSON.stringify({error: "Statsig not found"});

  var instKeys = Object.keys(sg.instances || {});
  if (instKeys.length === 0) return JSON.stringify({error: "No Statsig instances"});

  var inst = sg.instances[instKeys[0]];
  var store = inst._store;
  var result = {steps: []};

  // Check current gate state
  var currentGate = inst.checkGate("505458");
  result.gateBefore = currentGate;

  if (currentGate === true) {
    result.status = "already_enabled";
    return JSON.stringify(result);
  }

  // Step A: If store has no values, inject them
  if (!store._values) {
    var evalData = {
      feature_gates: {"505458": {value: true, rule_id: "fix_override", name: "505458", secondary_exposures: []}},
      dynamic_configs: {}, layer_configs: {}, layers: {},
      has_updates: true, time: Date.now()
    };
    var setResult = store.setValues({
      data: JSON.stringify(evalData),
      source: "Network",
      receivedAt: Date.now()
    });
    result.steps.push("injected_values: " + setResult);
  } else {
    // Store has values but gate is false - need to add gate to existing values
    var container = store._values;
    if (container._values && container._values.feature_gates) {
      container._values.feature_gates["505458"] = {value: true, rule_id: "fix_override", name: "505458", secondary_exposures: []};
      result.steps.push("added_gate_to_existing_values");
    }
  }

  // Step B: Clear memoization cache
  if (inst._memoCache && typeof inst._memoCache === "object") {
    for (var k in inst._memoCache) {
      delete inst._memoCache[k];
    }
    result.steps.push("cleared_memo_cache");
  }

  // Step C: Fire values_updated listeners
  if (inst._listeners && inst._listeners["values_updated"]) {
    var listeners = inst._listeners["values_updated"];
    for (var fn of listeners) {
      try { fn({name: "values_updated"}); } catch(e) {}
    }
    result.steps.push("fired_" + listeners.length + "_listeners");
  }

  // Verify
  var newGate = inst.checkGate("505458");
  result.gateAfter = newGate;
  result.status = newGate ? "fixed" : "failed";

  return JSON.stringify(result);
})()
JSEOF
)

# Use Python to send CDP command via WebSocket
RESULT=$(python3 <<PYEOF
import json, ssl, asyncio

async def main():
    try:
        import websockets
    except ImportError:
        import subprocess, sys
        subprocess.check_call([sys.executable, "-m", "pip", "install", "websockets", "-q"])
        import websockets

    ws_url = "$PAGE_ID"
    async with websockets.connect(ws_url, max_size=10_000_000) as ws:
        msg = json.dumps({
            "id": 1,
            "method": "Runtime.evaluate",
            "params": {
                "expression": '''$INJECT_JS''',
                "returnByValue": True,
                "awaitPromise": False
            }
        })
        await ws.send(msg)
        resp = json.loads(await asyncio.wait_for(ws.recv(), timeout=10))
        result = resp.get("result", {}).get("result", {}).get("value", "{}")
        print(result)

asyncio.run(main())
PYEOF
)

echo "  Result: $RESULT"

STATUS=$(echo "$RESULT" | python3 -c "import json,sys; print(json.load(sys.stdin).get('status','unknown'))" 2>/dev/null || echo "unknown")

if [[ "$STATUS" == "fixed" || "$STATUS" == "already_enabled" ]]; then
  echo -e "  ${GREEN}Gate 505458 = true${NC}"
else
  echo -e "  ${RED}Injection may have failed (status: $STATUS)${NC}"
  echo "  Full result: $RESULT"
fi

###############################################################################
# Step 3: Verify worktree button appears in UI
###############################################################################
echo ""
echo -e "${YELLOW}[3/3] Verifying worktree button...${NC}"

sleep 1

VERIFY_JS=$(cat <<'JSEOF'
(function() {
  var sg = window.__STATSIG__;
  var inst = sg && sg.instances && sg.instances[Object.keys(sg.instances)[0]];
  var gateValue = inst ? inst.checkGate("505458") : null;

  // Check if the worktree option exists in any popover/dropdown or in the
  // mode selector component's React tree
  var bodyText = document.body.innerText || "";
  var hasWorktreeInDom = bodyText.includes("New worktree") || bodyText.includes("worktree");

  return JSON.stringify({
    gate505458: gateValue,
    worktreeInDom: hasWorktreeInDom
  });
})()
JSEOF
)

VERIFY=$(python3 <<PYEOF
import json, asyncio
import websockets

async def main():
    ws_url = "$PAGE_ID"
    async with websockets.connect(ws_url, max_size=10_000_000) as ws:
        msg = json.dumps({
            "id": 2,
            "method": "Runtime.evaluate",
            "params": {
                "expression": '''$VERIFY_JS''',
                "returnByValue": True
            }
        })
        await ws.send(msg)
        resp = json.loads(await asyncio.wait_for(ws.recv(), timeout=10))
        print(resp.get("result", {}).get("result", {}).get("value", "{}"))

asyncio.run(main())
PYEOF
)

GATE_OK=$(echo "$VERIFY" | python3 -c "import json,sys; print(json.load(sys.stdin).get('gate505458', False))" 2>/dev/null || echo "false")

echo "  Verification: $VERIFY"

if [[ "$GATE_OK" == "True" || "$GATE_OK" == "true" ]]; then
  echo ""
  echo -e "${GREEN}=== Fix applied successfully ===${NC}"
  echo ""
  echo "The 'New worktree' option should now appear in the composer mode"
  echo "dropdown (click 'Local' at the bottom of the composer)."
  echo ""
  echo "Note: If the button disappears again after another account switch,"
  echo "run this script again. Codex.app will keep its CDP port open."
else
  echo ""
  echo -e "${RED}Fix may not have applied correctly.${NC}"
  echo "Try closing and reopening Codex.app, then run this script again."
fi
