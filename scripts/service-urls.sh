#!/usr/bin/env bash

set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh"

printf '\nService URLs for %s (credentials omitted)\n' "$APP_ENV"
printf '%-20s %s\n' 'France Web' "$PUBLIC_FR_URL"
printf '%-20s %s\n' 'International Web' "$PUBLIC_INTL_URL"
printf '%-20s %s\n' 'Shongre API' "${API_URL}${API_PREFIX}"
printf '%-20s %s\n' 'API readiness' "${API_URL}/readyz"
if [[ "$APP_ENV" == local || "$APP_ENV" == test ]]; then
  printf '%-20s %s\n' 'Expo Metro' "http://${EXPO_HOST}:${EXPO_METRO_PORT}/"
  printf '%-20s %s\n' 'Expo Web' "http://${EXPO_HOST}:${EXPO_WEB_PORT}/"
  printf '%-20s %s\n' 'Storybook' "http://${FRONTEND_HOST}:${STORYBOOK_PORT}/"
fi

if [[ "$APP_ENV" == "local" && "$DATABASE_INFRA_MODE" == "local" ]]; then
  supabase_origin="http://${SUPABASE_HOST}:${SUPABASE_API_PORT}"
  printf '%-20s %s\n' 'Supabase Studio' "http://${SUPABASE_HOST}:${SUPABASE_STUDIO_PORT}/"
  printf '%-20s %s\n' 'Supabase API' "$supabase_origin"
  printf '%-20s %s\n' 'Supabase REST' "$supabase_origin/rest/v1"
  printf '%-20s %s\n' 'Supabase GraphQL' "$supabase_origin/graphql/v1"
  printf '%-20s %s\n' 'Supabase Functions' "$supabase_origin/functions/v1"
  printf '%-20s %s\n' 'Supabase MCP' "$supabase_origin/mcp"
  printf '%-20s %s\n' 'Supabase Storage' "$supabase_origin/storage/v1"
  printf '%-20s %s\n' 'Supabase S3' "$supabase_origin/storage/v1/s3 (signed requests only)"
  printf '%-20s %s\n' 'Supabase Realtime' "ws://${SUPABASE_HOST}:${SUPABASE_REALTIME_PORT}/"
  printf '%-20s %s\n' 'PostgreSQL' "postgresql://${SUPABASE_HOST}:${SUPABASE_DB_PORT}/postgres"
  printf '%-20s %s\n' 'Mailpit / Inbucket' "http://${SUPABASE_HOST}:${SUPABASE_INBUCKET_PORT}/"
  printf '%-20s %s\n' 'Local SMTP' "smtp://${SUPABASE_HOST}:${SUPABASE_SMTP_PORT}"
  printf '%-20s %s\n' 'Local POP3' "pop3://${SUPABASE_HOST}:${SUPABASE_POP3_PORT}"
fi
