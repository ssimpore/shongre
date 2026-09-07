#!/usr/bin/env bash

# CLI aliases only; application APP_ENV always uses the canonical contract names.
shongre_environment_profile() {
  case "${1:-}" in
    dev) printf 'development\n' ;;
    prod) printf 'production\n' ;;
    local|test|preview|development|staging|production) printf '%s\n' "$1" ;;
    *)
      printf 'Environment must be local, test, preview, development (dev), staging, or production (prod).\n' >&2
      return 2
      ;;
  esac
}
