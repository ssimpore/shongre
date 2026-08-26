#!/usr/bin/env bash

set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$root/scripts/utils.sh"

for image in shongre-frontend:local shongre-backend:local; do
  user="$(docker image inspect "$image" --format '{{.Config.User}}')"
  if [[ -z "$user" || "$user" == "0" || "$user" == "root" ]]; then
    shongre_fail "$image has a root runtime user"
    exit 1
  fi
  if docker run --rm --entrypoint sh "$image" -c \
    'find /app -type f \( -name ".env" -o -name ".env.*" -o -name "*.pem" -o -name "*.key" -o -name "*.map" -o -path "*/.git/*" \) -print -quit | grep -q .'; then
    shongre_fail "$image contains an environment, key, source map, or Git metadata file"
    exit 1
  fi
  if docker run --rm --entrypoint sh "$image" -c 'command -v npm >/dev/null || command -v yarn >/dev/null || command -v corepack >/dev/null'; then
    shongre_fail "$image retains a package manager that is not needed at runtime"
    exit 1
  fi
  shongre_pass "$image runs as $user without package managers, common secrets, source maps, or Git files"
done
