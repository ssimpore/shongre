# Shongre

Authentication architecture, provider-console setup, session lifecycle and
rollout instructions are documented in
[`docs/architecture/authentication.md`](docs/architecture/authentication.md).
The provider-neutral analytics, product intelligence, SEO ingestion,
consent/privacy, reporting and observability architecture is documented in
[`docs/architecture/analytics.md`](docs/architecture/analytics.md).
Technical SEO, answer-engine discovery, crawler governance, entity identity and
the live crawl-audit workflow are documented in
[`docs/architecture/seo-geo-discovery.md`](docs/architecture/seo-geo-discovery.md).
The six-environment deployment, domain, Supabase, provider, CI/CD, DNS and
rollback model is documented in
[`docs/architecture/environments.md`](docs/architecture/environments.md).

Shongre is a multi-market classifieds and transactional marketplace for individual and professional sellers. The repository contains a Next.js Web application, a modular Node.js backend, and one Expo/React Native mobile application for iOS and Android.

## Architecture

```text
Web users ───────▶ frontend/ ──┐
                               ├── typed public contracts ──▶ backend/ ──▶ PostgreSQL / Supabase
Mobile users ───▶ mobile/ ─────┘
                     │
                     ├── Expo source in app/ + src/
                     └── generated native projects in ios/ + android/

Shared product system: packages/design-tokens/, packages/ui/, packages/features/,
packages/shared/, packages/brand/, and packages/contracts/
Versioned visual-identity source: brand/shongre/brand.config.json → vX.Y.Z/
Runtime/deployment tooling:  infrastructure/ + scripts/ + Makefile
```

Web and mobile are API-only in every environment and use the same canonical
service/OpenAPI boundary without a demo selector, fixture fallback, local
business repository, or direct Supabase access. UI components do not import
backend implementation or construct business requests.

Specialized verticals reuse that platform boundary. Shongre Immo is documented in [`docs/architecture/shongre-immo.md`](docs/architecture/shongre-immo.md); its current standalone routes are `/immo`, `/deposer/immo`, `/compte/immo`, and `/admin/immo`.

The tenant-scoped CRM follows the same boundary. Its system overview is in
[`docs/architecture/crm.md`](docs/architecture/crm.md), with domain model,
tenancy, permissions, provider reuse, compliance, demo behavior and extraction
guidance in [`backend/docs/crm-platform.md`](backend/docs/crm-platform.md).

Supabase remains canonical under `backend/supabase/`; `infrastructure/` owns cross-cutting templates and operations rather than a duplicate database stack.

The single HTTP contract is the OpenAPI 3.1 document at
[`backend/openapi/openapi.json`](backend/openapi/openapi.json). Web, mobile,
admin, and integration consumers use its generated TypeScript paths from
`@shongre/contracts/openapi`; the backend router is checked against the same
contract at boot and in CI. The architecture and API change workflow are in
[`docs/architecture/openapi.md`](docs/architecture/openapi.md) and
[`backend/docs/api.md`](backend/docs/api.md).

## Prerequisites

- Node.js 22 through 26 and npm 10 or newer (see `package.json` engines and `.nvmrc`)
- Docker Desktop (or another Docker-compatible daemon) for local database mode;
  the Supabase CLI is installed project-locally by `make install` (`npm ci`)
- Expo-compatible iOS/Android tooling for local native runs
- macOS and current Xcode for local iOS builds; EAS may build remotely

Run `make doctor` for an evidence-based local tool report. Missing optional native tools do not prevent standalone web/demo work.

## First setup

```bash
make env           # create the ignored local environment if needed
make install       # install every workspace
make supabase-up   # start local Supabase
make db-migrate    # apply ordered migrations
make db-seed       # load deterministic local data
```

Run `make env` first if `.env.local` does not exist. `make setup` remains the
one-command machine bootstrap: it creates the ignored local environment,
installs the npm workspace, renders local Supabase configuration, and runs
diagnostics. Keep staging secrets in `.env.staging.local`, production secrets in
the deployment secret store (or `.env.production.local` for an explicit local
production check), and never commit those local files.

The complete everyday workflow is intentionally small:

```bash
make help       # discover generated command documentation
make doctor     # diagnose the machine and configured modes
make brand-sync # regenerate the curated Web/mobile/document brand subset
make brand-check # validate checksums, mappings, dimensions, and references
make check      # deterministic pre-commit/pre-PR gate
```

Switch profiles per command with `ENVIRONMENT=local|dev|staging|prod`.
`dev` and `prod` are CLI aliases for `development` and `production`;
`APP_ENV` always stays canonical. `SHONGRE_ENV` remains supported when
`ENVIRONMENT` is omitted. With neither selector, the default is local (or an
explicitly exported `APP_ENV`). Nothing persists a production selection.
Environment value precedence is:

```text
local:        exported variable > .env.local > .runtime/supabase.env > .env
test:         exported variable > .env.test.local > .env.test
preview:      exported variable > .env.preview.local > .env.preview
development:  exported variable > .env.development.local > .env.development
staging:      exported variable > .env.staging.local > .env.staging
production:   exported variable > .env.production.local > .env.production
```

Generic `.env`, `.env.local`, and generated local Supabase credentials are never
fallbacks for non-local profiles. All host ports and runtime URLs come from the
selected configuration. Use a fresh shell if you previously sourced an entire
profile: switching an already-loaded shell is rejected to avoid mixing secrets.

```bash
make env-check ENVIRONMENT=local   # validate local Supabase defaults
make env-check ENVIRONMENT=dev     # validate hosted development resources
make env-check ENVIRONMENT=staging # validate staging credentials and sandbox providers
make env-check ENVIRONMENT=prod    # validate production configuration (does not deploy)
make env-info ENVIRONMENT=dev      # inspect non-secret resolved configuration
make env-matrix-check             # isolated six-profile tests; no hosted connections
make production-config-check      # deeper live-provider/release configuration gate
```

The shared `development`, `staging`, and `production` profiles are connected
environments: Web and mobile always use API adapters, and the backend uses the
dedicated hosted Supabase project.

Hosted validation intentionally fails until the corresponding secret store or
ignored `.env.<canonical-profile>.local` supplies that environment's resources.
See [environment preparation and switching](docs/architecture/environments.md#preparing-and-switching-profiles)
for prerequisites and the protected deployment workflow.

## Development

```bash
make dev          # Supabase + Redis/Mailpit + seeded API + worker + connected web
make dev ENVIRONMENT=dev     # restart local processes against hosted development DB
make dev ENVIRONMENT=staging # restart local processes against hosted staging DB
make dev-mobile   # backend API + scheduled worker + one Expo Metro server
make dev-all      # backend API + scheduled worker + web + Expo Metro

make frontend     # API-only Web client at PUBLIC_FR_URL
make backend      # database-backed API at API_URL
make worker       # independent Redis/BullMQ + database-backed worker

make redis-up
make redis-status
make redis-logs
make redis-down
make mail-up
make mail-status
make mail-down

make ios
make android
make mobile-web

make status
make urls         # print all configured service endpoints without credentials
make health       # fails unless the complete Web stack is healthy
make smoke        # health plus anonymous listings request
make logs
make stop-all
```

The development launchers validate first, then restart tracked application
processes so an old API or worker cannot be reused across environments. Only
local starts/migrates/seeds Supabase. Hosted developer launches need their
configured HTTPS routing and operate on real non-production data; normally use
the deployed environment instead. `make dev ENVIRONMENT=prod` and local Docker
commands against hosted profiles are rejected. Production runs only through the
protected deployment workflow:

```bash
make deploy ENVIRONMENT=dev     # dispatch build/development deployment
make deploy ENVIRONMENT=staging # promote the same immutable release to staging
make deploy ENVIRONMENT=prod    # protected production promotion; main only
make remote-health ENVIRONMENT=staging
```

These deploy commands change hosted state when explicitly run. Validation and
profile selection alone never deploy or change DNS, secrets, or databases.

Local development defaults to `BACKEND_DATA_MODE=database` and
`DATABASE_INFRA_MODE=local`. `make supabase-up` starts the repository-owned
Supabase stack and writes generated credentials to ignored
`.runtime/supabase.env`. The backend runner applies migrations through
`make db-migrate`, including the guarded taxonomy prerequisite for an empty
local database; the Supabase CLI does not replay application SQL itself.
`make backend` and `make worker` require that stack and
load those credentials automatically. Redis is the BullMQ and cross-replica
realtime transport; local Mailpit is the mail service already supplied by the
Supabase stack. `make dev` is the one-command connected local workflow: it
stops tracked Shongre application processes, forces backend database mode,
starts Supabase, Redis, and Mailpit, applies
pending migrations, checks and regenerates stale database types, then loads the
deterministic idempotent seed (including taxonomy
v1, market availability, header navigation, accounts, listings, and owned
Storage media), and launches the Nest/Fastify API, independent BullMQ worker,
and Web app. Category navigation and filters are therefore API- and
database-backed. `make frontend` starts the same API-only Web client and
requires a reachable backend.

Local `make dev`, `make dev-web` and `make dev-mobile` also synchronize types
before reusing a healthy stack. Matching files are left untouched; a generation
failure stops the launcher before it starts applications. CI's
`make db-types-check` remains read-only and rejects drift.

Docker must be installed and running first, its data store must be writable, and
the host must have at least 5 GiB free. The startup preflight fails with an
actionable error instead of waiting indefinitely for an unhealthy daemon.
The frontend fails closed when its API is unavailable; it never switches to
browser fixtures or mock storage.

Processes launched through the root tooling are recorded under ignored `.runtime/`. Port collision handling prints the owning PID/command and only terminates a process whose tracked PID belongs to this repository. It never runs a broad `killall`, pattern kill, or blind SIGKILL.

To override a port for one invocation, export it on that command:

```bash
FRONTEND_PORT=3310 make frontend
BACKEND_PORT=4410 make backend
EXPO_METRO_PORT=8181 make mobile
E2E_FRONTEND_PORT=3110 make test-e2e
```

Use `make ports` to see configured values and current owners. `make free-port PORT=…` refuses to kill an unrelated process. Playwright builds one isolated Webpack production checkout, starts its standalone server on `E2E_FRONTEND_PORT`, and removes both afterward; it never borrows the interactive Next.js process.

## Data paths

| Client/runtime | Data path                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------ |
| Web            | Always `NEXT_PUBLIC_API_URL`                                                               |
| Mobile         | Always `EXPO_PUBLIC_API_URL`                                                               |
| Backend        | `BACKEND_DATA_MODE=database` for application runtime; deterministic adapters are test-only |

Canonical local development uses Web/mobile API services and a database-backed
backend. Neither client has a mode preference or a fixture fallback; client
configuration is validated independently for every environment.

Runtime repositories use the Supabase Data API and its managed PostgREST
connection pool. The server-only `DATABASE_URL` is reserved for migrations,
type generation, drift checks, and other administrative database tooling.

## Database and infrastructure

```bash
make supabase-up
make supabase-status
make supabase-health
make migrations-check
make db-migrate
make db-seed
make db-reset
make db-types
make supabase-down
```

Redis persists local AOF data in the Compose-owned `redis-data` volume and is
bound to loopback only. API readiness verifies Redis and PostgreSQL/Supabase;
worker health requires a recent environment-scoped heartbeat after successful
queue/database coordination. Mailpit is reached through the backend email
abstraction and is never a production-provider dependency.

`make db-seed` installs the reviewed commercial baseline plus a repeatable,
production-shaped local scenario: synthetic customer and professional profiles,
marketplace listings, vehicles, properties, tutors, course offers, jobs, and
synthetic conversations, messages, transactions, notifications,
saved searches, reviews, and public media in Supabase Storage. It also creates
one Supabase Auth identity per synthetic profile, links
`profiles.auth_user_id`, and assigns account and Staff roles through the same
database tables used by the backend; it does not keep database-mode passwords
in `public.user_credentials`. Re-running it updates the same stable records
instead of creating duplicates. Run
`make local-fixtures-check` to detect drift or `make local-fixtures-sync` after
an intentional backend-fixture change. The scenario never copies production
identities, real payments, KYC/KYB documents, or provider credentials; private
Storage buckets therefore remain empty until a local workflow creates safe test
data.

Schema changes belong in `backend/supabase/migrations/`. `make migrations-check` validates ordering and contents without connecting to PostgreSQL. Destructive database and demo-seed commands require `APP_ENV=local` and prove that the target host and database name are local; `make db-reset` additionally invokes only the local `backend/supabase` workdir. The generated `backend/supabase/config.toml` is ignored; edit its checked-in template and environment values instead.

## Docker, Cloudflare, and promotion

`compose.yaml` is the canonical hosted topology. It publishes no origin ports;
two pinned `cloudflared` connectors reach Web/API over a private Docker bridge.
`compose.local.yaml` is the only override that binds Web/API, and it binds them
to loopback. Useful local checks are:

```bash
make docker-config
make docker-build
make docker-up
make docker-status
make docker-health
make docker-audit
make docker-down
```

Main CI builds frontend and backend once, attaches SBOM/provenance, scans the
exact digests, writes a release manifest, then deploys DEV. STAGING and
PRODUCTION are promotions of those same digests; production requires the
matching STAGING certification and GitHub Environment approval. Rollback
redeploys an original known-good manifest and never rebuilds or reverses a
migration. Host bootstrap, Tunnel routes, token isolation and failure handling
are in [`docs/operations/docker-cloudflare-deployment.md`](docs/operations/docker-cloudflare-deployment.md)
and [`infrastructure/cloudflare/README.md`](infrastructure/cloudflare/README.md).

## Quality

```bash
make lint
make typecheck
make test
make test-critical
make test-e2e
make check
make check-all

make frontend-build
make backend-build
make mobile-check
make infra-check
make ui-check
make cross-platform-check

make openapi-check       # contract lint, generated-artifact and route parity
make openapi-docs        # build the standalone Redoc API reference
make crm-check           # focused CRM contracts, services, RLS and provider boundaries
```

`make check` validates the environment and migrations, formatting, all workspaces, tests, Web/backend builds, infrastructure configuration, tracked-secret scanning, runtime-hostname policy, and frontend/backend boundaries. `make test-critical` is a focused gate for authentication/RBAC, listing lifecycle and ownership, messaging, payments/escrow/finance, monetization/entitlements, verification/compliance, provider safety, and public data boundaries. `make check-all` adds the focused critical gate, cross-platform propagation, browser E2E, and the high-severity dependency audit. Native/store-specific checks inspect generated projects after `make mobile-prebuild-clean`.

## Mobile and store readiness

The mobile application uses Expo SDK 57, React Native 0.86, React 19.2, and Expo Router. Stable identifiers, application version, iOS build number, Android versionCode, deployment target, SDK targets, privacy manifest, permissions, and deep-link domains are driven by `mobile/app.config.ts` plus release environment variables.

```bash
make mobile-prebuild-clean
make expo-doctor
make android-sdk-check
make android-16kb-check
make ios-sdk-check
make permissions-check
make privacy-check
make store-check
```

Store-check uses `PASS`, `FAIL`, `WARNING`, `MANUAL REVIEW REQUIRED`, and `NOT APPLICABLE`. It is a preflight, never a claim that Apple or Google will approve the app. Current evidence and human tasks live in `mobile/store/` and `docs/compliance/`.

On macOS, verify the native iOS Release source graph without signing after the
generated workspace exists:

```bash
cd mobile/ios
pod install
bash -c 'source ../../scripts/env.sh && export NODE_ENV=production && \
  xcodebuild -workspace Shongre.xcworkspace -scheme Shongre \
  -configuration Release -destination "generic/platform=iOS Simulator" \
  CODE_SIGNING_ALLOWED=NO ARCHS=arm64 ONLY_ACTIVE_ARCH=YES \
  DEBUG_INFORMATION_FORMAT=dwarf GCC_GENERATE_DEBUGGING_SYMBOLS=NO build'
```

The Bash wrapper is required because `scripts/env.sh` owns the non-secret Expo
release configuration. This validates compilation, Hermes bundling, linkage,
resources, and app packaging; it does not replace a signed device archive or
store submission checks. Allow several gigabytes of free disk space for a first
native build.

Universal/App Link files require real signing identities. Configure `APPLE_TEAM_ID` and `ANDROID_SHA256_CERT_FINGERPRINT`, then run `make association-files`, deploy the generated ignored files over HTTPS, and verify them with `make deep-links-check`.

Build, submit, and release remain separate actions:

```bash
make ios-preview-build
make android-preview-build
make ios-production-build
make android-production-build

# Explicit submission only after preflight and human approval
make submit-ios
make submit-android
```

Production credentials, keystores, certificates, App Store Connect keys, Play service accounts, EAS credentials, and reviewer passwords must never be committed.

## Safety and privacy implemented

- mobile sessions use Keychain/Keystore through Expo SecureStore;
- production endpoint checks require stable HTTPS and reject local, LAN, emulator, and tunnel hosts;
- account deletion is available in mobile and on the public web, with reauthentication, active-order protection, anonymization, credential/token revocation, and audit state;
- UGC users can report and server-authoritatively block/unblock, and blocked users cannot send messages;
- push registration is associated with the authenticated account and removed on logout/deletion;
- declared native permissions are limited to selected photos and notifications with usable fallbacks;
- analytics, advertising, tracking, camera, contacts, microphone, device location, and crash-reporting SDKs are not enabled today;
- physical marketplace payments are separated from digital promotion/subscription features, which remain unavailable in mobile until a current billing-policy review approves an implementation.

The final privacy policy, exact retention periods, processor list, store-console declarations, reviewer credentials, ratings, signing, signed-artifact checks, metadata, and rollout remain human/legal/operations responsibilities.

## Business rules and monetization

Commercial configuration is versioned and backend-authoritative. Start with:

- `docs/architecture/business-rules-monetization.md` for the domain, APIs, precedence, security, quote, payment, and entitlement lifecycle;
- `docs/implementation/monetization-migration-map.md` for the audited sources and consumer migration evidence;
- `docs/operations/monetization-admin-guide.md` for safe draft, approval, scheduling, rollback, and incident procedures.

The machine-readable baseline and localized reason-code reference are exported from `@shongre/contracts/monetization-catalog`.

## Repository map

```text
frontend/                 Next.js App Router Web app, demo + HTTP adapters
backend/                  Node modular monolith, repositories, API, tests
backend/supabase/         canonical migrations, policies, functions, local config template
mobile/                   single Expo iOS/Android source and generated native projects
mobile/store/             Apple, Google, privacy, permission, and release evidence
packages/design-tokens/   canonical visual values and generated platform adapters
packages/ui/              shared Web/native primitive APIs
packages/features/        shared feature presentation and interaction rules
packages/shared/          framework-free formatting and validation
brand/                    immutable, versioned visual-identity source kits
packages/brand/           generated runtime brand metadata/document adapter
packages/contracts/       generated OpenAPI types plus stable domain schemas
infrastructure/           cross-cutting operations and association-file templates
compose.yaml               private hosted Web/API/worker/cloudflared topology
compose.local.yaml         explicit loopback-only Docker development override
scripts/                  environment, process, port, health, and infrastructure tooling
docs/                     architecture, security, operations, and current store baseline
Makefile                  canonical developer and release CLI
AGENTS.md                 mandatory engineering rules and durable lessons
```

Run `make help` for the canonical command list.

## Multi-country Web routing

One Next.js deployment serves the two canonical domains. France stays at
`https://shongre.fr/*`; the international gateway is
`https://shongre.com/`; Belgium and Switzerland use `/be/*` and `/ch/*`.
Sénégal and Burkina Faso currently resolve to fail-closed launch pages at
`/sn/*` and `/bf/*`.

Local development keeps the historic France root and exposes every market as a
path:

```bash
make install
make dev

# France
open "$PUBLIC_FR_URL/"
# Global gateway (the .localhost name resolves to loopback on modern browsers)
open "http://global.localhost:${FRONTEND_PORT}/"
# Country paths
open "$PUBLIC_INTL_URL/be/"
open "$PUBLIC_INTL_URL/ch/"
open "$PUBLIC_INTL_URL/sn/"
open "$PUBLIC_INTL_URL/bf/"
```

The frontend is API-only; local routes require the repository-owned backend and
Supabase stack started by `make dev`.
Architecture, deployment, redirects, auth handoff, SEO and the public URL
migration map are documented in
[`docs/architecture/multi-country.md`](docs/architecture/multi-country.md).
