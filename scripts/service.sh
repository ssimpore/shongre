#!/usr/bin/env bash

set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh"
source "$SHONGRE_ROOT/scripts/utils.sh"

action="${1:-}"
service_name="${2:-}"
port="${3:-}"
shift $(( $# >= 3 ? 3 : $# ))
[[ "${1:-}" == "--" ]] && shift

pid_file="$(shongre_pid_file "$service_name")"
log_file="$SHONGRE_ROOT/.runtime/logs/${service_name}.log"
mkdir -p "$SHONGRE_ROOT/.runtime/logs"

if [[ "$port" == "auto" || -z "$port" ]]; then
  port="$(shongre_service_port "$service_name")" || {
    shongre_fail "no configured port for service $service_name"
    exit 2
  }
fi

stop_service() {
  if [[ ! -f "$pid_file" ]]; then
    shongre_info "$service_name is not tracked"
    return 0
  fi
  local tracked_pid
  tracked_pid="$(tr -dc '0-9' < "$pid_file")"
  if shongre_pid_is_running "$tracked_pid"; then
    if ! shongre_pid_belongs_to_project "$tracked_pid" "$service_name"; then
      shongre_fail "stale PID file points to an unrelated process; removing tracking only"
      rm -f "$pid_file"
      return 1
    fi
    shongre_stop_process_tree "$tracked_pid" "$service_name"
  fi
  rm -f "$pid_file"
  shongre_pass "$service_name stopped"
}

case "$action" in
  foreground)
    [[ $# -gt 0 ]] || { shongre_fail "no command supplied for $service_name"; exit 2; }
    if [[ -f "$pid_file" ]] && shongre_pid_is_running "$(tr -dc '0-9' < "$pid_file")"; then
      shongre_info "stopping the existing tracked $service_name process tree"
      stop_service
    fi
    "$SHONGRE_ROOT/scripts/free-port.sh" "$port" "$service_name"
    child_pid=''
    cleanup() {
      if [[ -n "$child_pid" ]] && shongre_pid_is_running "$child_pid"; then
        shongre_stop_process_tree "$child_pid" "$service_name" || true
      fi
      rm -f "$pid_file"
    }
    trap cleanup INT TERM EXIT
    "$@" &
    child_pid=$!
    printf '%s\n' "$child_pid" > "$pid_file"
    shongre_pass "$service_name started on port $port (PID $child_pid)"
    wait "$child_pid"
    ;;
  start)
    [[ $# -gt 0 ]] || { shongre_fail "no command supplied for $service_name"; exit 2; }
    if [[ -f "$pid_file" ]] && shongre_pid_is_running "$(tr -dc '0-9' < "$pid_file")"; then
      shongre_info "$service_name is already running"
      exit 0
    fi
    nohup "$SHONGRE_ROOT/scripts/service.sh" foreground "$service_name" "$port" -- "$@" > "$log_file" 2>&1 &
    wrapper_pid=$!
    for _attempt in {1..50}; do
      [[ -s "$pid_file" ]] && break
      shongre_pid_is_running "$wrapper_pid" || break
      sleep 0.1
    done
    if [[ ! -s "$pid_file" ]]; then
      shongre_fail "$service_name did not start; inspect $log_file"
      exit 1
    fi
    shongre_pass "$service_name running; log: $log_file"
    ;;
  stop)
    stop_service
    ;;
  status)
    if [[ -f "$pid_file" ]]; then
      tracked_pid="$(tr -dc '0-9' < "$pid_file")"
      if shongre_pid_is_running "$tracked_pid"; then
        printf 'RUNNING %s\n' "$tracked_pid"
        exit 0
      fi
      rm -f "$pid_file"
    fi
    printf 'STOPPED -\n'
    ;;
  logs)
    [[ -f "$log_file" ]] || { shongre_warn "no log exists for $service_name"; exit 0; }
    tail -n "${LINES:-100}" "$log_file"
    ;;
  *)
    shongre_fail "usage: scripts/service.sh <foreground|start|stop|status|logs> <name> <port> [-- command...]"
    exit 2
    ;;
esac
