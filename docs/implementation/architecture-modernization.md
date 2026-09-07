# Architecture modernization implementation report

Review date: 2026-09-07. This report describes this change, not a production
release certification. The requested NestJS/Fastify and Redis/BullMQ migration
is **not complete**. Package downloads, Docker access and socket binding are
unavailable in the execution environment. Existing domain implementations were
preserved; no substitute framework, inert queue service or parallel runtime was
introduced to make the target diagram appear complete.

## Repository audit and migration decisions

The initial working tree was clean. The recursive inventory covered 2,341
tracked files, application entrypoints, package manifests and TypeScript
configuration, client transports, domain services, repository adapters, SQL,
workers, generated assets, Docker/Compose, environment launchers, Make targets,
CI workflows, tests and canonical documentation. The initial contract contained
522 operations. Inspection found a substantial modular monolith rather than an
application needing replacement.

The implementation sequence was: preserve the audited behavior; extract domain
HTTP ownership; strengthen contract generation and boundary checks; correct
client transport races and deadlines; add worker health and request correlation;
improve existing lifecycle/build tooling; regenerate, test and clean the affected
scope. No top-level monorepo reorganization was needed.

| Area             | Before                                                                                   | After / decision                                                                                                                   |
| ---------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Backend          | Node HTTP transport; domain services; 6,633-line shared router                           | Same runtime; 570-line composition/transport router with 38 route families, including provider webhooks                            |
| Domain ownership | Most HTTP handlers centralized                                                           | 517 business operations owned by module API registrars or the provider webhook boundary; resource policies moved with their domain |
| Framework        | Custom Node HTTP, TypeScript, ESM                                                        | NestJS/Fastify migration blocked by unavailable packages; no untested dependency declarations added                                |
| Contract         | Canonical OpenAPI 3.1 JSON, generated path/types and backend manifest                    | Same source, plus generated operation functions, distribution YAML and runtime documentation                                       |
| Clients          | Existing Web service registry and API-only Expo application                              | Same architecture; shared generated favorite operations; hardened platform transports                                              |
| Data             | PostgreSQL/Supabase, typed repositories, 114 ordered migrations                          | Preserved; no schema or database-type changes                                                                                      |
| Queues/events    | PostgreSQL coordination, durable domain outboxes/inboxes and leases                      | Preserved; independent worker health added; Redis/BullMQ remain unimplemented                                                      |
| Docker           | Root Compose plus local override; non-root immutable images                              | Same topology; independent worker health, corrected build input ownership, stronger context exclusions                             |
| Shared packages  | Contracts, semantic tokens, brand, generic utilities, UI and shared listing presentation | Preserved; expanded dependency-direction enforcement                                                                               |
| Environments     | Six validated application profiles and protected hosted deployment                       | Preserved; safer repeated local startup and deterministic installation                                                             |

All 517 pre-existing handler bodies were compared as TypeScript syntax trees
before and after extraction. They match after removing the obsolete `this`
qualifier from the five moved ownership helpers. Transport behavior changes are
covered separately by tests. This is a domain-ownership migration, not a claim
that every handler has become a Nest controller or that all persistence is now
colocated with its domain.

## Backend, contracts and client changes

- Module `api/*.routes.ts` files own HTTP handlers; shared dispatch retains
  authentication, CSRF, capability checks, market consistency, validation and
  response/cache handling. Domain services remain authoritative for listings,
  publication, taxonomy, search, messaging, professional access, subscriptions,
  monetization, payments, delivery, moderation and compliance.
- OpenAPI source metadata follows each real registrar. The checker discovers
  registrations from the actual composition root, rejects duplicate or
  nonliteral operations, verifies access/source parity and checks route order.
  Literal punctuation is escaped when matching routes.
- The contract now has 526 operations across 465 paths and 329 component
  schemas. Four additions expose `/health/live`, `/health/ready`,
  `/api/openapi.json` and `/api/docs`. Existing probe aliases remain for deployed
  consumers. Runtime health schemas include the actual environment/release data.
- `make api-generate` generates 513 JSON business-operation functions alongside
  the existing transport types. Redirect/pixel operations retain their existing
  specialized transports. Generated files carry read-only notices. JSON remains
  the editable source; YAML is an ignored export and Git supplies history.
- Web and mobile favorite adapters use the same generated functions. Other
  adapters still use generated OpenAPI path/operation types; their conversion
  to function calls is not complete. UI projections remain separate from wire
  DTOs where their shape and responsibility differ.
- The operation-removal check now handles specifications larger than Node's
  default subprocess buffer, rejects unreadable configured bases, and requires
  a valid elapsed deprecation sunset. It is **not** comprehensive schema-level
  breaking-change detection. 278 success responses still reference `JsonValue`;
  those require domain-by-domain schema tightening and consumer migration.
- Web request deadlines cover response-body consumption, cancellation remains
  distinct from timeout, empty 204 responses work and 429 errors normalize.
  Generated `Headers` objects compose correctly with platform headers.
- Mobile refresh requests are coalesced and tied to session generations.
  Login/logout changes invalidate old responses and prevent stale refreshes or
  retries from restoring another session. SecureStore writes are serialized;
  transient refresh failures preserve credentials. Headers and body reads have
  a bounded deadline and caller cancellation.

## Identity, markets, security and privacy

The audit found existing Supabase Auth identity checks, Shongre HttpOnly Web
sessions, native bearer sessions in SecureStore, backend capabilities, resource
policies, market policies and Staff MFA/recent-authentication gates. These were
preserved. Individual/Professional account types and the separate Staff plane
were not replaced with conflicting buyer/seller role labels.

`MarketContext`, the configured France default and country catalog already
cover FR, CH, BE, SN and BF. Existing availability gates remain authoritative;
this change does not activate additional markets, currencies or providers.
Feature policy remains backend-controlled through the existing contract and
service. `packages/features` retains its actual shared Web/native presentation
consumers instead of being repurposed into a competing feature registry.

The client Supabase audit found no direct business-table/Auth client in Web or
mobile requiring migration. Existing central HTTP transports are **KEEP**;
backend Supabase Auth, database and Storage adapters are **KEEP**. No direct
client Supabase implementation was invented or removed.

Errors add safe Problem Details-style fields and request IDs while retaining
the documented v1 `error` extension and JSON media type. Unknown paths are not
reflected into errors. Error responses are non-cacheable. Request-local async
context supplies operation, route template, verified actor and market to
structured logs; unexpected dispatch failures do not log raw request paths or
exception messages. Existing secret redaction remains in force.

Dependency checks now inspect imports, re-exports, dynamic imports, `require`
and workspace manifests. Web/mobile cannot import backend internals, and backend
cannot depend on client/UI code. Secret and hygiene checks include new
non-ignored files before staging. This is not an assertion that an external
penetration test or dependency advisory scan passed.

## Database, workers, storage and providers

No SQL history was rewritten. Existing constraints, RLS, authorization tests,
integer-money/idempotency boundaries, taxonomy projections, PostgreSQL search,
storage authorization and domain outboxes were retained. Migration ordering
validation passes; actual database replay, seed, concurrency tests and EXPLAIN
plans require a reachable disposable local database.

Worker heartbeats are atomic, permission-restricted files containing PID,
environment ID and update time. They refresh after successful database claims
or lease renewals, including during long jobs. Health requires a live process,
matching environment and recent timestamp. Graceful shutdown removes the owned
heartbeat; a shutdown deadline terminates a stuck worker. Queue RPC calls use
generated database types instead of three unbounded casts.

Redis caching, distributed Redis rate limiting and BullMQ were not installed.
Existing PostgreSQL scheduling/outbox behavior remains operational in its
supported environment; there is no new generic `outbox_events` table layered
over the domain outboxes. A future BullMQ rollout must preserve atomic writes,
deduplication, leases, retry semantics and idempotent effects before switching
consumers. Email, AI, payment and storage provider abstractions were preserved;
no live provider was contacted or enabled. Supabase's existing mail sink is
reused instead of starting a second Mailpit.

## Docker, infrastructure, CI/CD and developer experience

`compose.yaml` remains the private hosted topology; `compose.local.yaml` remains
the loopback-only override. API and worker share one backend image and can start
independently. Worker health is checked by Compose, `make docker-health`, native
stack health and the CI container smoke job. Dockerfile non-root users,
multi-stage installs, read-only Compose filesystems, dropped capabilities,
secret mounts and digest-based environment promotion remain intact.

The backend build script was hidden by the repository's `build/` ignore rule.
It now lives at `backend/scripts/build.mjs`, so a clean checkout includes the
API/worker/migrator/health build entrypoints. Docker context excludes local
runtime credentials/state, Supabase CLI state, logs and signing credentials.
No second Docker directory/topology or duplicate database was introduced.

`make install` uses `npm ci`. One-shot TypeScript tooling uses the existing
`tsx` loader through Node, without the CLI's extra IPC server. Development
watchers retain `tsx watch`. `make dev` validates infrastructure before stopping
owned apps and reuses a healthy stack only when environment, lockfile and
migration and workspace manifest hashes match. It does not save plaintext secrets in process metadata.
PID cleanup preserves ownership checks and does not remove newer tracking.

New commands delegate to the existing orchestration: `dev-down`, `dev-restart`,
`dev-status`, `dev-logs`, `dev-reset`, `dev-clean`, per-application log aliases,
`mail-up`, `docker-up`, `docker-down`, `docker-restart`, `api-export`,
`api-generate` and `api-check`. Reset remains explicitly destructive and local;
it was not executed. Redis commands were not added without a Redis-backed
runtime. Cloudflare routing, environment secret injection, immutable image
promotion and protected deployment workflows were preserved, not deployed.

## Performance, observability, accessibility and SEO/GEO

Transport deadlines and refresh coalescing address boundedness and duplicate
requests. The shared router is smaller and domain ownership is explicit; no
measured throughput or bundle-size improvement is claimed. Backend latency,
database plans, pool saturation, queue lag and load still need runtime evidence.
The worker probe proves coordination freshness, not successful delivery of
every individual business job.

Existing structured logging, Sentry/provider boundaries, performance budgets
and `infrastructure/monitoring` remain. Request correlation and worker probes
were strengthened; a complete OpenTelemetry SDK/exporter rollout was not added.

The audit retained the existing semantic token/brand system, shared accessible
primitives, responsive layouts, SSR metadata, canonical/hreflang rules,
structured data, robots/sitemaps, publication-aware indexing and consent gates.
Design-token, navigation and SEO/GEO governance checks pass. No visual redesign,
crawler-specific spam content, newly enabled locale or production indexing
behavior was introduced. Browser accessibility and real crawl/performance
measurements remain unverified here.

## Verification and command outcomes

Successful checks on the modified tree include:

- All workspace typechecks and canonical lint, including SEO/GEO, token,
  navigation, mobile and contract checks.
- Frontend: 170 test files, 1,126 passing tests.
- Backend excluding the socket-binding HTTP integration file: 185 files,
  972 passing tests and two existing conditional disposable-database skips.
  In-process tests exercise the real HTTP listener, login, market isolation,
  capability denial, documentation, health and safe errors.
- Mobile: 19 files, 82 passing tests; API-only boundary and source reachability
  checks pass. Contract package: 35 files, 275 passing tests.
- Environment/fingerprint tests, migration-order validation, OpenAPI generation,
  lint/parity/drift checks, operation removal comparison against `HEAD`, backend
  production bundling, Compose syntax, repository hygiene and secret checks.

The following table distinguishes unavailable execution from implemented
behavior. No failed command is counted as a successful release gate.

| Command                                | Result                             | Evidence or blocker                                                                                                                                                                 |
| -------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `make install`                         | BLOCKED                            | Executed in an isolated manifest/lockfile copy to preserve installed workspace dependencies; registry downloads fail with `ENOTFOUND`, then npm reports `Exit handler never called` |
| `make dev`                             | BLOCKED                            | Docker daemon/socket unavailable to the sandbox before application replacement                                                                                                      |
| `make dev-status`                      | FAIL / accurate unavailable status | Reports application/infrastructure state and configured URLs, exits nonzero because the stack is unavailable                                                                        |
| `make dev-down`                        | PARTIAL / FAIL                     | Owned-app stop succeeds with no tracked apps; Docker stop is denied                                                                                                                 |
| `make dev-restart`                     | BLOCKED                            | Stops at the same Docker access failure                                                                                                                                             |
| `make frontend`                        | BLOCKED                            | Next cannot bind the configured loopback port: `listen EPERM`                                                                                                                       |
| `make backend`                         | BLOCKED                            | Required local Supabase is unavailable                                                                                                                                              |
| `make worker`                          | BLOCKED                            | Required local Supabase is unavailable                                                                                                                                              |
| `make docker-build`                    | BLOCKED                            | Docker Buildx activity path/socket access denied                                                                                                                                    |
| `make docker-up`                       | BLOCKED                            | Docker daemon/socket access denied                                                                                                                                                  |
| `make docker-status`                   | BLOCKED                            | Docker daemon/socket access denied                                                                                                                                                  |
| `make docker-down`                     | BLOCKED                            | Docker daemon/socket access denied                                                                                                                                                  |
| `make docker-config`                   | PASS                               | Canonical base plus local override render successfully                                                                                                                              |
| `make supabase-up`                     | BLOCKED                            | Docker daemon/socket unavailable                                                                                                                                                    |
| `make redis-up`                        | NOT IMPLEMENTED / FAIL             | No Redis dependency or service exists; Make correctly reports no target                                                                                                             |
| `make mail-up`                         | BLOCKED                            | Existing Supabase-owned mail sink requires Docker                                                                                                                                   |
| `make db-migrate`                      | BLOCKED                            | Actual local database connection unavailable; ordering-only validation passes                                                                                                       |
| `make db-seed`                         | BLOCKED                            | Actual local database connection unavailable; no seed mutation completed                                                                                                            |
| `make api-export`                      | PASS                               | Generated YAML export from canonical JSON                                                                                                                                           |
| `make api-generate`                    | PASS                               | Types, operation functions, manifest and inventory regenerate                                                                                                                       |
| `OPENAPI_BASE_REF=HEAD make api-check` | PASS                               | Validity, generated drift, source parity, compilation and operation-removal comparison                                                                                              |
| `make test`                            | BLOCKED / FAIL                     | Full backend HTTP integration requires socket binding; successful subsets are listed above                                                                                          |
| `make check`                           | BLOCKED / FAIL                     | Operational-tooling tests attempt a local HTTP listener and receive `EPERM`                                                                                                         |
| `make build`                           | BLOCKED / FAIL                     | UI build succeeds; Next Turbopack CSS processing attempts a subprocess port bind and receives `EPERM`; backend build passes independently                                           |
| `make mobile-check`                    | PARTIAL / FAIL                     | Local lint/types/tests/architecture pass; Expo remote schema/directory checks cannot resolve `exp.host`                                                                             |

Container smoke tests, live Supabase/Storage, queue execution, browser E2E,
hosted development/staging/production, deployment, provider activation, database
restore and native store certification are not certified by these results.

## Cleanup and remaining work

Removed the centralized domain handler implementation, obsolete ownership
methods, the education route alias helper, unused imports, duplicated favorite
request construction and stale router-line descriptions in the specification.
Corrected a stale mobile architecture-check path. The ignored backend build
script was moved, not retained as a second implementation. Generated artifacts
were regenerated through their owners; no dependency was added or removed and
the lockfile did not change. Existing probe aliases, domain outboxes, public
contracts, migrations, platform assets and shared presentation APIs are
intentionally retained for concrete consumers.

Required follow-up work, in dependency order:

1. Run the full gates on a machine with registry access, Docker and permitted
   local listeners. Verify actual database migration/seed, independent worker
   heartbeat, local stop/restart/reuse and clean immutable image builds.
2. Install and integrate NestJS/Fastify through the extracted domain boundary,
   preserving the canonical spec, raw webhook bodies, CSRF, principal/capability
   checks, request limits, caching and errors. Remove the old dispatcher only
   after real HTTP parity tests pass.
3. Design and verify the Redis/BullMQ transition against existing durable
   PostgreSQL outboxes. Add Redis to the existing local infrastructure only when
   a real consumer exists; prove failure recovery, deduplication and scaling.
4. Replace opaque success schemas and finish generated-function consumers.
   Add a reviewed schema-level compatibility detector before claiming complete
   breaking-change coverage.
5. Validate local container routing to Supabase on the host and Web-to-API
   routing. Compose syntax alone does not prove that host-loopback runtime URLs
   are reachable inside containers; that pre-existing limitation remains open.
6. Collect browser/native, query-plan/load, vulnerability, restore, observability
   and exact-image staging evidence before production activation. Existing
   market/provider/legal launch restrictions remain in effect.

`AGENTS.md` and the canonical backend, OpenAPI, mobile, performance and Docker
runbooks describe the implemented boundaries. They deliberately do not assert
that NestJS, Redis or BullMQ is already running.
