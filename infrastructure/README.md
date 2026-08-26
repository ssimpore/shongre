# Infrastructure

This boundary owns deployment/runtime orchestration, monitoring guidance, and
generated configuration. Shongre's application source remains in `frontend/`,
`backend/`, and `mobile/`.

The canonical Supabase migrations and functions remain under
`backend/supabase/` because they are backend implementation. Root scripts render
its local host-port configuration from the root environment before invoking the
Supabase CLI. Generated runtime state is written only to ignored paths.

Production artifacts and operations:

- Root `compose.yaml` is the canonical hosted workload topology. It runs web,
  API, leased worker, and pinned `cloudflared` containers without publishing an
  origin port. `compose.local.yaml` is the only loopback-port override.
- `cloudflare/README.md` defines the three persistent remote-managed Tunnels,
  public-hostname routes, host-secret boundary, connector health and HA model.
- `monitoring/README.md` defines health signals, launch SLOs, and required
  alerts.
- `docs/operations/release.md`, `backup-restore.md`, and
  `incident-response.md` are the mandatory operator runbooks.
- `docs/architecture/environments.md` defines the six target environments,
  fingerprints, DNS/TLS, provider modes, protected workflow, and manual setup.
- `make production-release-check` fails closed on demo modes, insecure URLs,
  missing live provider configuration, or stale launch evidence.
