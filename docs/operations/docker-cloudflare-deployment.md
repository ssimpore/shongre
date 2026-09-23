# Docker, Tunnel, and immutable deployment runbook

## Host bootstrap

Provision three isolated Linux Docker hosts or host groups and three outbound
self-hosted GitHub runners labelled:

- `self-hosted`, `linux`, `shongre-development`
- `self-hosted`, `linux`, `shongre-staging`
- `self-hosted`, `linux`, `shongre-production`

Never attach these labels to a PR runner. Restrict each runner to this private
repository and its protected GitHub Environment; require reviewers for
`production`. The runner account needs project-scoped Docker access, read-only
GHCR access through the workflow token, and write access only under its own
deployment state directory. No SSH or Docker API is exposed publicly.

On each host create two runtime env files outside the checkout. The backend file
contains the corresponding `.env.development`, `.env.staging`, or
`.env.production` values plus that environment's server secrets. The frontend
file contains only its public runtime values; this prevents the Next.js process
from receiving database, Supabase service-role or provider secrets. Set
`DATABASE_ENVIRONMENT_ID` equal to `ENVIRONMENT_ID`. Set these non-secret GitHub
Environment variables to host paths:

```text
SHONGRE_RUNTIME_ENV_FILE=/etc/shongre/runtime.env
SHONGRE_FRONTEND_ENV_FILE=/etc/shongre/frontend.env
CLOUDFLARE_TUNNEL_TOKEN_FILE=/etc/shongre/cloudflared-token
SHONGRE_DEPLOY_STATE_ROOT=/var/lib/shongre
PUBLIC_INTL_URL=<canonical environment URL>
API_URL=<canonical environment API origin>
```

Keep the files root/runner-group readable, never world readable. Login to GHCR
is short-lived per workflow. Database, Supabase service role, provider, OAuth,
payment and Tunnel secrets remain in host/managed-secret storage—not Compose,
Git, image layers, build arguments, GitHub variables, or logs.

## Analytics provider activation

Analytics values are runtime configuration and are never image build arguments.
Keep optional providers disabled until their environment-specific project/site,
consent behavior and sanitized payloads have been validated in development and
then on the exact staging release. Cloudflare Web Analytics is a browser module
beacon configured with a public site tag; it does not change Tunnel or DNS
infrastructure. Search Console credentials and provider delivery secrets remain
only in the backend runtime file/secret store. See
[`../architecture/analytics.md`](../architecture/analytics.md) for the full
activation and rollback runbook.

## Delivery sequence

1. `CI` gates PR/main source, migrations, contracts, critical tests, all browser
   engines, production builds, and runtime container smoke.
2. `Build once and deploy DEV` runs only after successful main CI. Buildx emits
   one frontend and one backend digest with OCI SBOM/provenance attestations;
   Trivy blocks unfixed HIGH/CRITICAL findings. A release manifest binds both
   digests to commit, OpenAPI and migration history.
3. The DEV runner pulls those digests, runs `dist/migrate.js` from the exact
   backend digest once under a host lock, rolls out the services and checks the
   private processes, connector metric and public Tunnel endpoints.
4. `Promote exact release to STAGING` accepts that release SHA, reuses the same
   manifest/digests, deploys, then runs Chromium hosted web/API checks through
   Cloudflare. Its certification artifact binds the test result to the exact
   images, OpenAPI and migration revision.
5. `Deploy staging-certified release to PRODUCTION` refuses an absent or
   mismatched certification. The protected `production` Environment supplies
   manual approval before its dedicated runner migrates/deploys the same
   digests.

Market-scoped favorites use an expand-phase compatibility mirror, but the
database lock cannot revoke an old RPC body that has already started executing.
Before applying the scoped-favorite migrations, put favorite mutations in
maintenance, stop every old backend instance and job capable of calling a
legacy favorite RPC, and verify that their in-flight database work has drained.
Apply the migrations, deploy the new readers/writers, verify scoped counts per
market, and only then reopen favorite mutations. The new readers deliberately
omit every quarantined legacy row because its action market cannot be proven;
record the reviewed recovery decision for that quarantine. Retire legacy
tables/RPCs only in a later contract migration after confirming no old caller
remains.

## Vulnerability policy

Trivy is the single container/IaC scanner. Any `CRITICAL` or `HIGH` finding,
including a finding without an upstream fix, blocks the image release and the
scheduled security workflow. `MEDIUM` findings are reported by the weekly
workflow for ownership and dependency-update triage; they become blocking when
they are reachable on an internet-facing path, enable privilege or data impact,
or are elevated by the security owner. A temporary exception must identify the
package/image, compensating control, owner, and expiry date in a reviewed
change—there are currently no exceptions.

Compose has no `ports` in hosted topology. Verify on the host with
`docker compose -f compose.yaml --profile tunnel ps`; any host listener for
the configured application ports or the connector metrics port is an incident.
`compose.local.yaml` binds development ports
to `127.0.0.1` only.

## Rollback

Dispatch `Rollback to known-good image digests` with environment and known-good
full SHA. It resolves the original manifest, checks that its evidence workflow
succeeded, requires STAGING certification for production, and pulls the
original digests. It does not checkout/rebuild the old source, recreate the
Tunnel, change DNS, or run reverse migrations.

Schema rollback is a separate incident procedure. Production migrations use
expand → compatible application → backfill → later contract. If compatibility
is broken, disable the feature and ship a forward remediation; follow the
backup/restore runbook only for actual loss or corruption.

## Failure triage

- Migration fails: rollout stops before application replacement; inspect the
  checksum/target mismatch without editing migration history.
- Readiness fails: inspect backend/database logs; the old healthy containers
  remain the recovery reference and application rollback stays digest-based.
- Tunnel health fails: inspect `make tunnel-logs`; do not open origin ports.
- Public-only failure: inspect DNS/public-hostname routes, WAF/Access policy,
  certificate status and trusted-host logs.
- Bad release: dispatch rollback, verify all public endpoints, then record the
  incident and forward database compatibility decision.

## Worker, Redis, and local lifecycle

The API and worker share the backend image. Compose starts workers independently
and probes `node dist/worker-health.js` instead of only checking process state.
The heartbeat contains only PID, environment ID and a timestamp, expires after
the centrally configured age, and is refreshed after successful BullMQ and
database-lease coordination. Redis is private, credentialed/TLS in hosted
environments, and owns only queue transport and realtime fan-out; PostgreSQL
outboxes remain authoritative. Container `/tmp` is writable while the image
filesystem stays read-only. `WORKER_HEALTH_FILE` may override the path; native
Make launchers use an ignored file in the checkout’s `.runtime/`. CI checks the
heartbeat, Redis PING, and API readiness in the built containers.

On macOS, `make dev` starts Docker Desktop if needed and waits for its daemon
before touching local containers. `make dev` ensures local Supabase, Mailpit,
and Redis before stopping applications, then applies pending migrations and the
deterministic seed. A repeat invocation reuses the healthy selected stack when
environment/lockfile/migration hashes match; it
never records secret values in process metadata. `make dev-down` stops tracked
applications, the canonical local Compose project and Supabase without deleting
database volumes. `make dev-restart` performs that stop followed by startup.
`make dev-reset` explicitly recreates and reseeds the proven local database;
`make dev-clean` removes only disposable build/runtime files after stopping
owned applications. `make dev-status`, `make dev-logs`, `make docker-up`,
`make docker-down`, and `make docker-restart` delegate to the existing tooling.
`make redis-up`, `make redis-status`, and `make redis-logs` own local Redis.
`make mail-up` ensures the Supabase-owned Mailpit instance, avoiding a second
mail sink.
