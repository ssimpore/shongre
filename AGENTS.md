# Shongre engineering rules

This file contains durable instructions for coding agents working in the Shongre
repository. Shongre is a multi-market classifieds and transactional marketplace
for individual and professional users, organizations, operators, and trust,
safety, support, finance, and administration teams.

Read this file before changing the repository. Use **must** and **never** as
requirements, **should** and **prefer** as strong guidance, and **may** for
optional approaches.

## Contents

- [Working method and instruction maintenance](#working-method-and-instruction-maintenance)
- [Repository ownership and dependency boundaries](#repository-ownership-and-dependency-boundaries)
- [Developer CLI, environments, and local processes](#developer-cli-environments-and-local-processes)
- [API-only client architecture](#api-only-client-architecture)
- [Backend, OpenAPI, and domain ownership](#backend-openapi-and-domain-ownership)
- [Database, migrations, and storage](#database-migrations-and-storage)
- [Identity, authorization, security, and privacy](#identity-authorization-security-and-privacy)
- [Markets, countries, localization, and URLs](#markets-countries-localization-and-urls)
- [Marketplace domain invariants](#marketplace-domain-invariants)
- [UI, accessibility, and performance](#ui-accessibility-and-performance)
- [Web rendering, SEO, and public discovery](#web-rendering-seo-and-public-discovery)
- [Mobile and store release safety](#mobile-and-store-release-safety)
- [CRM, providers, marketing, and analytics](#crm-providers-marketing-and-analytics)
- [Deployment and operations](#deployment-and-operations)
- [Testing and definition of done](#testing-and-definition-of-done)
- [Canonical documentation](#canonical-documentation)

## Working method and instruction maintenance

- Inspect the existing implementation, tests, configuration, and working tree
  before proposing a replacement. Preserve unrelated and uncommitted user work.
- Improve incrementally. Reuse and consolidate working systems; do not rewrite
  Shongre or introduce a second architecture to avoid understanding the first.
- When asked to implement or improve something, complete the safe in-scope
  implementation and verification; do not stop at an audit unless the user asks
  for analysis only.
- Use repository evidence to resolve non-critical ambiguity. Preserve existing
  behavior when evidence is insufficient, and report material uncertainty
  instead of inventing policy, legal facts, provider support, or production
  configuration.
- Keep comments focused on rationale. Keep task notes, incidents, completed bug
  stories, retrieved policy snapshots, and progress reports in canonical docs,
  issues, or Git history rather than in this file.

### Clean repository after every task

- After every repository modification, agents must inspect the complete
  task-affected scope and leave it clean. Remove code made dead or unreachable
  by the task, including unused imports, exports, variables, parameters,
  functions, types, components, hooks, styles, assets, files, dependencies,
  feature flags, compatibility layers, commented-out implementations,
  temporary scripts, debug statements, stale generated output, and obsolete
  documentation. Cleanup is part of completion, not optional follow-up work.
- Migrate every consumer before deletion. Prove that a candidate is obsolete
  with repository-wide reference searches and the relevant compiler, linter,
  dependency, route, test, and build evidence. Update affected tests and
  documentation at the same time. Prefer existing shared primitives over new
  duplicates, and never add speculative abstractions, fallback paths, parallel
  implementations, or compatibility code for hypothetical future use.
- Cleanup authority is limited to the task's change scope. Never delete
  unrelated code or user-owned changes, intentional public APIs, required
  generated files, migrations, fixtures, tests, or platform assets merely
  because static analysis reports them as unused. Intentionally retained items
  must have a concrete compatibility, ownership, generation, or platform reason
  recorded in the final report.
- Never commit caches, logs, build outputs, backups, scratch files, temporary
  files, or other disposable artifacts. Before completion, inspect `git status`
  and the complete final diff so only intentional task-related changes remain.

Treat maintenance of this file as part of every implementation:

1. Re-read the instructions relevant to the changed area.
2. Decide whether the change establishes or alters a durable architecture,
   security, legal, data, release, or verification invariant.
3. Update this file in the same change only when future agents need that durable
   knowledge. Ordinary code changes do not require an instruction change.
4. Search for the existing canonical rule and edit it; never append a duplicate.
5. Remove or revise rules made obsolete by the implementation.
6. Verify every referenced path, symbol, environment key, and command.
7. Review the final instruction diff for contradictions, duplicated meaning,
   temporary details, and unnecessary growth.

## Repository ownership and dependency boundaries

The canonical monorepo layout is:

```text
frontend/              Next.js Web application
mobile/                one Expo/React Native application for iOS and Android
backend/               TypeScript modular monolith and privileged integrations
brand/                 immutable, versioned source brand kits
packages/contracts/    stable public schemas and generated OpenAPI types
packages/design-tokens/ canonical visual tokens
packages/brand/        generated/runtime brand metadata and document assets
packages/shared/       framework-independent shared utilities
packages/ui/           shared Web/native primitives
packages/features/     shared feature presentation
infrastructure/        deployment and operational templates, not app source
docs/                  cross-cutting architecture, compliance, and runbooks
scripts/ + Makefile    repository-level tooling
```

- Application code must stay in its owning application. Do not recreate root
  `src/`, `app/`, `api/`, `server/`, `functions/`, `ios/features`, or
  `android/features` trees.
- Backend implementation, Supabase administration, provider secrets, workers,
  webhooks, database types, and migrations must remain under `backend/`.
- Web and mobile must never import backend implementation. They communicate
  through service contracts and the canonical generated transport contract.
- Root files should coordinate the monorepo. `infrastructure/` must not become a
  second application or Supabase implementation.
- Only genuinely stable cross-client schemas and view/transport primitives
  belong in `packages/contracts/`. Database rows, router internals, service-role
  details, fraud rules, and private domain models are not public contracts.
- Shared-package dependencies flow one way:

  ```text
  design-tokens / contracts
            ↓
  brand / shared / ui
            ↓
  features
            ↓
  frontend / mobile
  ```

  Backend may consume contracts and framework-independent shared schemas, but
  never UI, React Native, application routes, or application components.

- The active kit's `08_Design_Tokens/` files are the only editable source for
  official SHONGRE. palette values. `packages/design-tokens/` is the only
  application token system: its generated brand adapter feeds the existing
  semantic tokens. Shongre Orange is defined exactly once in the active kit.
  Every solid orange role, including primary, hover, active, fill, emphasis,
  and orange category accents, must equal the logo swatch exactly. The private
  typed recipe may change only alpha for subtle surfaces, borders, shadows,
  and disabled roles; never blend another orange or override it locally.
  Filled orange controls use `on-primary` / `colors.action.onPrimary` for the
  official logo-white text and icons, with no component foreground overrides.
  Keep contrast failures visible for this exact brand pairing; never silence
  the accessibility checks or introduce local color corrections.
  Inverse and danger controls retain their own foregrounds.
  Small labels on subtle orange surfaces use the shared main text foreground.
  Inverse surfaces, borders, and text derive from the official
  ink; shared footers and the Pro button use the same `surface-inverse` base,
  with distinct ink-derived hover, muted, and deep states.
  Raw colour primitives are private to
  `packages/design-tokens/src/theme.ts`; application and shared UI code must use
  typed semantic roles and must never request Tailwind hue/shade ramps, literal
  HEX/RGB/HSL/OKLCH or named white/black/orange colours, define local colour
  variables, or expose a raw palette adapter. Official flag/provider artwork
  colours remain typed non-themeable registries from that same source. A Web/mobile
  compatibility file may be a thin generated adapter, not a competing token or
  component system. Run `make tokens-check` after any visual-token change.
- `brand/shongre/brand.config.json` is the only active-brand selector. Change
  only `activeVersion`, preferably through
  `npm run brand:activate -- vX.Y.Z`; the transactional command validates the
  complete candidate before changing state, synchronizes every adapter, runs
  the full quality/browser/platform gate, and restores the prior selector and
  generated files on failure. A compatible brand release must preserve the
  centrally mapped kit contract and identify its own version in `VERSION.txt`
  and design tokens. Application code, tests, and documentation must not
  hardcode an active kit version or bypass the generated registries with a
  runtime asset path. Run `make brand-sync` after a reviewed manual selector
  edit and `make brand-check` to verify selection, checksums, mappings, cache
  keys, generated drift, and approved artwork. Never expose the full kit
  publicly or edit generated runtime copies by hand.
- Prefer a modular monolith and narrow platform adapters. Do not introduce
  microservices, micro-frontends, parallel native business UIs, overlapping
  state libraries, or generic abstraction frameworks without measured need and
  explicit architectural approval.

## Developer CLI, environments, and local processes

- The root `Makefile` is the human-facing developer and release CLI. Run
  `make help` before inventing a command, script wrapper, or package-level
  workflow. Documentation and CI should use canonical Make targets.
- `.env.example` is the canonical variable template. The supported application
  environments are `local`, `test`, `preview`, `development`, `staging`, and
  `production`.
- `APP_ENV` selects Shongre environment behavior. `NODE_ENV` may affect framework
  mechanics but must not select infrastructure, provider modes, indexing,
  security, or business policy. Operator selection uses command-scoped
  `make <target> ENVIRONMENT=local|dev|staging|prod`; CLI aliases normalize to
  canonical environment names. Never persist an active production profile or
  re-source a different profile into an already-loaded shell. Generic `.env`,
  `.env.local`, and generated local Supabase credentials are local-only
  fallbacks; downstream launchers must not re-import them after root loading.
- Parse environments and origins through `@shongre/contracts/environment`.
  Runtime origins come from `PUBLIC_FR_URL`, `PUBLIC_INTL_URL`, and `API_URL`.
  Do not hardcode environment hostnames or fallback ports in application source,
  package scripts, framework configuration, native projects, or Make recipes.
- Split Web application origins come only from `SHONGRE_MARKETPLACE_ORIGIN`,
  `SHONGRE_SOLUTIONS_ORIGIN`, `SHONGRE_PROSPECTS_ORIGIN`, and
  `SHONGRE_FACTURATION_ORIGIN`. Production must provide all four as distinct
  HTTPS origins; application source must not supply production defaults.
- Every runtime binding must carry the configured environment fingerprint.
  Hosted Supabase configuration must validate the expected project and
  environment rather than relying on table prefixes or schemas for isolation.
- Backend data modes and provider modes must be explicit and fail closed. Never silently
  switch between demo, database, sandbox, or live behavior.
- Local is the only developer profile whose backend may use local database
  infrastructure. Preview, development, staging, and production use isolated
  hosted infrastructure. Web and mobile are API-only in every environment.
- Development, staging, and production runtime secrets must be injected by the
  environment-specific secret store. Their startup and host deployment
  preflights must reject missing/short authentication secrets, local database
  endpoints, mismatched Supabase project references, and malformed encryption
  keys; fixed local development keys are not valid in shared environments.
- Tests, preview, development, and staging must never receive production data,
  live-provider secrets, or production indexing behavior. Preview must not own
  production webhooks, campaigns, queues, or cron.
- Root tooling records owned processes in ignored `.runtime/`. Cleanup must
  validate exact PIDs and repository ownership, signal the child tree
  leaf-to-root with SIGTERM, and use SIGKILL only for an exact still-owned PID
  after revalidation. Never use broad `killall`, `pkill`, process patterns, or a
  blind `lsof -ti | kill`; refuse unrelated listeners.
- Destructive database/reset/seed commands are local-only. They must require
  `APP_ENV=local`, a proven loopback target, and the canonical local Supabase
  workdir. Remote operations require a separate protected workflow.

## API-only client architecture

Web and mobile keep the same service boundary and one transport rule:

```text
Web:    component → hook/controller → service contract → HTTP → /api/v1
Mobile: component → hook/controller → service contract → HTTP → /api/v1
```

- Mobile must use `EXPO_PUBLIC_API_URL` in local, test, preview, development,
  staging, and production. `EXPO_PUBLIC_DATA_MODE`, mobile data-mode selectors,
  demo services, mobile fixture repositories, demo sessions or credentials,
  and runtime fallback from API failures must not exist. Mobile business reads,
  writes, authentication, authorization, and account state go through the
  central HTTP client and canonical `/api/v1` operations. Mobile must never
  access Supabase tables, RPCs, or Auth directly. A short-lived backend-issued
  signed upload URL may be used only by the dedicated upload transport, without
  credentials, redirects, or a second business API.
- All local product development must use the API-only Web and mobile clients
  and a database-mode backend (`BACKEND_DATA_MODE=database`,
  `DATABASE_INFRA_MODE=local`) backed by
  the repository-owned local Supabase stack. Public media may use
  backend-projected Supabase Storage URLs. Frontend demo adapters, fixture
  repositories, data-mode selectors, mock-storage flags, and runtime fallback
  from API failures must not exist.
- Local development uses the repository-owned Supabase stack for the backend and
  worker. The canonical local sequence is `make install`, `make supabase-up`,
  `make db-migrate`, `make db-seed`, then `make backend` and/or `make worker`;
  `make dev-web` performs that connected Web sequence in one command, and
  `make dev` performs it with Metro as well. Both validate configuration and
  infrastructure before stopping tracked application processes, reuse a healthy
  stack only when its environment and migration fingerprint matches, force
  backend database mode, migrate, synchronize database types, idempotently seed,
  and launch the API, worker, and Web app. Type synchronization also runs before
  reusing a healthy local stack, leaves matching output untouched, and aborts on
  generation failure; CI's type drift check remains read-only. The backend-owned
  local seed imports production-shaped tables, the complete
  generated taxonomy v1 projection and market availability, initializes missing
  database-owned header configuration without overwriting editorial changes, and copies every backend-fixture media source into local
  public Supabase Storage. In connected mode, category collections,
  navigation, filters, and category media must come through the API/runtime
  Storage configuration without a static client fallback. Intentional fixture
  changes must run `make local-fixtures-sync`, while CI and completion checks
  run `make local-fixtures-check`;
  generated local credentials remain ignored under `.runtime/`. The default
  local Web and API origins and ports come only from `.env.example`; runtime
  source, Make recipes, and package scripts must not duplicate them. Do not
  reintroduce `infra-*`, `db-start`, or legacy `supabase-start` aliases for
  local Supabase lifecycle operations.
- Local Supabase startup creates infrastructure only; its automatic migration
  and seed replay stays disabled. The backend migration runner owns ordered SQL
  and the guarded taxonomy prerequisite for a fresh, empty repository-owned
  local database. Reset must invoke that same runner. Never apply the local
  prerequisite to hosted databases or overwrite existing taxonomy/customer data.
- Do not point a client task at production or a live provider unless the task
  explicitly authorizes it. HTTP adapters remain behind the service registry
  and generated OpenAPI types.
- Components must not branch on data mode, call Supabase business tables/RPCs,
  construct `/api/v1` requests ad hoc, or contain fake backend behavior.
- Keep Web service-registry domains lazily loaded. A
  new registry entry must not eagerly import every adapter into the application
  shell, and service-contract methods must remain Promise-based so deferred
  domain loading preserves the public boundary. Mobile service implementations
  must be HTTP-only and use generated OpenAPI path/operation types.
- Backend test adapters must be asynchronous, deterministic, and
  contract-compatible.
  Important payment, moderation, verification, subscription, fraud, messaging,
  inventory, and error outcomes must use reproducible scenarios rather than
  uncontrolled `Math.random()` or component timers.
- Reuse the existing backend test persona/scenario infrastructure. Do not create
  a client fixture system.
- Backend test mutations must use the owned store/repository abstraction.
  State that can vary by user and market must be keyed by both; components must
  not mutate shared fixture arrays.
- Never put payment credentials, KYC data, provider secrets, or other sensitive
  values in local storage. Drafts may store non-sensitive marketplace form data
  required for interruption recovery.
- UI-facing contracts must be projections for their use case, not raw database
  rows or all-purpose objects. HTTP adapters own transport-to-view-model mapping.
- Client validation improves UX but is not authoritative. Normalize service
  errors into stable application states and never display raw database,
  Supabase, Stripe, provider, or stack-trace details.
- Use optimistic UI only for safe reversible actions, such as favorites or
  marking a notification read. Payments, refunds, verification, moderation, and
  paid activation require adapter confirmation.
- Async surfaces should deliberately support loading, success, empty, error,
  and retry states without large layout shifts or whole-page failure from an
  optional widget.

## Backend, OpenAPI, and domain ownership

- The backend HTTP runtime uses NestJS with the Fastify adapter. The Nest shell
  owns transport lifecycle, readiness, exception handling, and WebSocket
  integration; the existing domain `api/*.routes.ts` registrars remain the
  canonical operation owners. Do not move their handlers into a giant Nest
  controller or reintroduce domain logic into the composition root.
- Redis is the BullMQ execution transport and realtime fan-out boundary.
  PostgreSQL domain outboxes/inboxes, leases, attempts, and idempotency remain
  authoritative; queue jobs are schema-versioned wake/schedule messages and
  must never contain secrets or replace atomic domain persistence. API and
  worker reuse process-scoped connections and shut them down gracefully.
- `backend/` is a domain-oriented TypeScript/Node modular monolith. HTTP
  registration belongs in the owning `backend/src/modules/*/api/` directory;
  `backend/src/api/v1/router.ts` composes those registrations and owns only the
  shared dispatch/security pipeline. Provider webhook entrypoints belong in
  `backend/src/infrastructure/http/`. Resource policies stay with their domain.
  Do not add domain handlers back to the composition root. Domain/application services
  own authoritative publication, reservation, order, payment, payout, refund,
  entitlement, promotion, verification, fraud, moderation, search, and lifecycle
  transitions. Clients may simulate and present these decisions but never own
  them.
- `backend/openapi/openapi.json` is the only authoritative HTTP specification.
  It owns methods, paths, request/response schemas, security, access metadata,
  permissions, errors, pagination, uploads, idempotency, and versioning.
- API changes must follow this order:

  1. edit the canonical OpenAPI document and reuse components;
  2. provide a unique `operationId`, explicit `security`, and Shongre access and
     permission metadata;
  3. run `make openapi-generate`;
  4. implement the generated contract in the owning module’s `api/*.routes.ts`
     and application/domain service, then compose its registrar in
     `backend/src/api/v1/router.ts`;
  5. migrate Web/mobile/integration consumers through HTTP adapters;
  6. add contract, authorization, and integration tests;
  7. run `make openapi-check`.

- `packages/contracts/src/generated/api-client.ts` supplies generated JSON
  operations through `@shongre/contracts/api-client`. Platform transports own
  sessions, CSRF, market headers, cancellation, deadlines, and normalized errors;
  generated operations own methods, paths, serialization, and request/response
  types. Keep response-body reads inside the request deadline. Native token
  refresh must be coalesced and scoped to the session generation so logout or
  another login cannot restore credentials or replay an old account’s writes.
- Generated OpenAPI and database artifacts are read-only outputs. Do not create
  a second Swagger file, endpoint registry, router-derived spec, or handwritten
  client wire DTO source. The API origin's own HTML surfaces, the developer
  console at `/` and the reference at `/api/docs`, are presentation over that
  same contract: they must derive every method, path, description, and access
  level from it, may execute only public parameter-free discovery reads
  same-origin without credentials, and must show an explicit unavailable state
  wherever no authorized data source exists rather than presenting an
  illustrative figure as fact.
- `/api/v1` is the active business prefix. Compatible additions may remain in
  v1; breaking semantics or shapes require a versioned migration or documented,
  time-bounded deprecation. Compatibility aliases must be specified, owned, and
  sunset rather than left undocumented.
- Every external input must be validated server-side. Return stable application
  error codes and request IDs without exposing internal persistence or provider
  details.
- Slow, retryable, scheduled, or secondary work belongs in durable backend
  workers/queues. Email, notifications, image processing, search indexing,
  saved-search alerts, provider delivery, moderation, fraud evaluation, and
  lifecycle expiry must not depend on frontend timers or process memory.
- Webhooks must verify provider signatures, deduplicate persisted event IDs,
  process idempotently, and queue secondary work. Critical operations must use
  constraints, transactions, locking, idempotency, or optimistic concurrency as
  appropriate.
- Realtime is optional and must be abstracted. Use it only where it materially
  improves UX, such as messaging or selected status updates; do not subscribe
  clients broadly to high-volume tables. Local test adapters must not require realtime.

## Database, migrations, and storage

- PostgreSQL/Supabase is authoritative infrastructure; Shongre domain services
  own marketplace behavior. Do not turn the architecture into direct browser
  access to business tables.
- The only Supabase tree is `backend/supabase/`. Production schema changes must
  be ordered migrations in `backend/supabase/migrations/`; dashboard-only schema
  edits are forbidden.
- Prefer relational models with primary/foreign keys, uniqueness, checks,
  explicit cascade behavior, timestamps, and query-driven indexes. Use JSONB
  only for genuinely dynamic or sparse data, not to hide core entities.
- Risky schema changes must follow expand → backfill/verify → contract. Preserve
  forward/backward application compatibility. Never casually destroy data,
  mutate an already-applied migration, or automatically reverse a migration
  during application rollback.
- Supabase-exposed tables must use deny-by-default RLS and independent persona
  tests. Frontend filtering is never authorization. Service-role access remains
  backend-only and must never enter browser/native bundles, public environment
  configuration, logs, Git, or API responses.
- Migrations and generated database types change together. New repository code
  should use typed tables/functions rather than introduce unbounded casts.
- Authoritative timestamps must be timezone-aware and named by their semantics,
  such as `createdAt`, `publishedAt`, `startsAt`, `endsAt`, and `completedAt`.
- Authoritative money uses integer `amountMinor` plus an ISO `currency`. Never
  use floating-point arithmetic for financial truth. Isolate temporary legacy
  major-unit mapping in adapters. Currency conversion is a display projection
  over centrally managed, audited rates and must preserve the original money.
  A market default must be enabled and explicitly supported; missing, invalid,
  or stale rates fail closed rather than implying parity. Currency preferences
  remain separate from market and locale, and backend test rates remain
  deterministic.
- Separate public media from private message, payment, and verification
  documents. Storage keys are not proof of ownership; private uploads require
  authenticated, authorized, documented flows and malware/quarantine controls
  where configured. Paid digital assets and access secrets remain private and
  versioned; permanent URLs, raw storage keys, credentials, and secret links
  never enter public contracts. Secret payloads are encrypted by the backend and
  decrypted only after an entitlement-scoped, audited access decision. Paid-file
  upload completion queues a privacy-safe durable scan event; a worker validates,
  scans, and promotes clean content into private storage with bounded retries.
- Database work must consider real query patterns, bounded pagination, N+1
  behavior, tenant/market indexes, and concurrency. Use `EXPLAIN` and production
  evidence for performance decisions; do not index every column speculatively.

## Identity, authorization, security, and privacy

- Treat every client input as untrusted. Audit XSS, unsafe HTML, open redirects,
  account/resource enumeration, token leakage, PII in URLs/logs/analytics,
  insecure local storage, SSRF, and secret exposure. Clients are never an
  authorization boundary.
- Privileged keys and provider credentials belong only in protected backend or
  deployment secret stores. Secret values must never be committed, logged,
  embedded in images, returned through APIs, placed in GitHub variables, or
  prefixed as public Web/mobile configuration.
- Web authentication uses Shongre-owned HttpOnly cookies; native authentication
  uses Shongre bearer tokens stored in Keychain/Keystore through SecureStore.
  Provider authorization/access/refresh credentials remain backend-only.
  Browser HTTP adapters use the same-origin `/api/v1` transport in
  `frontend/src/platform/api/web-api-proxy.ts`, with host-only session/CSRF
  cookies on each configured Web origin. The relay forwards only to configured
  `API_URL`, also relays credential-free `/readyz`, validates mutation Origin,
  strips bearer credentials and untrusted forwarding headers, and never
  implements domain policy. SSR and native keep
  the central API transport; do not rely on cross-site cookies between markets.
- In database mode, Supabase Auth owns email/password identities and password
  verification. `profiles.auth_user_id` links that identity to the Shongre
  account; account type, Staff membership, role, and effective capabilities
  remain server-authoritative PostgreSQL state and must never be trusted from
  client-selected or JWT metadata. Shongre continues to own Web HttpOnly and
  native bearer application sessions after the Supabase credential check.
- Identity is per-request state from the verified principal. Never accept the
  acting user, sender, seller, or account from a caller-selected path/body when
  it can be derived from the route handler's `principal`.
- Every API route must declare an access rule. Use public access only for truly
  public resources and entry points that authenticate or verify themselves.
  Public access never waives CSRF, rate limiting, OAuth state, webhook signature,
  or input validation.
- Resource operations must load the resource and check ownership, membership,
  or capability. Ownership failures should return 404 when 403 would disclose
  another user's resource. Test the wrong caller as well as the allowed caller.
- Writes must allowlist mutable fields. Users must not self-assign roles,
  verification state, account status, Staff capability, or administrative data;
  direct capability changes use only the dedicated capability-override workflow.
- Individual and Professional are the only account types. Staff is an
  orthogonal, server-managed membership status with an explicit role. Any
  retained Staff membership, including suspended or revoked, replaces the
  customer marketplace capability plane for that identity; direct grants must
  never bridge the two planes. Active Staff receive only their least-privilege
  internal role and approved internal overrides, while inactive Staff receive
  neither plane. Staff sessions may remain signed in while browsing public
  marketplace discovery, but are read-only by default. The retained legacy
  `staff.marketplace.demo` capability must never unlock customer routes or
  mutations in API-only clients and grants no API, provider, notification,
  payment, messaging, or publication authority. Membership and
  capability-override changes require active Staff,
  MFA, recent authentication, self/owner governance, session revocation, and an
  audit trail; capability overrides additionally require
  `admin.permissions.manage`.
- Every public OpenAPI operation must explicitly declare whether authenticated
  Staff are denied through `x-shongre-deny-staff-marketplace`; customer
  read-only discovery and neutral authentication/platform/health entry points
  use `false`, while public marketplace mutations and signed customer action
  entry points use `true`.
- Social identities are matched by provider plus provider subject, never by
  email alone. Linking requires authenticated recent user intent; never silently
  merge accounts because an email matches or allow removal of the last usable
  sign-in method.
- OAuth/OIDC must use state, nonce, and PKCE. One-time state and native exchange
  handles expire and are consumed atomically. Refresh tokens rotate; reuse
  revokes the token family. Sensitive identity/session changes require recent
  authentication.
- Cookie-authenticated mutations must retain CSRF protection. Logout and account
  deletion revoke sessions; native flows also unregister the current push
  device. Never downgrade native credentials into AsyncStorage or browser
  localStorage.
- Privileged staff access must retain its MFA and recent-authentication gates.
  Do not weaken them to make an administrative route or test pass.
- Authentication is not authorization. Backend capability checks remain
  authoritative even when RLS and client route guards provide additional
  boundaries.
- Contextual access must use the canonical `evaluateAuthorization()` contract
  and backend `requireAuthorization()` guard. Ownership, organization, market,
  verification, entitlement, and feature facts may only narrow an effective
  capability; absent required facts deny access, and an empty server-resolved
  capability projection must never be reconstructed from a role label.
- Collect and retain only required data. Never put KYC/KYB, identity documents,
  payment/bank data, private messages, credentials, internal fraud signals, or
  raw request bodies in URLs, public storage, analytics, or general logs.
- Sensitive operator actions, including refunds, restrictions, verification
  overrides, market activation, pricing, and configuration changes, must be
  authorized and auditable without logging secrets or raw identity documents.

### Consent and account-level isolation

- Optional cookie/analytics/marketing consent is opt-in and defaults to false.
  “Not asked” and “refused” must behave identically downstream.
- The first layer must offer refusal with equal prominence to acceptance. The
  consent surface has no close, Escape, or click-away dismissal because silence
  is not consent.
- Reopening preferences must show the current decision and never re-consent.
  Consent expires and a purpose/version change must prompt again.
- The consent banner remains a `role="region"` rather than claiming dialog focus
  behavior it does not implement. All optional trackers must pass the existing
  `hasConsent(category)` gate before collection begins.
- “Gestion des cookies” must open the real preference panel through the existing
  consent provider, not merely navigate to a policy page.
- Favorites and other market-sensitive account-owned client data must be
  partitioned by both account and market through storage, service, API, and
  database boundaries. Web guest favorites merge by union into the
  authenticated account's current-market bucket and the guest bucket is then
  cleared. Native does not persist guest favorites and sends favorite actions
  to login. React state must reload when the current account or market changes.
  Until that scoped collection loads successfully, membership remains explicitly
  loading or unknown/error: clients must block the mutation or make the action
  retry-only and must never interpret a load failure as an empty favorite set.
- Account deletion, report/block state, blocked-message enforcement, and UGC
  safety are backend-authoritative. Deletion must reauthenticate, protect
  non-terminal transactions, revoke credentials/tokens, anonymize eligible PII,
  and retain only legally, financially, or safety-required records.

### Trust, verification, and fair product behavior

- KYC/KYB is progressive and contextual. Preserve distinct email, phone,
  identity, business, representative, payment, payout, bank, tax, and
  professional-status dimensions; do not collapse trust into one boolean.
- Verification and risk requirements come from backend-shaped services. Never
  hardcode risk thresholds in components or expose internal fraud scores/rule
  identifiers to ordinary users.
- Paid prominence must be identifiable and non-deceptive. Never use fake
  countdowns, false scarcity, fabricated uplift or popularity claims,
  preselected purchases, hidden prices, accidental subscriptions, forced
  renewal, or inaccessible cancellation/consent controls.
- AI output is advisory unless an explicitly approved safety control says
  otherwise. It must re-enter ordinary authorization and domain commands before
  mutation or external action, and core marketplace flows must degrade safely
  when optional AI is unavailable.

## Markets, countries, localization, and URLs

All features must classify data and behavior as:

```text
PLATFORM_GLOBAL
MARKET_SCOPED
MULTI_MARKET_SHARED
```

- Global is valid only for genuinely shared identity or definitions. Market
  scoped data carries an explicit market identifier. Multi-market entities are
  stored once with explicit publication/availability associations rather than
  cloned per country.
- `CountryConfig`, `COUNTRY_REGISTRY`, `resolveMarketContext()`, and the public
  URL builders in `packages/contracts/src/market-country.ts` are authoritative.
  Do not parse or concatenate country domains/prefixes in components, workers,
  emails, notifications, shares, callbacks, sitemaps, or structured data.
- Canonical production topology is:

  ```text
  shongre.fr/*       France
  shongre.com/       global country gateway
  shongre.com/be/*   Belgium
  shongre.com/ch/*   Switzerland
  shongre.com/sn/*   Senegal launch surface until enabled
  shongre.com/bf/*   Burkina Faso launch surface until enabled
  ```

- France has no `/fr` canonical prefix. Canonical aliases redirect while
  preserving route and query. Unknown hosts/slugs and mismatched contexts fail
  closed.
- The global gateway is not a marketplace context and must not execute market
  business operations before a country is selected.
- Request-driven services receive resolved `MarketContext` explicitly. Do not
  infer authority from UI text, browser language, currency, local storage, a
  caller-controlled header, or a France fallback. API market hints must be
  cross-validated with canonical host/referrer and explicit fields.
- Probable-country detection is a non-authoritative recommendation through the
  market-location service boundary. Coarse detection reads only a trusted
  edge-injected ISO country header; precise browser coordinates require an
  explained user action and remain ephemeral. Never store or log the raw IP or
  coordinates. A confirmed manual country choice wins until reset, and
  cross-domain changes require confirmation. Selector, detection and status
  behavior consume the public-safe registry projection so a valid new registry
  entry needs no country-specific application branch.
- Async events, queues, outbox records, workers, jobs, notifications, provider
  callbacks, idempotency keys, caches, search indexes, rate limits, analytics,
  and audit events must retain market identity when behavior or isolation varies
  by market.
- Market-specific availability, taxonomy, legal copy, pricing, currency, tax,
  payments, delivery, verification, moderation, provider support, entitlements,
  and launch gates come from typed/admin-managed policy. Never copy France's
  values to fill an unknown market fact.
- A new market starts disabled or `coming_soon` and non-indexable. Activation
  requires authorized, versioned, auditable evidence for legal, compliance,
  provider, payment, localization, and operational readiness.
- Cross-domain authenticated moves use the existing short-lived single-use
  handoff. Never share cookies across `.fr` and `.com` or put tokens in URLs.

### Localization

- French is the current shipped product language, but market, locale, currency,
  and timezone remain separate concepts. Format money, numbers, dates, relative
  dates, addresses, phone numbers, distances, and units with locale-aware APIs.
- UI copy uses `frontend/src/i18n/`: `messages.fr.ts` defines typed message keys,
  and components use `useTranslation()`. Never concatenate translated sentences
  or hand-code plural rules; missing locale messages fall back to readable
  French, not raw keys.
- `MarketLocationProvider` owns the active locale and document language.
  `I18nProvider` consumes it; do not create another locale source of truth.
- UI chrome belongs in message catalogs. Admin-managed/domain records such as
  taxonomy, permissions, conditions, collections, and provider capabilities use
  per-locale record fields/overlays, not copied UI-catalog entries.
- A locale may join `SHIPPED_LOCALES` only after the actual UI and domain data
  meet the existing coverage gates. Do not infer readiness from catalog-key
  coverage alone.

### Required market tests

Market-sensitive changes must test relevant boundaries, normally including:

```text
FR  active, root France origin, fr-FR, EUR
BE  active, /be, fr-BE, EUR
CH  active, /ch, fr-CH, CHF
SN or BF  coming soon, marketplace denied and non-indexable
unknown, disabled, or host/country mismatch  rejected
```

Tests must cover scope preservation, formatting, policy/availability,
cross-market leakage, account-plus-market state separation, canonical URLs,
async work, mismatch rejection, switching, and launch gates as applicable. A
France-only happy path is insufficient for market-sensitive work.

## Marketplace domain invariants

### Delivery and courier

- `delivery` owns local delivery requests and courier applications. Its
  taxonomy identity is `services.local_services.delivery_courier` and its
  runtime gate is the exact market-scoped, default-off
  `delivery.marketplace` flag. Taxonomy availability or a global flag must
  never activate the feature. Disabling the flag blocks new work while
  preserving closure paths for assignments already in progress.
- Public delivery projections contain only coarse localities and public
  requirements. Exact stops, contacts, access notes, source orders, courier
  identity, and application content are participant-private. Request,
  application, profile, matching, events, and outbox state remain
  market-scoped and backend-authoritative.
- Courier selection and lifecycle transitions must use the version-checked,
  row-locking database functions from `00096_delivery_marketplace.sql` so one
  application wins and its event/outbox mutation commits atomically. Delivery
  quotes do not alter order money or state; payment, escrow, commission, route
  optimization, tracking, carrier, and cross-border behavior are outside this
  domain unless separately approved.
- Delivery UGC reports use the canonical report/moderation boundary.
  `delivery.moderate` is a distinct least-privilege Staff capability: it may
  suspend unsafe requests and stop new applications without deleting private
  records or immutable evidence, even while the market kill switch is off.
  Account deletion must block on non-terminal delivery work and purge exact
  stop/contact rows after terminal work; retain coarse facts only under an
  approved retention/legal-hold policy. Add delivery to the shared account
  exporter when that platform-wide boundary exists, never as a separate export
  system.

- `v1` is the sole active taxonomy schema and implementation. Editorial changes
  use separate draft and publication revisions, never another taxonomy version.
  Taxonomy content is authoritative in backend-owned PostgreSQL authoring tables
  and immutable published revisions. Vehicle, property, employment and course
  classification tables are relational authoring resources of that same v1
  publication, exposed as `referenceEntries` in the protected taxonomy editor.
  Domain catalogue readers and SQL discovery must use the published reference
  projection, never read draft tables or maintain separate classification editors.
  Existing domain IDs and foreign keys stay stable; pricing and commercial policy
  remain owned by their domains. Web, native, SSR and backend runtime readers
  use the published database projection through the repository/API boundary;
  compiled catalogues are controlled import/export or explicit isolated test
  inputs, never application runtime fallbacks. Public taxonomy operations live
  under `/api/v1/taxonomy/v1`; clients use generated operations and must not
  import catalogues, test fixtures or domain resolvers. Previous versions may
  survive only in immutable migrations, audit records and controlled import
  evidence. Identity aliases resolve directly into v1; they never execute an
  older schema. Run `make taxonomy-check` and, for conversions on the owned local
  database, `make taxonomy-migration-check`. The current public hierarchy
  contract supports levels 0–2; deeper nesting requires a compatibility migration.
  The root `taxonomy-import`, `taxonomy-compile` and `taxonomy-check` targets own
  import artifacts and coverage evidence. Normalized/workbook inputs must not
  overwrite an authored database. Local seeding bootstraps missing taxonomy and
  header configuration and preserves editor revisions. After migrations, the
  generated reference bootstrap fills missing canonical entries only before
  editorial changes or an earlier reference bootstrap; it preserves existing
  rows and publishes the completed baseline once. Vertical SQL seeds must
  not rewrite taxonomy reference authoring. After taxonomy schema or seed changes,
  run `make db-seed` against the migrated local schema and verify that existing
  editorial content and revisions are unchanged; fixture drift checks alone do
  not verify seed execution. The explicit bootstrap importer refuses databases
  with editorial changes. Admin mutations require
  taxonomy permission, MFA and recent authentication, optimistic revision checks
  and audit records. Publication validates the exact database snapshot; rollback
  preserves immutable history. Runtime caches check the publication pointer and
  fail closed on database errors. Authoring commands and reviewed migrations
  must advance the draft revision and configuration timestamp together. The
  private draft snapshot cache is valid only for its authoring revision; commands
  rebuild it atomically and controlled imports invalidate it. Revision zero is
  never cached in application memory. Taxonomy-dependent HTTP responses remain
  uncached until external purge delivery is acknowledged. Reusable flow bindings
  must remain unique, and structural coverage never implies domain approval.
  Unapproved country, seller, and regulatory policy remains quarantined or
  disabled. Publication fields and search filters use reusable field definitions
  rather than category condition trees. Existing-listing characteristics use
  the public, market-scoped listing read projection, never the publication
  eligibility resolver. Public detail bindings and recorded values determine
  output. Field icons are authored in taxonomy attribute definitions and travel
  in the public characteristics projection; clients must not infer them from
  codes, localized labels, or category-specific maps. Long detail lists keep
  every published fact available through an accessible disclosure.
  Broader stored categories must not be silently replaced with a
  guessed publishable leaf. Existing-listing edits share the v1 validator, retain
  unchanged historical answers and validate changed fields and their dependents.
  Discovery expands the published parent hierarchy rather than inferring it
  from dotted identifiers; pagination is bound to that publication revision.
  Header category-bar selection,
  activation, and display order are market-scoped taxonomy configuration managed
  through the authorized admin service; clients consume its public projection
  and must not hardcode an editorial category list. Overview and promotion links
  share that revisioned configuration through typed navigation targets; their
  localized labels, activation, and order are database-owned, including in
  mobile Web navigation. Failed or empty configuration must not append client
  fallback links. Fulfillment behavior is an
  explicit typed listing and order model; never infer physical or digital
  fulfillment from a category ID, slug, name, label, or translated copy.
- A listing is stored once and may have explicit market publications. The shared
  record alone does not prove availability. Backend services own lifecycle
  transitions across draft, review, published, reserved, sold, expired,
  suspended, rejected, removed, and archived states.
  Vertical discovery writers must persist the explicit source-market publication
  in the same transaction as their shared listing projection, preserve existing
  market moderation restrictions, and retain the canonical publisher ownership
  checks. Professional seed inventory must retain its source organization links.
  Validate projection changes with
  `make discovery-db-test`; the local database suite rolls back its mutations.
- Publication should be progressive and preserve non-sensitive draft state
  across authentication, verification, payment/promotion flow, navigation,
  refresh, and temporary failure. Never persist KYC or payment secrets with a
  draft. Generic product onboarding uses `PUBLICATION_CONSTRAINTS.title` for
  the Web/native input limit and counter, with matching OpenAPI and backend
  publication/bulk-import validation. Preserve existing titles and over-limit
  saved or assisted drafts; require an explicit edit before publication rather
  than silently truncating them. Character limits do not replace accessible
  full-title wrapping on listing cards.
- Keep creation, publication, bump/sort, reservation, sale, and expiry timestamps
  semantically distinct. “Remonter l’annonce” must not be presented as a new
  publication date.
- Search state that users should share or restore belongs in the URL. Search
  contracts include market, taxonomy, attributes, price, condition, seller type,
  location/radius, delivery/payment, sort, and bounded pagination.
- Backend search owns production ranking and authoritative geo/radius filtering.
  Keep the `SearchService` boundary so search infrastructure can evolve without
  rewriting clients.
- High-volume collections must be bounded and backend-shaped. Prefer cursor or
  keyset pagination where deep offsets become expensive, and prevent duplicate
  items during incremental loading.
- Particulier and Professionnel experiences share the application but expose
  appropriate onboarding, limits, verification, store/team, billing, analytics,
  and bulk tools. Do not assume one user equals one professional organization;
  organizations support explicit membership and roles.
- Subscription behavior uses centralized entitlements, not scattered plan-name
  checks. Pricing, limits, commissions, eligibility, and paid-placement
  availability come from backend/admin policy and market context. Effective
  subscriptions, entitlements, orders, and invoices retain their exact market
  and immutable catalog evidence. Plan changes use typed transition policy and
  must update subscription, attached items, entitlements, and event evidence in
  one serialized, idempotent transaction; unresolvable evidence fails closed.
- Plan migrations, campaigns, price protection, commercial economics, provider
  mappings, paid-placement policy, and unpriced offer definitions remain fields
  of the same immutable commercial catalog snapshot and are projected into
  queryable governance tables. A target catalog must preserve historical price
  and entitlement versions, require customer acceptance where configured, and
  stay blocked until shadow quotes, cost/margin evidence, and exact
  environment-plus-market provider mappings are approved. Customer price locks
  and accepted Enterprise terms use append-only evidence; Enterprise pricing
  uses customer-specific price books rather than a fake public price.
- A public replacement-plan preview must be a typed projection of one newer
  migration-linked catalog. It must list only the target product identities,
  must not merge active legacy cards with target cards, and must disable paid
  actions until publication. Publication must require every configured
  replacement to be selectable and must reject a snapshot where its migration
  source remains selectable.
- Use consistent public purchase/detail terms: **Urgent**, **Remonter
  l’annonce**, and **À la une**. Shared Web/native cards and listing details
  distinguish **Urgent** for urgent placements, **Boosté** for search bumps or
  sponsored search, and **À la une** for featured/top/spotlight placements. Use
  only the resolved market-scoped promotion and its active schedule, never stale
  booleans or standalone ranking metadata. **En promotion** is an independent
  badge for a positive amount below a valid reference price in the same currency;
  it may coexist with paid placement but must never affect sponsored ordering.
  Missing, invalid, free, unpriced or on-request amounts do not imply a sale.
  Local seed placement examples must persist deterministic market-scoped
  `listing_promotions` grant evidence and let database triggers derive the
  effective publication; setting listing flags alone does not activate them.
- Payment, escrow, refund, payout, reservation, pickup, handover, cancellation,
  dispute, digital entitlement, credential assignment, download, reveal, and
  provisioning state are backend-authoritative and concurrency-safe. Digital
  access is granted only from an idempotently processed authoritative payment
  state and uses versioned fulfillment evidence plus short-lived scoped grants;
  redirects, query parameters, client state, and seller actions are never proof
  of payment. Backend test scenarios must clearly identify simulated outcomes
  and never claim that a live payment occurred.
- Messaging, notifications, reports, and blocking use centralized services and
  support explicit permission, loading, empty, error, retry, and blocked states.
  New UGC surfaces must reuse reporting/blocking controls and add abuse and
  ownership tests.
- User presence is an ephemeral Redis projection of authenticated session leases,
  not durable account truth. Only conversation participants may read a
  counterpart's online, away, offline, or last-seen state. Blocking in either
  direction, inactive accounts, retained Staff membership, revoked sessions,
  stale snapshots, or unavailable presence infrastructure must conceal presence
  as unknown. Clients never submit timestamps or treat unknown as offline.
- Marketplace review submissions require a completed order and a verified
  participant principal. Derive the recipient, author, and listing context on
  the backend; allow one review per order and author, including the seller's
  independent review of the buyer. Keep order identifiers private, and display
  transaction-verification badges only when the service supplies evidence.
  Unbound historical reviews must never acquire manufactured verification.
- Admin surfaces must express domain capabilities rather than bypass services as
  raw table editors. Sensitive actions retain authorization and audit evidence.
- Homepage discovery composition is a revisioned, market-scoped database
  configuration exposed only through the homepage backend service and OpenAPI
  contract. Section visibility and order, universe category rails, collection
  selection, schedules, viewport targeting, and minimum eligible-listing
  thresholds must never be hardcoded in homepage components. Public resolution
  omits content below its published thresholds; authorized previews may expose
  suppressed-state metadata, and drafts affect live discovery only after an
  explicit audited publication. Collections use the published selection mode:
  automatic selects API taxonomy roots with eligible inventory; manual preserves
  the configured slug order and never falls back to automatic when empty.
  Recent-search chips and autocomplete share browser-local UX history scoped by
  account and market, hidden during session restoration; never fabricate history
  or assign unscoped legacy history to the current identity.

## UI, accessibility, and performance

- Reuse `@shongre/design-tokens`, `@shongre/ui`, `@shongre/features`, and the
  existing design-system compatibility entrypoints before creating a new
  primitive, token, or variant. Add variants only for recurring semantic use.
- Standard buttons match the header's `control-md` height (40px on Web with a
  fine pointer, 44px on touch); native buttons retain the 44px `controlTouch`
  floor at every density. Use shared sizes rather than page-specific height
  overrides; compact compositions may adjust internal spacing. Keep dense
  desktop actions, navigation rows, media thumbnails, and the raised mobile
  publish action appropriate to their role.
  Allow long or enlarged labels to increase button height without clipping.
- Web authentication entry screens share `AuthLayout`; guest access guards
  share `AuthRequiredPrompt`. Their enclosing shell owns the header. Preserve
  the safe destination, including query and fragment, through sign-in,
  registration, recovery, and email verification links. Account selection uses
  native radio controls; provider availability and verification remain
  backend-authoritative.
- Verified identity marks, verification facts, and professional-account markers
  use only `VerifiedIcon`, `VerificationBadge`, and `ProBadge` from
  `@shongre/ui`. Their typed size, icon-visibility, and accessibility props are
  the supported variation points; applications must not recreate them with
  generic badge variants, direct `BadgeCheck` icons, copied SVGs, local
  wrappers, or CSS overrides.
- The canonical `ListingCardView` anatomy is media with applicable promotion
  and multi-photo evidence; category/universe with optional real
  brand; price; a two-line title; location/date; independent seller trust and
  rating; then up to two category-aware capability or characteristic facts.
  Vertical Web and native cards use the shared token-backed 220 by 420 footprint
  with a 210 media well, shared card title/price typography, and brand-orange
  price role. A professional listing shows only `Pro`; a verified private
  seller shows the icon-free `VerificationBadge`; an unverified private seller
  shows no redundant `Particulier` marker. Rating remains an independent real
  fact. Horizontal cards retain their price-row seller summary and available
  public seller identity. If public seller identity is absent, retain any
  explicit professional status beside the price. The shared
  Web/native listing card derives payment, delivery,
  digital fulfillment, negotiability, and seller-verification presentation only
  from explicit public listing and seller projections. Vertical cards place
  up to two labeled facts in the divided footer and keep only multi-photo
  evidence on the media. Horizontal cards retain labeled capabilities and may
  show the existing decision and seller summaries. Listing detail
  expands every available card fact and category attribute. Missing brand,
  reviews, active promotion, price, capability, or photo stays absent or uses
  the shared neutral media fallback; applications must never invent a
  replacement fact or add local category-specific card markup.
- Web application typography uses the single Nunito Sans Variable loader in
  `frontend/app/layout.tsx`. Tailwind `font-sans` resolves through the generated
  `--font-family-sans` design token; Web components inherit it and must not load
  or declare competing application font families.
- Web shells use `EnvironmentHeaderStack` to keep the environment toolbar and
  their application header in one sticky chrome stack. The Next.js development
  launcher uses only its supported `devIndicators` corner configuration; the
  application toolbar keeps its compact token-backed height when visible and
  takes no layout space when hidden. Persist its visibility as a browser
  preference, keep its runtime utilities mounted, and provide an accessible
  restore control. Never manipulate the launcher's shadow DOM or let development
  tooling determine production chrome geometry.
- Homepage sections use the same shared Web `Container` with `width="results"`
  and standard responsive gutters as the search page, including hero, discovery,
  collection, universe, recent-search, Pro, loading, and error surfaces. Keep
  their responsive widths and content edges aligned; the marketplace header
  and footer use `width="full"` so desktop chrome spans the viewport independently
  of homepage content.
  The marketplace footer uses the header's compact `BrandHeaderSignature`
  geometry with reverse artwork and the same `text-sm`/`text-xs` typography
  scale; wide breakpoints must not enlarge its logo, icons, or text.
- Shared Web/native APIs must preserve behavior and accessibility while allowing
  narrow platform adapters. Do not use a WebView as a code-sharing shortcut or
  widen a Next.js client boundary merely to share presentation.
- Marketplace listing grids, rails, search results, recommendations, favorites,
  and seller catalogues must render the canonical `@shongre/features` listing
  card through the client adapter. Structured category services map their
  records to `ListingCardView`; generic listings resolve the universe label and
  optional brand from the canonical taxonomy and listing attributes. Do not add
  category-specific card markup or conditional fields in page components.
  Listing rails use the shared Web `ListingRail` primitive: the canonical card
  width and height remain token-owned, while narrow rails scroll instead of
  shrinking content below the supported footprint. Longer values clamp or use
  the compact typography defined by the shared card rather than stretching a
  rail or creating page-specific dimensions. Search and other result grids use
  the shared fluid `ListingGrid`: equal flexible tracks distribute fixed-size
  cards across the complete row, including its outer remainder, while homepage
  rails retain their independent content-sized scrolling layout.
  Keep deferred section rendering intact.
  Profile results, hero media slides, operational rows, and map popups may
  remain specialized when they are not listing-card equivalents.
- Marketplace results pages must use the canonical Web `SearchResultsToolbar`,
  `FilterPanel`, and `FilterPanelToggle` primitives for results controls,
  desktop sidebar, collapse/restore disclosure, and mobile drawer. The optional
  `SearchActiveFiltersBar` is the only standalone summary for applied filters.
  Do not repeat global query, category, location, or submit controls above the
  results when the application header and adaptive filter surface already own
  them. Each vertical supplies its own query semantics, taxonomy- or
  domain-specific fields, supported view modes, sorting, and actions through
  those shared shells. Location belongs inside the filter surface. Map-capable
  verticals must lazy-load their map renderer and project only API-authorized
  public coordinates or explicitly approximate public city/service-area
  locations; unknown or private locations are omitted rather than placed at an
  invented market-centre position.
- MapLibre is the only map renderer, created once in the shared `MapContainer`
  primitive, and its attribution control is never disabled — the credit is a
  licence condition of the OpenStreetMap-derived data. Basemap style, geocoding
  endpoint and location-privacy limits are environment values read by backend,
  Web and native under one set of names; never add a `NEXT_PUBLIC_`/
  `EXPO_PUBLIC_` copy. Geocoding runs server-side only, behind the platform
  cache and rate limit. `public.listings.geographic_point` is authoritative for
  every spatial filter, distance and sort; `latitude`/`longitude` are a derived
  compatibility projection. A public payload publishes the precision the
  listing's policy allows and never the stored point unless that policy is
  `exact`. See `docs/architecture/geospatial.md`.
- Target WCAG 2.2 AA. Verify semantic landmarks and heading order, labels and
  descriptions, errors, keyboard navigation, focus visibility/trapping/
  restoration, menus, tabs, dialogs, sheets, tables, carousels, contrast,
  reduced motion, and screen-reader announcements. Color must not be the only
  status signal; icon-only controls need accessible names.
- Responsive work must be intentionally usable around 320, 375, 390, 430, 768,
  1024, 1280, and 1440+ CSS pixels. Do not merely shrink desktop UI or allow
  horizontal page overflow. Test relevant Chrome, Firefox, and Safari/WebKit
  behavior plus mobile-style viewports.
- Mobile bottom navigation, pinned actions, composers, forms, modals, and toast
  stacks must respect safe areas and the complete raised-action clearance, not
  only the navigation bar box.
- Motion must improve understanding and honor `prefers-reduced-motion`. Avoid
  decorative animation that interferes with interaction or performance.
- Measure before optimizing. Prioritize LCP, INP, CLS, and TTFB on homepage,
  search, listing detail, publication, and workspace surfaces.
- `packages/contracts/src/operational-performance.ts` is the only source for
  SLOs, bundle/query/load budgets, cache defaults, infrastructure timeouts, and
  retry timing. Applications expose overrides only through validated runtime
  configuration; do not redeclare numeric operational policy locally.
- Shared caching is deny-by-default. Only registered anonymous public
  projections may emit shared-cache headers, and their keys/tags must vary by
  every relevant host, market, locale, tenant, organization, principal/role,
  permission version, or other authorization dimension. Credentials, private
  data, errors, and permission-dependent responses remain `private, no-store`.
  Writes must publish deterministic versioned invalidation tags.
- Every production Web build runs `frontend/scripts/check-client-bundle-budget.mjs`.
  Keep ordinary executable chunks and generated taxonomy data measured
  separately; do not raise either hydration budget without recorded artifact
  evidence and an approved migration plan.
- Avoid data/render waterfalls and repeated per-card calls. Parallelize
  independent work, batch related data, virtualize/bound large lists, and
  lazy-load genuinely heavy maps, charts, editors, provider UI, and analytics.
- Images need stable dimensions/aspect ratios, responsive sources, appropriate
  formats and lazy loading; use priority only for true LCP images. Artwork in
  App Router error and not-found boundaries must remain lazy because Next
  serializes those hidden boundaries with successful routes and would otherwise
  preload unused assets. Image pixel budgets must account for device pixel
  ratio. Keep font files/weights minimal and respect licensing.
- State should remain local unless it is truly global, such as session, market,
  locale, or global notifications. URL-owned state must support
  refresh, sharing, bookmarking, and back/forward navigation.

## Web rendering, SEO, and public discovery

- Preserve Next.js server rendering, semantic HTML, metadata, route
  optimization, and accessibility around the existing catch-all/React Router
  compatibility architecture. Use Server Components or server-safe projections
  for public content without bypassing service/adapter boundaries.
- `frontend/src/platform/seo/seo-policy.ts` is the canonical pure policy for
  indexability, robots, canonical URL, market/locale, lifecycle, sitemap and
  structured-data eligibility, alternates, timestamps, redirects, and exclusion
  reasons. Metadata, sitemaps, schema, and tests must consume it rather than
  invent parallel route rules.
- The `frontend/src/platform/seo/discovery-governance.ts`,
  `discovery-structured-data.ts`, and `discovery-referrers.ts` module family is
  the companion source for crawler-purpose policy, private crawl exclusions,
  stable SHONGRE. entity identity, answer-engine referral classification,
  webmaster-token validation, and the supplemental discovery manifest. Keep
  server-only policy out of client bundles. Search/retrieval access and model-
  training consent are independent; never infer one from the other.
- Client pages that declare metadata use `frontend/src/hooks/usePageMeta.ts`;
  `frontend/src/services/seo.service.ts` applies the shared policy output. Never
  set `document.title`, canonical/robots tags, or JSON-LD ad hoc in components.
- Eligible public pages must return meaningful initial HTML, including a useful
  H1, primary entity/collection information, truthful prices/location where
  applicable, breadcrumbs, and crawlable `<a href>` discovery links. They must
  not depend on interaction or a live client-only API to reveal core content.
- Missing public entities return a real 404/410; precise replacements use a
  server redirect. Never return a 200 soft-404 or redirect every deletion to a
  homepage/category.
- Only production may be indexable. Lower environments emit noindex/nofollow/
  noarchive behavior, block crawling, and omit public sitemaps. Robots controls
  are not an authorization or privacy boundary.
- A crawler user-agent is not identity. CDN/WAF rules may grant bot-specific
  treatment only after validating the request against the provider's current
  official IP publication; application authorization, private-route denial and
  rate limits still apply. Do not commit a stale provider IP snapshot.
- Only active, marketplace-enabled, legally approved, SEO-indexable market
  contexts may emit indexable pages, reciprocal alternates, structured data, or
  sitemap entries. Do not block a production URL in robots while relying on its
  response-level `noindex` to be observed.
- Canonicals, `hreflang`, structured data, public links, and sitemap URLs use the
  shared market resolver and URL builder. Alternates must be canonical,
  indexable, available, and reciprocal; use the global gateway as `x-default`
  where appropriate.
- Arbitrary free-text search, sorting, view/map state, tracking parameters, and
  uncontrolled facets are non-indexable. Curated category/location landings
  require clean stable paths, real inventory, unique useful content, and
  centralized quality thresholds. Do not create thin doorway pages.
- Valid indexable pagination uses crawlable anchors and a self-canonical URL.
  Infinite scroll/load-more must retain crawlable paginated equivalents when
  underlying resources should be discovered.
- Sitemaps must be deterministic, same-host, production-only, and limited to
  successful canonical indexable resources. Use substantive update timestamps,
  safe sharding, bounded data access, and XML escaping; exclude redirects,
  private/inactive resources, arbitrary filters, and wrong-market URLs. Respect
  the sitemap protocol limits of 50,000 URLs and 50 MB uncompressed per file.
- Listing sitemap generation pages through the bounded, market-scoped
  `GET /api/v1/discovery/sitemap-listings` public projection. Do not reuse a
  relevance search limit, query business tables from Web, silently truncate a
  cursor, or omit public media hydration. Listing sitemap entries may include
  only validated HTTP(S) image URLs from that public projection.
- IndexNow is an optional production-only freshness signal owned by the backend.
  Publication, meaningful update, sale, expiry and removal events enter the
  durable `indexnow_events` outbox through database triggers; the scheduled
  worker batches canonical URLs by verification host, retries with a lease and
  dead-letter cap, and filters against current market/legal/indexing readiness.
  `INDEXNOW_ENABLED=false` is the default, the key stays server-side and is
  exposed at `/indexnow-key.txt` only while enabled in production. Never call an
  indexing service from Web/mobile clients or put private content in the outbox.
- Structured data must match visible content and canonical URLs. Never fabricate
  ratings, reviews, price, currency, availability, seller/employer identity,
  location, dates, salary, or organization facts. Remove misleading active
  offers/jobs when lifecycle changes.
- Mark user-supplied outbound links `ugc nofollow` in addition to safe new-tab
  attributes. Never use cloaking, hidden text, purchased links, private blog
  networks, fabricated reviews/quotes/statistics, keyword stuffing, doorway
  pages, or scaled low-value generated content. AI-assisted editorial content
  requires the same named ownership, sourcing, review, freshness and correction
  process as human-drafted content.
- `llms.txt` is an optional bounded directory of canonical public references;
  it never replaces HTML, robots, noindex, authorization, canonicals or
  sitemaps. Do not expose private data, duplicate volatile listing facts, or
  manufacture editorial/location pages, authorship, methodology, sources or
  update dates for search or answer-engine visibility.
- Do not use sitemap ping services or the Google Indexing API for ordinary
  classifieds, property, vehicles, services, profiles, or category pages. Any
  future qualifying job integration is backend-owned, explicitly authorized,
  production-only, durable/idempotent, observable, quota-aware, and disabled
  until Search Console and service-account prerequisites are real.

## Mobile and store release safety

- `mobile/app/` and `mobile/src/` are the single business source for iOS and
  Android. Platform-specific files are narrow adapters using React Native
  resolution, not parallel products.
- Mobile is API-only in every environment. Its configured URL must be the
  validated API origin with `/api/v1` exactly once; components and routes must
  not construct endpoint paths, and transport or session failure must produce an
  explicit loading/error/retry state rather than fixture, cached-demo, synthetic
  success, or unauthenticated fallback. Tests use mocked HTTP or an isolated
  local API backed by local Supabase and must pass the mobile API-only
  architecture guard.
- `mobile/app.config.ts` and supported Expo config plugins are the native source
  of truth. `mobile/ios/` and `mobile/android/` are ignored generated output;
  regenerate them with `make mobile-prebuild-clean`, inspect the result, and
  never hand-edit generated projects.
- Generated iOS targets must adopt the scene lifecycle and preserve lifecycle,
  cold/warm deep-link, and universal-link forwarding. Keep
  `mobile/plugins/with-ios-scene-lifecycle.cjs` until a stable Expo prebuild
  generates equivalent behavior and a clean prebuild plus simulator launch and
  link-routing checks pass without it.
- Keep React aligned across workspaces and run Expo Doctor after dependency
  changes. Do not encode current SDK or store-policy dates as permanent rules;
  config and the compliance documentation own those values.
- Native credentials must remain in Keychain/Keystore via SecureStore. Production
  preflight must reject non-HTTPS, loopback, emulator, LAN, `.local`, and
  temporary tunnel endpoints.
- The current permission boundary is intentionally small: user-selected photos
  and contextual notifications. Camera, microphone, contacts, location,
  overlays, and background services remain absent/blocked. A new permission
  requires demonstrated product need, denial fallback, contextual UI, purpose
  strings, both store maps, privacy/legal review, generated-native inspection,
  and physical-device tests.
- Every new SDK, processor, permission, AI/provider flow, payment capability, or
  collected data type must update the canonical privacy/SDK inventory, Apple
  label map, Google Data Safety map, public policy evidence, and release checks
  before collection starts.
- Physical marketplace payments and digital in-app value are different policy
  classes. Mobile promotions, subscriptions, and credits remain unavailable
  until a current region/store billing review approves a path with
  server-authoritative receipt and entitlement handling. UI never selects a
  payment rail.
- Universal/App Links require real signing identities. Generate association
  files from templates, keep generated files untracked, deploy over HTTPS, and
  verify deployed responses; never ship placeholder team IDs or fingerprints.
- Build, submission, and public release are separate decisions. Build commands
  must not submit; only explicit submit targets may upload, and upload does not
  authorize rollout.
- Store checks report evidence as PASS, FAIL, WARNING, MANUAL REVIEW REQUIRED,
  or NOT APPLICABLE. Never claim Apple/Google compliance or approval. Before a
  production upload, re-check current official store, SDK, privacy, billing,
  target/API, signing, and review requirements recorded in canonical compliance
  docs.

## CRM, providers, marketing, and analytics

- CRM remains a bounded module in the backend monolith. CRM Core owns generic
  accounts, contacts, opportunities, pipelines, activities, products, quotes,
  fields, and automation definitions; it must not import vertical repositories
  or hardcode tenant pipeline stages.
- Vertical-to-CRM integration uses explicit adapters, stable external references,
  and durable idempotent events. Tenant-owned CRM/provider data carries tenant
  identity and deny-by-default RLS. Reserved tables or configuration screens do
  not prove that a live provider capability is implemented.
- Shongre has one Provider Platform for CRM, Marketing, Newsletter,
  Notifications, and future consumers. Do not duplicate provider catalogs,
  credential stores, health state, usage ledgers, webhooks, AI clients, mailbox
  integrations, or delivery gateways.
- Provider calls pass through capability gateways/adapters after deterministic
  tenant, owner, feature, capability, status, credential, market, currency,
  legal, and release checks. User connections are owner-private; platform
  fallback is explicit and never a silent cost-generating fallback.
- Provider credentials are encrypted server secrets or opaque secret-manager
  references. Only safe status/hints may cross the credential boundary. Protect
  provider network calls against SSRF and fail closed when capability or
  credentials are incomplete.
- AI uses the shared `AiGateway`, delivery uses `EmailDeliveryGateway`, and
  mailbox operations use `MailboxGateway`. Domain code must not call individual
  vendor APIs directly.
- Marketing consent is purpose-specific and append-only. Global marketing
  unsubscribe suppresses marketing but must not block transactional/security
  mail. Public confirm/preference/unsubscribe actions use hashed, expiring,
  non-guessable tokens; double opt-in stays pending until confirmation.
- Campaign and journey delivery must recheck consent, suppression,
  do-not-contact, frequency caps, entitlements, and provider policy immediately
  before delivery. Audience snapshots, recipient idempotency, waits, retries,
  outgoing webhooks, and delivery evidence are durable and auditable rather than
  process-memory state.
- Product/business analytics use `@shongre/contracts/analytics` and owned
  provider-neutral services. Direct provider SDK calls outside their adapters
  are forbidden. Optional browser analytics must pass consent, sanitizer, Do Not
  Track, and Global Privacy Control gates.
- Analytics must not collect private messages, contact details, credentials,
  payment/bank or KYC/KYB data, request bodies, or full query strings. Identity
  comes from the authenticated principal; logout or consent withdrawal must
  prevent cross-user linkage.
- The append-only internal event ledger owns product reporting. Financial truth
  comes only from posted/reconciled finance records in minor units. Analytics
  failure must never change a marketplace transaction outcome.

## Deployment and operations

- Docker is packaging and orchestration infrastructure, never a domain
  dependency. API and worker use the same backend image but start and scale
  independently; worker health must verify a recent, environment-scoped
  heartbeat from successful database coordination, not only a running PID.
- Root `compose.yaml` is the hosted workload topology. It publishes no origin
  application ports and uses persistent remote-managed Cloudflare Tunnels over
  the private network. `compose.local.yaml` is the only loopback-port override.
- Never commit or put a Tunnel token in GitHub variables, image layers, logs, or
  application environment. Deployments must not recreate Tunnel/DNS
  infrastructure or change origin exposure.
- Build frontend and backend images once for a tested main commit. Runtime
  environment values are not Docker build arguments; build metadata may identify
  source/version. Generate a validated release manifest containing exact image
  digests, SBOM/provenance, OpenAPI/schema, and migration evidence.
- Development deployment, staging promotion, production promotion, and rollback
  must consume those exact digests. Production requires the same digests
  certified through staging and a protected approval; production releases belong
  to `origin/main`.
- Run migrations once, under an environment lock, from the exact backend digest
  before rollout. API/worker replica startup must never migrate. Preserve
  expand/contract compatibility so application rollback does not require an
  automatic destructive down migration.
- Rollback redeploys a known-good validated manifest; it must not rebuild images,
  mutate immutable migration history, or reverse schema automatically.
- Host runtime files and protected secret stores own environment configuration.
  Production secrets and customer data never enter preview or build layers.
- Keep health/readiness, request IDs, bounded retries, durable worker leases,
  backup/restore evidence, storage restore checks, alerting, and incident
  runbooks aligned with changed operational behavior. Do not weaken security or
  privacy controls to make a health or performance test pass.
- Structured backend logs must include the environment fingerprint and redact
  known secret fields, configured credentials, bearer tokens, and nested error
  values before serialization. Log context must never override the canonical
  timestamp, level, scope, message, or environment fields.

## Testing and definition of done

- Use the repository's existing Vitest, Playwright, SQL, architecture, and Make
  conventions; do not create a second test framework.
- Test behavior, not only rendering. Relevant changes should cover happy,
  loading, empty, error/retry, permission, ownership, market, lifecycle,
  concurrency, mobile/desktop, keyboard, and representative persona states.
- Web and mobile unit tests must work with the backend stopped by mocking the
  HTTP transport or using an isolated local API; neither client may ship or
  select a runtime demo implementation.
  Backend changes require appropriate unit, contract, integration, security,
  RLS, migration, idempotency, and concurrency coverage.
- RLS tests must distinguish anonymous, owner, another user, relevant
  organization roles, moderator, and administrator where applicable.
- Shared token/component/feature/brand/contract changes must prove Web and native
  propagation and preserve accessible behavior. Run `make ui-check` and
  `make cross-platform-check` when those boundaries change.
- OpenAPI changes require `make openapi-check`; market-sensitive changes require
  the representative country matrix; marketing, CRM, provider, analytics,
  database, mobile, store, and infrastructure changes require their focused
  canonical Make targets.
- Normal completion updates affected tests and documentation, then runs the
  applicable formatter, linter, type checker, configured unused-code and
  dependency detector, repository-hygiene check, unit/integration/E2E and
  migration/RLS tests, and production build. `make check` is the deterministic
  repository gate; `make test-critical` covers critical marketplace/security
  behavior; use `make check-all` for E2E, cross-platform, or complete workflow
  changes.
- Browser E2E runs against the repository's isolated Webpack production build,
  not the interactive development server. Its backend-owned scenario exposes
  production-shaped listing UUIDs and authenticates personas through HTTP;
  Staff complete real MFA with private, single-use test recovery codes.
  Local storage must never establish test identity. The browser base URL must
  match the configured market origin, and regular/serial filters must intersect
  the caller's selection without duplicating tests. Keep bounded concurrency and isolate
  multi-route/persona sweeps according to existing test-runner conventions.
  `make test-web-api-transport` additionally owns an isolated test API and
  verifies first-party sessions with an API-mode Web build. Hosted staging
  certification requires all public and authenticated journeys for the exact
  release, dedicated staging accounts, sandbox providers and real Staff MFA;
  missing fixtures, skipped tests and flaky retries cannot certify a release.
  The root runner may keep Chromium parallel, but Firefox and WebKit must remain
  single-worker and process-recycled through bounded shards until a full
  sustained matrix proves their browser contexts no longer deadlock during
  navigation or teardown.
- Do not report an unexecuted command as passing. Fix failures introduced by the
  change. If a proven unrelated pre-existing failure blocks a check, report it
  explicitly and run every other applicable check.
- Before finishing, use repository-wide searches to verify removed and migrated
  references, then inspect `git status` and the complete diff for unrelated
  changes, dead imports, orphaned code/routes, stale generated output, missing
  translations/fixtures, disposable artifacts, security or market regressions,
  console errors, accessibility regressions, and documentation drift. Every
  final task report must state what was cleaned, which validations passed, and
  any intentionally retained item with its justification.

## Canonical documentation

Detailed procedures and mutable operational facts belong in these maintained
sources rather than being copied into this file:

| Topic                                                      | Canonical source                                                                                                                                             |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Repository setup, commands, and layout                     | `README.md`, `make help`                                                                                                                                     |
| Frontend and backend package architecture                  | `frontend/README.md`, `backend/README.md`                                                                                                                    |
| Authentication and session lifecycle                       | `docs/architecture/authentication.md`                                                                                                                        |
| Access control and progressive compliance                  | `docs/security/access-control-architecture.md`, `docs/security/progressive-compliance-architecture.md`                                                       |
| Environments, domains, providers, and protected operations | `docs/architecture/environments.md`                                                                                                                          |
| OpenAPI workflow and generated inventory                   | `docs/architecture/openapi.md`, `backend/docs/api.md`, `backend/docs/generated/endpoint-inventory.md`                                                        |
| Multi-country modeling and launch behavior                 | `docs/architecture/multi-country.md`                                                                                                                         |
| Shared UI and platform boundaries                          | `docs/architecture/cross-platform-ui.md`                                                                                                                     |
| Maps, geocoding, PostGIS location and location privacy     | `docs/architecture/geospatial.md`                                                                                                                            |
| Delivery and courier marketplace                           | `docs/architecture/delivery-courier.md`                                                                                                                      |
| Brand source, runtime mappings, and upgrade workflow       | `docs/architecture/brand-assets.md`                                                                                                                          |
| Mobile architecture and threat model                       | `docs/architecture/mobile.md`, `docs/security/mobile-threat-model.md`                                                                                        |
| Current mobile/store policies and evidence                 | `docs/compliance/store-requirements.md`, `mobile/store/`                                                                                                     |
| Analytics, consent, SEO ingestion, and observability       | `docs/architecture/analytics.md`, `frontend/docs/analytics.md`, `backend/docs/analytics.md`                                                                  |
| Performance, caching, database plans, and scaling          | `docs/architecture/performance-scalability.md`, `infrastructure/monitoring/README.md`                                                                        |
| CRM, provider, marketing, and prospecting platforms        | `backend/docs/crm-platform.md`, `backend/docs/provider-platform.md`, `backend/docs/marketing-platform.md`, `backend/docs/prospecting-platform.md`            |
| Docker, Cloudflare, release, backup, and incidents         | `docs/operations/docker-cloudflare-deployment.md`, `docs/operations/release.md`, `docs/operations/backup-restore.md`, `docs/operations/incident-response.md` |

When a durable rule changes, update this file and the relevant canonical source
in the same implementation. When only procedure, implementation status, policy
date, or operational evidence changes, update the canonical source without
growing this file.
