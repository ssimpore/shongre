#!/usr/bin/env bash

set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh"
source "$SHONGRE_ROOT/scripts/utils.sh"

port="${1:-}"
service_name="${2:-}"
if [[ ! "$port" =~ ^[0-9]+$ ]] || (( port < 1 || port > 65535 )); then
  shongre_fail "usage: scripts/free-port.sh <port> [service-name]"
  exit 2
fi

port_pids="$(lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null | sort -u || true)"
if [[ -z "$port_pids" ]]; then
  shongre_pass "port $port is free"
  exit 0
fi

while IFS= read -r pid; do
  command_line="$(shongre_pid_command "$pid")"
  process_cwd="$(shongre_pid_cwd "$pid")"
  shongre_info "port $port is owned by PID $pid: ${command_line:-unknown} (cwd: ${process_cwd:-unknown})"
  if ! shongre_pid_belongs_to_project "$pid" "$service_name"; then
    shongre_fail "refusing to stop unrelated PID $pid on port $port"
    exit 1
  fi
done <<< "$port_pids"

while IFS= read -r pid; do
  shongre_info "sending SIGTERM to project PID $pid"
  kill -TERM "$pid" 2>/dev/null || true
done <<< "$port_pids"

for _attempt in {1..20}; do
  remaining="$(lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null || true)"
  [[ -z "$remaining" ]] && break
  sleep 0.1
done

remaining_pids="$(lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null | sort -u || true)"
if [[ -n "$remaining_pids" ]]; then
  while IFS= read -r pid; do
    if ! shongre_pid_belongs_to_project "$pid" "$service_name"; then
      shongre_fail "PID ownership changed while releasing port $port; refusing SIGKILL"
      exit 1
    fi
    shongre_warn "SIGTERM timed out; sending SIGKILL to exact project PID $pid"
    kill -KILL "$pid" 2>/dev/null || true
  done <<< "$remaining_pids"
fi

if lsof -nP -iTCP:"$port" -sTCP:LISTEN -t >/dev/null 2>&1; then
  shongre_fail "port $port is still occupied"
  exit 1
fi
shongre_pass "released project-owned port $port"
