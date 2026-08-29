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
- [Client architecture and deterministic demo mode](#client-architecture-and-deterministic-demo-mode)
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
- Verify that code is unused before deleting it. Migrate every consumer and run
  the relevant checks before removing a route, component, schema, migration,
  package, compatibility adapter, feature flag, or generated artifact.
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
packages/contracts/    stable public schemas and generated OpenAPI types
packages/design-tokens/ canonical visual tokens
packages/brand/        canonical brand assets
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

- `packages/design-tokens/` is the only token source. A Web/mobile compatibility
  file may be a thin adapter, not a competing token or component system.
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
  security, or business policy.
- Parse environments and origins through `@shongre/contracts/environment`.
  Runtime origins come from `PUBLIC_FR_URL`, `PUBLIC_INTL_URL`, and `API_URL`.
  Do not hardcode environment hostnames or fallback ports in application source,
  package scripts, framework configuration, native projects, or Make recipes.
- Every runtime binding must carry the configured environment fingerprint.
  Hosted Supabase configuration must validate the expected project and
  environment rather than relying on table prefixes or schemas for isolation.
- Data modes and provider modes must be explicit and fail closed. Never silently
  switch between demo, database, sandbox, or live behavior.
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

## Client architecture and deterministic demo mode

Web and mobile use the same boundary:

```text
component → hook/controller → service contract → demo or HTTP adapter
```

- `demo` is the default client mode. Web and mobile must remain fully usable and
  testable with the backend, Supabase, Stripe CLI, KYC providers, and production
  services stopped.
- Do not connect a client task to the real backend or a live provider unless the
  task explicitly authorizes it. Existing HTTP adapters may remain behind the
  service registry and generated OpenAPI types.
- Components must not branch on data mode, call Supabase business tables/RPCs,
  construct `/api/v1` requests ad hoc, or contain fake backend behavior.
- Demo adapters must be asynchronous, deterministic, and contract-compatible.
  Important payment, moderation, verification, subscription, fraud, messaging,
  inventory, and error outcomes must use reproducible scenarios rather than
  uncontrolled `Math.random()` or component timers.
- Reuse the existing persona/scenario infrastructure. Do not create a second
  demo-mode switch or independent fixture system.
- Demo mutations must use the owned store/repository abstraction. State that can
  vary by user and market must be keyed by both; components must not mutate
  shared fixture arrays.
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

- `backend/` is a TypeScript/Node modular monolith. Domain/application services
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
  4. implement the generated contract in `backend/src/api/v1/router.ts` and the
     owning domain service;
  5. migrate Web/mobile/integration consumers through HTTP adapters;
  6. add contract, authorization, and integration tests;
  7. run `make openapi-check`.

- Generated OpenAPI and database artifacts are read-only outputs. Do not create
  a second Swagger file, endpoint registry, router-derived spec, or handwritten
  client wire DTO source.
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
  clients broadly to high-volume tables. Demo mode must not require realtime.

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
  major-unit mapping in adapters.
- Separate public media from private message, payment, and verification
  documents. Storage keys are not proof of ownership; private uploads require
  authenticated, authorized, documented flows and malware/quarantine controls
  where configured.
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
  orthogonal, server-managed membership status with an explicit role. Every
  Staff role receives `staff.internal.access`, but it and all Staff-only direct
  grants are effective only while membership is active. Membership and
  capability-override changes require active Staff, MFA, recent authentication,
  self/owner governance, session revocation, and an audit trail; capability
  overrides additionally require `admin.permissions.manage`.
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
- Favorites and other account-owned client data must be partitioned by account.
  Guest favorites merge by union into the authenticated account and the guest
  bucket is then cleared. React state must reload when the current account or
  market changes.
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

- Taxonomy is hierarchical, variable-depth, market-aware, and metadata-driven.
  The normalized v4 source is backend-owned and compiled through the root
  `taxonomy-import`, `taxonomy-compile`, and `taxonomy-check` targets; runtime
  clients consume generated private or public-safe projections and must never
  parse Excel or maintain a second category/attribute catalogue. The master
  workbook compiler expands reusable `FLOW_TEMPLATE` rows with listing-type
  `ADD`/`EXCLUDE` overrides and must reject duplicate effective bindings.
  Unapproved country, seller, and regulatory policy remains quarantined or
  disabled. Publication fields and search filters use reusable field definitions
  rather than category condition trees. Header category-bar selection,
  activation, and display order are market-scoped taxonomy configuration managed
  through the authorized admin service; clients consume its public projection
  and must not hardcode an editorial category list.
- A listing is stored once and may have explicit market publications. The shared
  record alone does not prove availability. Backend services own lifecycle
  transitions across draft, review, published, reserved, sold, expired,
  suspended, rejected, removed, and archived states.
- Publication should be progressive and preserve non-sensitive draft state
  across authentication, verification, payment/promotion flow, navigation,
  refresh, and temporary failure. Never persist KYC or payment secrets with a
  draft.
- Keep creation, publication, bump/sort, reservation, sale, and expiry timestamps
  semantically distinct. “Remonter l’annonce” must not be presented as a new
  publication date.
- Search state that users should share or restore belongs in the URL. Search
  contracts include market, taxonomy, attributes, price, condition, seller type,
  location/radius, delivery/payment, sort, and bounded pagination.
- Backend search owns production ranking and authoritative geo/radius filtering.
  Demo adapters may simulate them. Keep the `SearchService` boundary so search
  infrastructure can evolve without rewriting clients.
- High-volume collections must be bounded and backend-shaped. Prefer cursor or
  keyset pagination where deep offsets become expensive, and prevent duplicate
  items during incremental loading.
- Particulier and Professionnel experiences share the application but expose
  appropriate onboarding, limits, verification, store/team, billing, analytics,
  and bulk tools. Do not assume one user equals one professional organization;
  organizations support explicit membership and roles.
- Subscription behavior uses centralized entitlements, not scattered plan-name
  checks. Pricing, limits, commissions, eligibility, and paid-placement
  availability come from backend/admin policy and market context.
- Use consistent public terms: **Urgent**, **Remonter l’annonce**, and **À la
  une**. Promotion state must account for scheduling and expiry rather than a
  stale boolean.
- Payment, escrow, refund, payout, reservation, pickup, handover, cancellation,
  and dispute state are backend-authoritative and concurrency-safe. Demo UI must
  clearly represent simulated outcomes and never claim that a live payment
  occurred.
- Messaging, notifications, reports, and blocking use centralized services and
  support explicit permission, loading, empty, error, retry, and blocked states.
  New UGC surfaces must reuse reporting/blocking controls and add abuse and
  ownership tests.
- Admin surfaces must express domain capabilities rather than bypass services as
  raw table editors. Sensitive actions retain authorization and audit evidence.

## UI, accessibility, and performance

- Reuse `@shongre/design-tokens`, `@shongre/ui`, `@shongre/features`, and the
  existing design-system compatibility entrypoints before creating a new
  primitive, token, or variant. Add variants only for recurring semantic use.
- Shared Web/native APIs must preserve behavior and accessibility while allowing
  narrow platform adapters. Do not use a WebView as a code-sharing shortcut or
  widen a Next.js client boundary merely to share presentation.
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
- Avoid data/render waterfalls and repeated per-card calls. Parallelize
  independent work, batch related data, virtualize/bound large lists, and
  lazy-load genuinely heavy maps, charts, editors, provider UI, and analytics.
- Images need stable dimensions/aspect ratios, responsive sources, appropriate
  formats and lazy loading; use priority only for true LCP images. Image pixel
  budgets must account for device pixel ratio. Keep font files/weights minimal
  and respect licensing.
- State should remain local unless it is truly global, such as session, market,
  locale, demo scenario, or global notifications. URL-owned state must support
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
- Structured data must match visible content and canonical URLs. Never fabricate
  ratings, reviews, price, currency, availability, seller/employer identity,
  location, dates, salary, or organization facts. Remove misleading active
  offers/jobs when lifecycle changes.
- Do not use sitemap ping services or the Google Indexing API for ordinary
  classifieds, property, vehicles, services, profiles, or category pages. Any
  future qualifying job integration is backend-owned, explicitly authorized,
  production-only, durable/idempotent, observable, quota-aware, and disabled
  until Search Console and service-account prerequisites are real.

## Mobile and store release safety

- `mobile/app/` and `mobile/src/` are the single business source for iOS and
  Android. Platform-specific files are narrow adapters using React Native
  resolution, not parallel products.
- `mobile/app.config.ts` and supported Expo config plugins are the native source
  of truth. `mobile/ios/` and `mobile/android/` are ignored generated output;
  regenerate them with `make mobile-prebuild-clean`, inspect the result, and
  never hand-edit generated projects.
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

## Testing and definition of done

- Use the repository's existing Vitest, Playwright, SQL, architecture, and Make
  conventions; do not create a second test framework.
- Test behavior, not only rendering. Relevant changes should cover happy,
  loading, empty, error/retry, permission, ownership, market, lifecycle,
  concurrency, mobile/desktop, keyboard, and demo-persona states.
- Web/mobile client tests must work with the backend stopped in demo mode.
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
- Normal completion uses the applicable subset of format, lint, typecheck, unit,
  integration, E2E, migration/RLS, and production-build checks. `make check` is
  the deterministic repository gate; `make test-critical` covers critical
  marketplace/security behavior; use `make check-all` for E2E,
  cross-platform, or complete workflow changes.
- Browser E2E runs against the repository's isolated Webpack production build,
  not the interactive development server. Keep bounded concurrency and isolate
  multi-route/persona sweeps according to existing test-runner conventions.
- Do not report an unexecuted command as passing. Fix failures introduced by the
  change. If a proven unrelated pre-existing failure blocks a check, report it
  explicitly and run every other applicable check.
- Before finishing, inspect the diff for unrelated changes, dead imports,
  orphaned code/routes, stale generated output, missing translations/fixtures,
  security or market regressions, console errors, accessibility regressions, and
  documentation drift.

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
| Mobile architecture and threat model                       | `docs/architecture/mobile.md`, `docs/security/mobile-threat-model.md`                                                                                        |
| Current mobile/store policies and evidence                 | `docs/compliance/store-requirements.md`, `mobile/store/`                                                                                                     |
| Analytics, consent, SEO ingestion, and observability       | `docs/architecture/analytics.md`, `frontend/docs/analytics.md`, `backend/docs/analytics.md`                                                                  |
| CRM, provider, marketing, and prospecting platforms        | `backend/docs/crm-platform.md`, `backend/docs/provider-platform.md`, `backend/docs/marketing-platform.md`, `backend/docs/prospecting-platform.md`            |
| Docker, Cloudflare, release, backup, and incidents         | `docs/operations/docker-cloudflare-deployment.md`, `docs/operations/release.md`, `docs/operations/backup-restore.md`, `docs/operations/incident-response.md` |

When a durable rule changes, update this file and the relevant canonical source
in the same implementation. When only procedure, implementation status, policy
date, or operational evidence changes, update the canonical source without
growing this file.
