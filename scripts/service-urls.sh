#!/usr/bin/env bash

set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh"

printf '\nService URLs (credentials omitted)\n'
printf '%-20s %s\n' 'Shongre Web' "http://${FRONTEND_HOST}:${FRONTEND_PORT}/"
printf '%-20s %s\n' 'Shongre API' "http://${BACKEND_HOST}:${BACKEND_PORT}${API_PREFIX}"
printf '%-20s %s\n' 'API readiness' "http://${BACKEND_HOST}:${BACKEND_PORT}/readyz"
printf '%-20s %s\n' 'Expo Metro' "http://${EXPO_HOST}:${EXPO_METRO_PORT}/"
printf '%-20s %s\n' 'Expo Web' "http://${EXPO_HOST}:${EXPO_WEB_PORT}/"
printf '%-20s %s\n' 'Storybook' "http://${FRONTEND_HOST}:${STORYBOOK_PORT}/"

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
