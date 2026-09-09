#!/usr/bin/env bash
set -euo pipefail

# The rest of the browser suite runs against the in-memory fixture API
# (BACKEND_DATA_MODE=demo). This one runs against the database-mode stack that
# `make dev` starts, because the two repository families diverge and only this
# one exercises the code path production uses.

SHONGRE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$SHONGRE_ROOT"
source scripts/env.sh

[[ "${APP_ENV:-}" == "local" ]] || {
  echo "This suite requires the local profile; it reads the repository-owned local database." >&2
  exit 1
}
[[ "${BACKEND_DATA_MODE:-}" == "database" ]] || {
  echo "BACKEND_DATA_MODE must be 'database'; the demo suite is make frontend-test-e2e." >&2
  exit 1
}

BASE_URL="${PUBLIC_FR_URL:?PUBLIC_FR_URL is required}"
if ! curl -fsS -o /dev/null --max-time 10 "$BASE_URL/"; then
  echo "The Web stack is not answering at $BASE_URL. Start it with make dev." >&2
  exit 1
fi
if ! curl -fsS -o /dev/null --max-time 10 "${API_URL:?}/readyz"; then
  echo "The API is not ready at $API_URL. Start it with make dev." >&2
  exit 1
fi

cd frontend
SHONGRE_E2E_DATABASE_MODE=1 \
  PLAYWRIGHT_BASE_URL="$BASE_URL" \
  npx playwright test database-mode-public-routes.spec.ts \
  --project=chromium "$@"
