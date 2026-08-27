# Analytics backend

The canonical architecture, privacy model, event rules, provider configuration,
API/RBAC matrix, worker behavior, retention and rollout runbook are documented
in [`../../docs/architecture/analytics.md`](../../docs/architecture/analytics.md).

Backend implementation lives in `src/modules/analytics/`, scheduled ingestion
and retry work in `src/workers/analytics/` plus `scheduled-worker-runtime.ts`,
and the complete additive schema is migration
`supabase/migrations/00066_unified_analytics.sql`.
