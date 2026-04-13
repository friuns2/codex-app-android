#!/usr/bin/env bash

set -euo pipefail

log() {
  printf '[codexapp-current-dir] %s\n' "$*" >&2
}

fail() {
  log "$*"
  exit 1
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing required command: $1"
}

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
repo_root="$(cd "${script_dir}/.." && pwd -P)"
launch_dir="$(pwd -P)"
codex_home="${CODEX_HOME:-${launch_dir}/.codex}"
local_entry="${repo_root}/dist-cli/index.js"
frontend_entry="${repo_root}/dist/index.html"
default_host="${CODEXUI_BIND_HOST:-127.0.0.1}"
default_port="${CODEXUI_PORT:-5999}"
default_tunnel_token_file="${repo_root}/.cloudflared-token"
default_password_file="${repo_root}/.codexui-password"

host="${default_host}"
port="${default_port}"
forward_tunnel=false
tunnel_token_file="${CODEXUI_TUNNEL_TOKEN_FILE:-${default_tunnel_token_file}}"
password_file="${CODEXUI_PASSWORD_FILE:-${default_password_file}}"
strict_local_auth=false

usage() {
  cat <<EOF
Usage: $(basename "${BASH_SOURCE[0]}") [--forward-tunnel] [--host HOST] [--port PORT] [--tunnel-token-file PATH] [--password-file PATH] [--strict-local-auth]

Options:
  --forward-tunnel           Start a named cloudflared tunnel alongside codexUI.
  --host HOST                codexUI listen host. Defaults to ${default_host}.
  --port PORT                codexUI listen port. Defaults to ${default_port}.
  --tunnel-token-file PATH   File containing the tunnel token. Defaults to ${default_tunnel_token_file}.
  --password-file PATH       File containing the codexUI password. Defaults to ${default_password_file}.
  --strict-local-auth        Require the codexUI password even for localhost requests.
  --no-strict-local-auth     Allow localhost requests without the codexUI password.
  -h, --help                 Show this help text.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --forward-tunnel)
      forward_tunnel=true
      shift
      ;;
    --no-forward-tunnel)
      forward_tunnel=false
      shift
      ;;
    --host)
      [[ $# -ge 2 ]] || fail "Missing value for --host"
      host="$2"
      shift 2
      ;;
    --port)
      [[ $# -ge 2 ]] || fail "Missing value for --port"
      port="$2"
      shift 2
      ;;
    --tunnel-token-file)
      [[ $# -ge 2 ]] || fail "Missing value for --tunnel-token-file"
      tunnel_token_file="$2"
      shift 2
      ;;
    --password-file)
      [[ $# -ge 2 ]] || fail "Missing value for --password-file"
      password_file="$2"
      shift 2
      ;;
    --strict-local-auth)
      strict_local_auth=true
      shift
      ;;
    --no-strict-local-auth)
      strict_local_auth=false
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      fail "Unknown argument: $1"
      ;;
  esac
done

need_cmd node
need_cmd npm

read_secret_value() {
  local file_path="$1"
  local token=""
  token="$(awk '
    /^[[:space:]]*#/ { next }
    {
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", $0)
      if (length($0) > 0) {
        print
        exit
      }
    }
  ' "${file_path}")"

  printf '%s' "${token}"
}

read_tunnel_token() {
  [[ -f "${tunnel_token_file}" ]] || fail "Tunnel token file not found: ${tunnel_token_file}"
  local token=""
  token="$(read_secret_value "${tunnel_token_file}")"
  [[ -n "${token}" ]] || fail "Tunnel token file is empty: ${tunnel_token_file}"
  printf '%s' "${token}"
}

read_password_value() {
  [[ -f "${password_file}" ]] || return 0
  read_secret_value "${password_file}"
}

cloudflared_supports_token_file() {
  cloudflared tunnel run --help 2>&1 | grep -q -- '--token-file'
}

export CODEX_HOME="${codex_home}"
export TELEGRAM_DEFAULT_CWD="${TELEGRAM_DEFAULT_CWD:-${launch_dir}}"
export CODEXUI_LAUNCH_SCOPE="${CODEXUI_LAUNCH_SCOPE:-${launch_dir}}"
export CODEXUI_REPO_ROOT="${CODEXUI_REPO_ROOT:-${repo_root}}"
export CODEXUI_SERENA_READY_DELAY_MS="${CODEXUI_SERENA_READY_DELAY_MS:-3000}"
export CODEXUI_SERENA_READY_TIMEOUT_MS="${CODEXUI_SERENA_READY_TIMEOUT_MS:-30000}"
export CODEXUI_SERENA_RETRY_DELAY_MS="${CODEXUI_SERENA_RETRY_DELAY_MS:-1500}"
export CODEXUI_SERENA_MAX_RETRIES="${CODEXUI_SERENA_MAX_RETRIES:-3}"
export http_proxy=http://127.0.0.1:9090

if [[ -z "${CODEXUI_SERENA_REPO_ROOT:-}" ]]; then
  if [[ -d "${launch_dir}/mcp/serena" ]]; then
    export CODEXUI_SERENA_REPO_ROOT="${launch_dir}/mcp/serena"
  elif [[ -d "${repo_root}/../serena" ]]; then
    export CODEXUI_SERENA_REPO_ROOT="$(cd "${repo_root}/../serena" && pwd -P)"
  fi
fi

proxy_url="${CODEXUI_PROXY_URL:-${http_proxy:-${HTTP_PROXY:-}}}"
if [[ -n "${proxy_url}" ]]; then
  export http_proxy="${proxy_url}"
  export https_proxy="${https_proxy:-${proxy_url}}"
  export HTTP_PROXY="${HTTP_PROXY:-${http_proxy}}"
  export HTTPS_PROXY="${HTTPS_PROXY:-${https_proxy}}"
fi

mkdir -p "${CODEX_HOME}"

deps_ready() {
  [[ -x "${repo_root}/node_modules/.bin/vue-tsc" ]] &&
    [[ -x "${repo_root}/node_modules/.bin/vite" ]] &&
    [[ -x "${repo_root}/node_modules/.bin/tsup" ]] &&
    [[ -f "${repo_root}/node_modules/vite/dist/client/client.mjs" ]] &&
    [[ -f "${repo_root}/node_modules/rollup/dist/shared/parseAst.js" ]]
}

install_deps() {
  local install_cmd=()

  if [[ -f "${repo_root}/package-lock.json" ]]; then
    install_cmd=(npm --prefix "${repo_root}" ci --include=dev)
  else
    install_cmd=(npm --prefix "${repo_root}" install --include=dev)
  fi

  log "Installing local codexUI dependencies"
  "${install_cmd[@]}"
}

build_local_app() {
  log "Building local codexUI frontend and CLI"
  (
    cd "${repo_root}"
    ./node_modules/.bin/vue-tsc --noEmit
    ./node_modules/.bin/vite build
    ./node_modules/.bin/tsup
  )
}

artifacts_stale() {
  [[ ! -f "${local_entry}" || ! -f "${frontend_entry}" ]] && return 0

  local stale=""
  stale="$(
    find \
      "${repo_root}/src" \
      "${repo_root}/public" \
      "${repo_root}/scripts" \
      -type f \
      \( -newer "${local_entry}" -o -newer "${frontend_entry}" \) \
      -print -quit 2>/dev/null || true
  )"
  [[ -n "${stale}" ]] && return 0

  local config_file=""
  for config_file in \
    "${repo_root}/package.json" \
    "${repo_root}/tsup.config.ts" \
    "${repo_root}/vite.config.ts" \
    "${repo_root}/vite.config.https.ts" \
    "${repo_root}/tsconfig.json" \
    "${repo_root}/tsconfig.node.json"
  do
    if [[ -f "${config_file}" && ( "${config_file}" -nt "${local_entry}" || "${config_file}" -nt "${frontend_entry}" ) ]]; then
      return 0
    fi
  done

  return 1
}

if ! deps_ready; then
  install_deps
fi

deps_ready || fail "Local dependencies are incomplete after install; inspect ${repo_root}/node_modules"

if artifacts_stale; then
  build_local_app
fi

[[ -f "${local_entry}" ]] || fail "Missing CLI build artifact: ${local_entry}"
[[ -f "${frontend_entry}" ]] || fail "Missing frontend build artifact: ${frontend_entry}"

ui_pid=""
tunnel_pid=""

cleanup() {
  trap - EXIT INT TERM

  if [[ -n "${tunnel_pid}" ]]; then
    kill "${tunnel_pid}" 2>/dev/null || true
  fi
  if [[ -n "${ui_pid}" ]]; then
    kill "${ui_pid}" 2>/dev/null || true
  fi

  if [[ -n "${tunnel_pid}" ]]; then
    wait "${tunnel_pid}" 2>/dev/null || true
  fi
  if [[ -n "${ui_pid}" ]]; then
    wait "${ui_pid}" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

password_value=""
if [[ "${forward_tunnel}" == true && "${strict_local_auth}" == false ]]; then
  strict_local_auth=true
  log "Enabling --strict-local-auth automatically because --forward-tunnel was requested"
fi

password_value="$(read_password_value)"
if [[ "${strict_local_auth}" == true ]]; then
  [[ -n "${password_value}" ]] || fail "Strict local auth requires a non-empty password file: ${password_file}"
fi

launch_args=("${local_entry}" "${launch_dir}" --host "${host}" --port "${port}" --no-login --no-open --no-tunnel)
if [[ -n "${password_value}" ]]; then
  export CODEXUI_PASSWORD="${password_value}"
else
  launch_args+=(--no-password)
fi
if [[ "${strict_local_auth}" == true ]]; then
  launch_args+=(--strict-local-auth)
fi

log "Launching codexUI on ${host}:${port}"
node "${launch_args[@]}" &
ui_pid="$!"
unset CODEXUI_PASSWORD

if [[ "${forward_tunnel}" == true ]]; then
  need_cmd cloudflared
  log "Starting cloudflared named tunnel -> http://127.0.0.1:${port}"
  if cloudflared_supports_token_file; then
    cloudflared tunnel run --token-file "${tunnel_token_file}" &
  else
    tunnel_token="$(read_tunnel_token)"
    TUNNEL_TOKEN="${tunnel_token}" cloudflared tunnel run &
    unset tunnel_token
  fi
  tunnel_pid="$!"
fi

status=0
if [[ -n "${tunnel_pid}" ]]; then
  wait -n "${ui_pid}" "${tunnel_pid}" || status=$?
else
  wait "${ui_pid}" || status=$?
fi

exit "${status}"
