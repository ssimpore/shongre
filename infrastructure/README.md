# Infrastructure

This boundary owns deployment/runtime orchestration, monitoring guidance, and
generated configuration. Shongre's application source remains in `frontend/`,
`backend/`, and `mobile/`.

The canonical Supabase migrations and functions remain under
`backend/supabase/` because they are backend implementation. Root scripts render
its local host-port configuration from the root environment before invoking the
Supabase CLI. Generated runtime state is written only to ignored paths.

Production artifacts and operations:

- `kubernetes/shongre-platform.yaml` runs separate highly available web, API,
  and leased-worker workloads from immutable images.
- `monitoring/README.md` defines health signals, launch SLOs, and required
  alerts.
- `docs/operations/release.md`, `backup-restore.md`, and
  `incident-response.md` are the mandatory operator runbooks.
- `make production-release-check` fails closed on demo modes, insecure URLs,
  missing live provider configuration, or stale launch evidence.
