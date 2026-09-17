# Shongre environment and deployment architecture

## Outcome and ownership

Shongre has one source tree, one modular backend, one `/api/v1` business route
tree, one OpenAPI contract, one country registry, and one migration history.
Environment differences are externally supplied configuration and isolated
infrastructure—not branches, copied applications, route forks, or country
deployments.

| Concern                                                                | Authority                                               |
| ---------------------------------------------------------------------- | ------------------------------------------------------- |
| Environment type, URL validation, safety matrix                        | `packages/contracts/src/app-environment.ts`             |
| Country identity, locale/currency defaults, canonical domain mode/path | `packages/contracts/src/market-country.ts`              |
| Local/profile loading                                                  | `scripts/env.sh`                                        |
| Shell/deployment validation                                            | `scripts/env-check.sh`                                  |
| Backend secrets and provider configuration                             | `backend/src/app/config/index.ts`                       |
| Web server/browser URL projection                                      | `frontend/src/platform/market/market-infrastructure.ts` |
| Mobile URL projection                                                  | `mobile/src/config/environment.ts`                      |
| API contract                                                           | `backend/openapi/openapi.json`                          |
| Database history                                                       | `backend/supabase/migrations/`                          |
| Operator CLI                                                           | root `Makefile`                                         |

Application code consumes these boundaries. Components, domain services,
emails, SEO, OAuth, webhooks, mobile, and API clients must not invent deployment
origins or read alternative aliases.

## Canonical environment model

`APP_ENV` is exactly one of:

```text
local | test | preview | development | staging | production
```

`NODE_ENV` remains a framework/build control only. It does not choose Shongre
infrastructure, provider safety, indexing, payment mode, or business behavior.
Every deployment has a non-secret `ENVIRONMENT_ID`; the API, Supabase, Storage,
Web, and mobile fingerprints must match it. Hosted Supabase configuration also
supplies `SUPABASE_PROJECT_REF` and `EXPECTED_SUPABASE_PROJECT_REF`, which must
match exactly.

## Environment matrix

| Capability          | Local                      | Test                     | Preview              | Development          | Staging                  | Production                   |
| ------------------- | -------------------------- | ------------------------ | -------------------- | -------------------- | ------------------------ | ---------------------------- |
| France Web          | configured loopback        | isolated loopback        | dynamic              | `dev.shongre.fr`     | `staging.shongre.fr`     | `shongre.fr`                 |
| International Web   | same origin + country path | isolated loopback        | dynamic              | `dev.shongre.com`    | `staging.shongre.com`    | `shongre.com`                |
| API                 | configured loopback        | isolated loopback        | dynamic              | `api-dev.shongre.fr` | `api-staging.shongre.fr` | `api.shongre.fr`             |
| Supabase/DB/Storage | local                      | isolated local/ephemeral | isolated preview/dev | `shongre-dev`        | `shongre-staging`        | `shongre-prod`               |
| Payments            | test                       | test                     | test                 | test                 | test                     | live                         |
| Email               | console                    | console                  | sandbox              | sandbox              | sandbox                  | live                         |
| AI                  | mock                       | mock                     | development          | development          | staging                  | production or encrypted BYOK |
| Analytics           | off                        | test                     | test                 | development          | staging                  | production                   |
| Search indexing     | disabled                   | disabled                 | disabled             | disabled             | disabled                 | enabled                      |
| Real customers      | no                         | no                       | no                   | no                   | no                       | yes                          |
| Web transport       | API                        | isolated API             | isolated API         | API                  | API                      | API                          |
| Web mock storage    | unavailable                | unavailable              | unavailable          | unavailable          | unavailable              | unavailable                  |
| Mobile transport    | API                        | API                      | isolated API         | API                  | API                      | API                          |

The table describes deployment intent. Executable enforcement comes from the
typed safety module, environment validator, startup checks, and protected
deployment workflow.

Local is the only developer environment allowed to bind the backend to local
database infrastructure. Test uses an isolated local/ephemeral database or the
deterministic backend adapter. Preview and every shared environment use hosted,
environment-owned infrastructure. Canonical local development, development,
staging, and production run Web through the API. Mobile always uses the API,
including test and preview; local client development reaches the database-mode
backend backed by local Supabase. Neither client has a data-mode selector,
fixture fallback, or mock-storage path.
Shared development, staging, and production runtimes also require their own JWT,
MFA, handover, provider-credential, and digital-fulfillment keys at startup;
fixed local development keys are never accepted there.

## URL and country routing

Deployment configuration supplies three origin-only URLs:

```env
PUBLIC_FR_URL=
PUBLIC_INTL_URL=
API_URL=
```

The split Web runtime additionally requires four explicit application origins
in staging and production:

```env
SHONGRE_MARKETPLACE_ORIGIN=
SHONGRE_SOLUTIONS_ORIGIN=
SHONGRE_PROSPECTS_ORIGIN=
SHONGRE_FACTURATION_ORIGIN=
```

Those four values must be distinct HTTPS hosts. Tracked staging and production
profiles intentionally leave them empty: the deployment owner must bind the
reviewed DNS/TLS topology in the host-managed frontend environment file.

The client projections are derived from them. `NEXT_PUBLIC_API_URL` and
`EXPO_PUBLIC_API_URL` must be the configured API origin plus `/api/v1`.

France has `canonicalDomainMode=france` and `/`. International countries have
`canonicalDomainMode=international` and a country path such as `/be`, `/ch`,
`/sn`, or `/bf`. Market configuration never stores a concrete deployment
hostname. Migration `00065_environment_owned_market_domains.sql` removes the
old mutable `primary_domain` column for this reason.

Country and language are independent. A market selects jurisdiction and market
policy; a supported locale selects language/formatting. Belgium can therefore
be `market=BE` with `locale=fr-BE` or `nl-BE`, and Switzerland can support
French, German, and Italian without becoming three markets.

`resolveMarketContext`, `buildPublicUrl`, and `buildMarketSwitchUrl` own public
URL resolution. SEO canonical URLs, Open Graph, JSON-LD, `hreflang`, sitemaps,
share links, email links, notification links, and auth handoffs use those
builders. Non-production Web responses add `X-Robots-Tag: noindex, nofollow`,
robots disallows crawling, and sitemaps are empty/404.

## Preparing and switching profiles

Use `make <target> ENVIRONMENT=local|dev|staging|prod`. Selection is scoped to
that command and its children; it never rewrites `.env.local`, persists an
active production target, or switches a signed-in browser/native session to a
different backend. `dev`/`prod` normalize to `development`/`production` only at
the operator CLI boundary. Existing `SHONGRE_ENV` commands remain supported;
an explicit Make `ENVIRONMENT` takes precedence. `APP_ENV` must match the
selected canonical profile. Start a fresh shell if you previously sourced a
different profile instead of carrying its exported credentials across targets.

| Target      | Preparation                                                                                                                                | Validate and inspect                 | Run or deploy                     |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------ | --------------------------------- |
| Local       | `make env`, then local Supabase setup from the README                                                                                      | `make env-check ENVIRONMENT=local`   | `make dev ENVIRONMENT=local`      |
| Development | Dedicated hosted project, fingerprints, runtime secrets and HTTPS origins                                                                  | `make env-check ENVIRONMENT=dev`     | `make deploy ENVIRONMENT=dev`     |
| Staging     | Dedicated hosted project, sandbox provider bindings, split HTTPS origins, recipient allowlist and staging journey fixtures                 | `make env-check ENVIRONMENT=staging` | `make deploy ENVIRONMENT=staging` |
| Production  | Dedicated production secrets/resources, split HTTPS origins, live provider configuration, certified staging release and protected approval | `make env-check ENVIRONMENT=prod`    | `make deploy ENVIRONMENT=prod`    |

`make env-info ENVIRONMENT=<target>` prints only the validated non-secret
resolution. `make env-matrix-check` tests all six profiles using temporary copies
of committed configuration, dummy resource bindings and an isolated process
environment; it never reads operator secrets or contacts hosted services.
Passing that synthetic matrix is not evidence that a hosted environment is
provisioned or release-certified. Missing credentials must remain failures,
not be replaced by fabricated production configuration.

Root loading precedence is exported variables, then `.env.<profile>.local`,
then `.env.<profile>`. Only local uses `.env.local`, generated
`.runtime/supabase.env`, and generic `.env` in that order. Non-local commands
never inherit fallback values from those files. The Web launcher, backend and
mobile release checks do not re-import root local files after profile loading.
Keep application-level dotenv files local-only; hosted artifacts receive their
complete runtime configuration from the secret store, not bundled env files.

`make dev ENVIRONMENT=dev` and `make dev ENVIRONMENT=staging` are explicit
developer-hosted process launches against those real non-production databases.
The `make dev-development` convenience target and retained `make dev-staging`
and `make staging` aliases select the same workflow. They need the configured HTTPS
origins routed to those processes. Validation precedes process cleanup; successful
launches stop the tracked old application stack before starting a new one.
Only local starts Supabase and runs migrations/seed. Never point these launchers
at production: production service startup and non-local use of the local Docker
override are rejected. Use the protected deployment targets for hosted rollout.

`NODE_ENV` follows the Web command (`development` for the development compiler,
`production` for build/start), independent of `APP_ENV`. Hosted release
promotion keeps the same image digests and uses Shongre's existing server-to-
browser runtime configuration projection; it does not rebuild public values
for each environment. Native configuration is bundled by Expo: switching its
profile requires restarting Metro and rebuilding when native configuration or
identifiers change, not a runtime settings toggle.

## Variables and secrets

Commit-safe profile files contain non-secret topology, modes, ports, and empty
credential slots. Ignored `.env.<profile>.local` files may be used for explicit
operator checks. Each hosted Docker runner reads a public-only frontend file
and a separate backend runtime/secret file from its host; the Tunnel token is a
third private file mounted as a Compose secret. GitHub Environment variables
contain only their paths, never the values.

Public variables are limited to browser/mobile-safe configuration such as:

```text
NEXT_PUBLIC_APP_ENV, NEXT_PUBLIC_ENVIRONMENT_ID
NEXT_PUBLIC_FR_URL, NEXT_PUBLIC_INTL_URL, NEXT_PUBLIC_API_URL
EXPO_PUBLIC_APP_ENV, EXPO_PUBLIC_ENVIRONMENT_ID
EXPO_PUBLIC_FR_URL, EXPO_PUBLIC_INTL_URL, EXPO_PUBLIC_API_URL
```

Analytics provider flags follow the same runtime-only model. Browser-safe
project/site identifiers use `NEXT_PUBLIC_*`; PostHog/GA4/Matomo delivery
secrets, the Search Console service-account JSON and backend Sentry settings are
server-only. Tracked profiles keep optional providers disabled and credential
slots empty. The complete provider matrix and activation sequence are in
[`analytics.md`](analytics.md).

Web Push follows the same model: `WEB_PUSH_SUBJECT`,
`WEB_PUSH_VAPID_PUBLIC_KEY` and `WEB_PUSH_VAPID_PRIVATE_KEY` are backend-only
runtime values (generate a pair with `make web-push-keys`); the public key
reaches the browser through `GET /api/v1/notifications/web-push/config`, never
through a `NEXT_PUBLIC_*` value, and the channel stays unavailable while the
slots are empty. See
[`marketplace-automation.md`](../../backend/docs/marketplace-automation.md).

Sentry source-map publication is build-only. Configure the repository secret
`SENTRY_AUTH_TOKEN` and repository variables `SENTRY_ORG`,
`SENTRY_FRONTEND_PROJECT`, `SENTRY_BACKEND_PROJECT`, plus `SENTRY_URL` only for
a non-default Sentry API endpoint. BuildKit mounts them ephemerally while the
single immutable image pair is built; runtime images contain neither those
values nor source-map files.

Database URLs, service-role keys, Stripe secret/webhook keys, provider API keys,
OAuth client secrets, private keys, email tokens, KYC credentials, and BYOK
material are server-only. BYOK credentials remain encrypted and tenant-scoped;
they are never promoted between environments automatically. CI runs both the
tracked-secret scanner and the frontend/backend boundary scanner.

Application repositories reach PostgreSQL through the Supabase Data API, whose
managed PostgREST layer owns runtime connection pooling. `DATABASE_URL` is a
server-only direct administrative connection used by the migrator and database
tooling; it is not loaded into Web/mobile bundles or used to open a connection
per request.

## Supabase, migrations, seeds, and Storage

Local uses Supabase Local. Development, staging, and production require
separate Supabase projects, including separate PostgreSQL, Auth, Storage,
Realtime, RLS, functions, queues, cron, secrets, and event state. Table/schema
prefixes inside one project are not environment isolation.

The only migration history is `backend/supabase/migrations/`. It is applied in
order from local/test to development, staging, and production. CI reconstructs
a clean database and verifies immutable migration checksums. Production uses
forward fixes; rollback reverts immutable application images while keeping
compatible expanded schema.

Reference configuration belongs in migrations or reviewed configuration
records. The seed command installs the reviewed commercial baseline and a
deterministic, production-shaped local scenario in PostgreSQL and public
Storage. Every synthetic profile is provisioned in local Supabase Auth and
linked through `profiles.auth_user_id`; password hashes are not duplicated in a
public-schema credential table. Account and Staff roles remain authoritative in
`profiles` and `staff_memberships`, not Auth metadata. Its identities and
content are synthetic; production customer data, payments, messages, private
documents, and provider credentials are never seed inputs. Seed and reset
commands require `APP_ENV=local` plus a proven local database target. They
refuse hosted and production targets even when an operator sets a permissive
flag. A fresh local database imports the reviewed taxonomy before migration
`00125` (the v1 reference conversion needs the reviewed categories), so the
compiled seed `taxonomy-v1.generated.sql` must apply against the schema as of
`00124`: a column a later migration adds — such as `00140`'s field icons — is
written inside a guarded `DO` block that the bootstrap skips and a later import
converges on. The seed also rebuilds the search vocabulary so autocomplete
answers before the scheduled worker's first run.

Local PostgreSQL and isolated browser scenarios share `createSeedListing`.
It preserves seller pricing in `attributes.price_type` and explicit reservation
eligibility in each market publication's `availableServices`, including its
reservation type. Listing detail actions consume those public API fields;
missing eligibility must never be inferred from price or payment availability.
Local placement examples also persist deterministic `admin_grant` records in
`listing_promotions`, scoped to the listing's market and fixture schedule.
Database triggers derive the effective publication and opaque public proof;
listing flags alone cannot activate a placement. Re-running `make db-seed`
reuses these grant identities without creating purchases or charging providers.

Storage uses environment-local Supabase Storage. Public listing derivatives and
avatars are separate from upload staging/quarantine. KYC/KYB and other sensitive
documents stay private behind RLS and signed, short-lived access. The
`STORAGE_ENVIRONMENT_ID` startup check prevents a lower environment from using a
production storage binding. Bucket names describe data purpose, not deployment
environment; isolation is provided by separate Supabase projects. Connected Web
runtimes receive public editorial and category-card prefixes through
`PUBLIC_MEDIA_ASSET_BASE_URL` and `PUBLIC_CATEGORY_MEDIA_BASE_URL`; these values
contain no credentials and must point at the current environment's public
Storage project.

## Provider safety

Provider implementations are shared. Configuration selects provider and mode:

- lower environments reject live payment/email and production AI/analytics;
- staging email is sandboxed and recipients must match the explicit exact/domain
  allowlist;
- production requires live Stripe, signed webhooks, live delivery, production
  AI/analytics, non-demo KYC/registry providers, and complete encrypted-secret
  configuration;
- preview receives no production secrets, queues, cron, campaigns, webhooks, or
  customer data;
- webhook and OAuth callback endpoints stay under the validated canonical API
  origin, and provider URLs come from validated backend configuration;
- OAuth return origins are exact configured origins. Suffix matching and
  wildcard redirects are rejected.

Webhook event stores and idempotency keys are environment-local. Signing
secrets are never shared across development, staging, and production.
Structured backend logs always include `APP_ENV` and `ENVIRONMENT_ID`; known
credential fields, bearer tokens, configured secrets, and nested errors are
redacted before serialization.

## CI/CD and artifact promotion

Pull requests run install, environment/migration validation, formatting, lint,
typechecks, unit/integration/security/RLS tests, generated OpenAPI drift,
contract breaking checks, secret and hostname scans, dependency audit, container
builds, three-browser E2E, clean-database migration reconstruction, and the
database-mode browser journeys against the seeded local Supabase stack.

`build-deploy-dev.yml` runs after successful main CI. Buildx creates exactly one
frontend and one backend image, attaches OCI SBOM/provenance, scans immutable
digests, writes a release manifest and deploys DEV. `promote-staging.yml` and
`deploy-production.yml` resolve that manifest rather than rebuilding. STAGING
persists browser/Tunnel certification tied to commit, both image digests,
OpenAPI digest and migration revision; production refuses a mismatch. The
reusable deployment workflow targets outbound environment-specific Docker
runners, runs the exact-image migrator once, rolls out root `compose.yaml`, then
checks private readiness, cloudflared HA metrics and public endpoints.

GitHub `production` must require human approval and restrict its dedicated
runner. Development and staging should also limit deployers. Both frontend and
backend digests are byte-identical across environments; the Next server injects
validated public configuration at runtime.

Preview is deliberately dynamic. Configure the hosting platform/Git integration
to inject `APP_ENV=preview`, a preview-specific fingerprint, explicit dynamic
France/international/API origins, and isolated non-production resources. Web
may use its explicit deterministic adapter when an isolated API is unavailable;
a mobile preview must fail configuration or remain undistributed until its
isolated API exists. Neither client may silently point a preview to production.

## Health, observability, backup, and rollback

`/livez` is shallow liveness and `/readyz` is dependency-aware readiness.
`/api/health` and `/api/ready` are documented compatibility names. Responses
contain only status, service, version, `APP_ENV`, release identifier, and safe
dependency state. Structured HTTP logs include request/trace IDs, latency,
status, and environment-safe context; they do not include tokens, credentials,
auth codes, full private payloads, or database URLs.

Backups/PITR, restore testing, incident response, alerting, and data recovery are
covered by `docs/operations/backup-restore.md`, `incident-response.md`, and
`release.md`. Roll back images with the protected workflow. Never run a
destructive down migration. If schema caused the incident, disable the affected
capability and ship a forward correction; restore only for confirmed data loss
or corruption and reconcile external payment state afterward.

## DNS, CDN, and TLS actions

Three persistent remote-managed Cloudflare Tunnels route the France and
international Web hosts to `frontend:${FRONTEND_PORT}` and each flat API host
to `backend:${BACKEND_PORT}`. The Docker hosts expose none of those ports. Bind edge TLS for
every explicit hostname; configure WAF, rate limits and host-aware cache keys.
Do not cache one domain's redirects, canonicals or HTML under another host key.

Production also needs reviewed redirects for `www` aliases and any legacy
France-under-`.com` routes. Preview hosts remain platform-generated and are not
enumerated in source.

## External console actions

Repository code cannot create commercial accounts or approve production access.
Before enabling a target, operators must:

- create/bind the three Supabase hosted projects, load secrets, configure Auth
  site/redirect URLs, apply migrations, verify RLS/buckets, and enable PITR;
- create protected GitHub environments, environment-specific outbound runner
  labels, manual production reviewers and the host file-path variables used by
  `reusable-deploy.yml`;
- provision isolated Docker hosts, host-managed env/Tunnel files, GHCR pull
  access, monitoring, alerting, backup jobs and a second production connector
  host where host-level HA is required;
- create the three remote-managed Tunnels and public-hostname DNS/TLS/WAF routes
  documented under `infrastructure/cloudflare/README.md`;
- bind Web domains in Vercel if Vercel is chosen for Web hosting, disable
  production secrets in preview, and inject the canonical public variables;
- register exact Google, Apple, and Facebook callbacks generated from each
  target API origin; register mobile schemes/associated domains separately;
- register separate Stripe test/live webhooks and secrets, email sandbox/live
  domains and allowlists, KYC callbacks, push credentials, maps, monitoring, and
  analytics projects per environment;
- configure GitHub branch protection for `main`, required CI checks, production
  reviewers, and restricted secret access.

## Commands

```bash
# Local setup and diagnostics
make setup
make dev # restart, migrate, seed, and run the connected local Web stack
make env-info
make doctor
make status
make logs
make stop

# Validation
make env-matrix-check
make env-test
make check
make test
make test-e2e
make test-web-database-mode
make openapi-check

# Local database only
make supabase-up
make db-migrate
make db-reset
make db-seed
make local-fixtures-check
make supabase-down

# Protected remote operations
make deploy-dev
make deploy-staging
make deploy-prod
make remote-health ENVIRONMENT=staging
make rollback ENVIRONMENT=staging RELEASE_SHA=<known-good-full-sha>
```

Deployment and rollback commands dispatch the protected workflow; they do not
bypass approvals or expose credentials in the local shell.
