#!/usr/bin/env bash

set -o pipefail

SHONGRE_COLOR_RESET=$'\033[0m'
SHONGRE_COLOR_GREEN=$'\033[32m'
SHONGRE_COLOR_YELLOW=$'\033[33m'
SHONGRE_COLOR_RED=$'\033[31m'
SHONGRE_COLOR_CYAN=$'\033[36m'

shongre_info() { printf '%sINFO%s  %s\n' "$SHONGRE_COLOR_CYAN" "$SHONGRE_COLOR_RESET" "$*"; }
shongre_pass() { printf '%sPASS%s  %s\n' "$SHONGRE_COLOR_GREEN" "$SHONGRE_COLOR_RESET" "$*"; }
shongre_warn() { printf '%sWARN%s  %s\n' "$SHONGRE_COLOR_YELLOW" "$SHONGRE_COLOR_RESET" "$*"; }
shongre_fail() { printf '%sFAIL%s  %s\n' "$SHONGRE_COLOR_RED" "$SHONGRE_COLOR_RESET" "$*" >&2; }

shongre_require_command() {
  local command_name="$1"
  if command -v "$command_name" >/dev/null 2>&1; then
    shongre_pass "$command_name ($(command -v "$command_name"))"
    return 0
  fi
  shongre_fail "$command_name is required"
  return 1
}

shongre_pid_is_running() {
  local pid="$1"
  [[ "$pid" =~ ^[0-9]+$ ]] && kill -0 "$pid" >/dev/null 2>&1
}

shongre_pid_file() {
  printf '%s/.runtime/%s.pid' "$SHONGRE_ROOT" "$1"
}

shongre_pid_command() {
  ps -p "$1" -o command= 2>/dev/null | sed 's/^[[:space:]]*//'
}

shongre_pid_cwd() {
  lsof -a -p "$1" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p' | head -n 1
}

shongre_pid_belongs_to_project() {
  local pid="$1" service_name="${2:-}" command_line process_cwd

  process_cwd="$(shongre_pid_cwd "$pid")"
  [[ -n "$process_cwd" && ( "$process_cwd" == "$SHONGRE_ROOT" || "$process_cwd" == "$SHONGRE_ROOT/"* ) ]] && return 0

  command_line="$(shongre_pid_command "$pid")"
  [[ "$command_line" == *"$SHONGRE_ROOT"* ]]
}

shongre_descendant_pids() {
  local parent_pid="$1" child_pid
  while IFS= read -r child_pid; do
    [[ -n "$child_pid" ]] || continue
    shongre_descendant_pids "$child_pid"
    printf '%s\n' "$child_pid"
  done < <(pgrep -P "$parent_pid" 2>/dev/null || true)
}

shongre_stop_process_tree() {
  local root_pid="$1" service_name="${2:-}" process_pid attempt
  local -a process_pids=()

  shongre_pid_is_running "$root_pid" || return 0
  while IFS= read -r process_pid; do
    [[ -n "$process_pid" ]] && process_pids+=("$process_pid")
  done < <(shongre_descendant_pids "$root_pid")
  process_pids+=("$root_pid")

  for process_pid in "${process_pids[@]}"; do
    shongre_pid_is_running "$process_pid" || continue
    if ! shongre_pid_belongs_to_project "$process_pid" "$service_name"; then
      shongre_pid_is_running "$process_pid" || continue
      shongre_fail "refusing to stop unrelated PID $process_pid in the tracked process tree"
      return 1
    fi
  done

  for process_pid in "${process_pids[@]}"; do
    shongre_pid_is_running "$process_pid" || continue
    kill -TERM "$process_pid" 2>/dev/null || true
  done

  for attempt in {1..30}; do
    local still_running=0
    for process_pid in "${process_pids[@]}"; do
      if shongre_pid_is_running "$process_pid"; then
        still_running=1
        break
      fi
    done
    (( still_running == 0 )) && return 0
    sleep 0.1
  done

  for process_pid in "${process_pids[@]}"; do
    shongre_pid_is_running "$process_pid" || continue
    if ! shongre_pid_belongs_to_project "$process_pid" "$service_name"; then
      shongre_pid_is_running "$process_pid" || continue
      shongre_fail "PID ownership changed while stopping $service_name; refusing SIGKILL for $process_pid"
      return 1
    fi
    shongre_warn "SIGTERM timed out; sending SIGKILL to exact project PID $process_pid"
    kill -KILL "$process_pid" 2>/dev/null || true
  done
}

shongre_service_port() {
  case "$1" in
    frontend) printf '%s' "${FRONTEND_PORT:-}" ;;
    backend) printf '%s' "${BACKEND_PORT:-}" ;;
    worker) printf '%s' 'none' ;;
    metro) printf '%s' "${EXPO_METRO_PORT:-}" ;;
    expo-web) printf '%s' "${EXPO_WEB_PORT:-}" ;;
    storybook) printf '%s' "${STORYBOOK_PORT:-}" ;;
    *) return 1 ;;
  esac
}
