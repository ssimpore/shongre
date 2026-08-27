# Analytics, product intelligence, SEO, and observability

## Outcome and ownership

Shongre has one provider-neutral event language and one internal reporting
authority. Web, mobile, and backend code share the event contracts from
`@shongre/contracts/analytics`; product code never imports a vendor SDK.

```text
Web / future native SDKs ── consent ──▶ canonical event envelope
                                            │
                                            ├── Shongre event ledger
                                            ├── PostHog EU (optional)
                                            ├── GA4 (optional marketing purpose)
                                            └── Matomo (optional)

Backend domain services ── commit ──▶ append-only event + delivery queue
                                            │
                                            └── bounded provider retry

Finance ledger ──────────────────────▶ authoritative revenue aggregates
Search Console ──────────────────────▶ finalized SEO snapshots
Sentry ──────────────────────────────▶ errors/traces, never product analytics
```

The implementation owners are:

- event schemas and provider capability definitions:
  `packages/contracts/src/schemas/analytics.ts` and
  `packages/contracts/src/provider-platform.ts`;
- Web orchestration and consent-aware providers: `frontend/src/analytics/`;
- internal ingestion, reports, provider delivery, privacy and aggregates:
  `backend/src/modules/analytics/`;
- storage and database jobs:
  `backend/supabase/migrations/00066_unified_analytics.sql`;
- scheduled delivery, aggregation, retention and Search Console work:
  `backend/src/workers/`;
- wire contract: `backend/openapi/openapi.json`.

## Event contract

Every event carries `eventId`, UTC `timestamp`, `schemaVersion`, environment,
platform, country, market, locale, currency, release, test-traffic state and
the available anonymous/session/account context. Market context comes from the
canonical country configuration; analytics must not own another country list.

Application code uses only the compatibility façade:

```ts
analyticsService.track("listing_viewed", {
  listingId,
  categoryId,
  sellerId,
});
```

Do not add arbitrary event strings, vendor calls, page-specific consent checks,
or raw database rows. The compile-time event/property mapping and strict Zod
envelope are the contract. `schemaVersion` changes only for a breaking payload
change. Additive optional properties remain on the current version when their
meaning is stable.

To add an event:

1. Confirm that an existing semantic event cannot describe the action.
2. Add the name and the narrowest property interface in the shared schema.
3. Instrument the authoritative success point, not a button impression that may
   fail later.
4. Use opaque IDs, booleans, bounded counts, category identifiers, or money in
   integer minor units. Never add form contents.
5. Add sanitizer, consent and workflow tests and document any new semantics.

Browser page views are emitted once from `AnalyticsRuntime`; vendor automatic
page views and autocapture are disabled. Feature evaluation is recorded at the
existing Shongre feature-flag service boundary, not through a vendor flag API.
Core Web Vitals (`LCP`, `CLS`, `INP`, `TTFB`) are lazily collected after consent
and correlated with route, device class, market and release through common
context.

## Consent, privacy, and identity

Optional analytics is opt-in through the existing `ConsentProvider`. No
provider initializes before its mapped purpose is allowed:

| Provider                   | Purpose   | Notes                                                |
| -------------------------- | --------- | ---------------------------------------------------- |
| Internal browser analytics | analytics | API mode only; demo mode never sends network traffic |
| PostHog EU                 | analytics | manual events; identified profiles only              |
| Matomo                     | analytics | cookieless adapter, explicit consent APIs            |
| Cloudflare Web Analytics   | analytics | production RUM only; no custom events                |
| GA4                        | marketing | ad storage/signals remain denied                     |
| Sentry browser reporting   | analytics | conservative consent gate; technical events only     |

`Do Not Track` and Global Privacy Control disable optional provider loading and
event emission even when a stale stored acceptance exists. Withdrawal shuts
providers down, clears attribution and rotates/removes browser analytics IDs.
Logout resets provider identities and the local anonymous/session IDs so a
shared device cannot mix accounts.

Before authentication, envelopes use generated `anonymousId` and `sessionId`.
After authentication, they retain that anonymous context and add the opaque
Shongre user ID, preserving valid funnel attribution. The backend always
replaces a client-supplied account ID with the authenticated principal and
removes it for guests.

The browser and server sanitizers drop suspicious property names and likely
emails, phone numbers, JWTs, cards, tokens, addresses, message bodies, KYC/KYB
data and bank identifiers. URL properties retain only the path. Sanitizers are
the last boundary, not permission to pass sensitive values into analytics.
Messages, search URLs, authorization headers and request bodies must never be
captured.

PostHog session replay is separately disabled by default. If
`NEXT_PUBLIC_POSTHOG_SESSION_REPLAY_ENABLED=true` is approved for an
environment, all inputs and rendered text are masked and recording is stopped
entirely on messaging, checkout/payment, KYC/verification and account routes.
Changing this default requires privacy review and replay verification.

Retention defaults are 395 days for raw events, 30 days for provider delivery
attempts, and 730 days for daily/SEO aggregates. The scheduled cleanup uses the
database-controlled retention function. Account deletion uses the existing
user-deletion flow to create and execute an analytics anonymization request;
it does not create a second GDPR workflow.

## Internal ledger and delivery reliability

`analytics_events` is append-only and idempotent on `event_id`. Test and bot
traffic is retained with explicit flags but excluded from business aggregates.
Provider delivery state is separate and idempotent on `(event_id, provider)`.

Authoritative backend flow:

```text
domain transaction succeeds
  → append canonical backend event
  → enqueue enabled provider deliveries
  → claim an eager non-blocking attempt through the persisted queue
  → scheduled worker reclaims pending/failed rows with SKIP LOCKED
  → bounded exponential retry (maximum eight attempts)
```

Authoritative workflows reuse a stable event ID derived from their listing,
order, payment or refund identity. Analytics failures are caught at domain call sites and cannot reverse listing,
checkout, payment, refund, messaging or authentication outcomes. A worker crash
after claiming an attempt leaves a five-minute visibility timeout and is safe
to retry because the event/delivery keys are stable.

Browser events are written to the internal ledger by `POST /analytics/events`.
The endpoint accepts at most 50 strict events per batch, enforces request-market
agreement and currency policy, replaces identity from the principal, limits the
event clock window, detects bot user agents and rate-limits the IP-prefix/user-
agent family key. The backend does not relay browser envelopes to vendors,
because browser adapters already own those copies and relaying would double
count.

Revenue is never derived from client events. Daily recognized-revenue metrics
come from posted/reconciled `finance_transactions` in integer minor units and
are market/currency scoped. Event-derived transaction counts are product
signals only.

## SEO and Search Console

The Search Console worker uses a server-side service account with the official
Search Analytics API. It imports finalized data three days behind, paginates in
25,000-row pages, and upserts by date/site/market/query/page/country/device.
Every page is resolved through Shongre's canonical market resolver; unresolved
domains are skipped instead of defaulting to France. Success and failure state
is stored per Search Console property and displayed as staleness/health.

## API, dashboards, and authorization

The canonical API exposes:

- public, rate-limited `POST /analytics/events`;
- platform overview for `analytics.platform.read`;
- acquisition, search and SEO for `analytics.marketing.read`;
- monetization for `analytics.finance.read`;
- provider health for `analytics.technical.read`;
- seller-only metrics for `store.analytics.read.own`, with backend ownership
  enforcement.

The admin screen is `/admin/analytics`. Its tab and market/date filters are
URL-backed, and tabs are omitted when the principal lacks their capability.
Frontend visibility is only presentation; the backend enforces every grant.
The seller endpoint never returns competitor aggregates.

In local and development environments, a collapsed Analytics Debug Panel shows
consent state, active providers and the last sanitized canonical envelope. It
is not rendered in preview, staging or production.

## Provider and environment configuration

Optional providers are fail-safe and disabled by default. Public identifiers
are runtime-injected into the Web container; server secrets stay in the backend
runtime file/secret store. Values are never Docker build arguments.

| Capability     | Browser variables                                                                                          | Server variables                                         |
| -------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Internal       | `NEXT_PUBLIC_INTERNAL_ANALYTICS_ENABLED`                                                                   | `ANALYTICS_MODE`                                         |
| PostHog EU     | `NEXT_PUBLIC_POSTHOG_ENABLED`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`, optional replay flag | `POSTHOG_ENABLED`, `POSTHOG_PROJECT_KEY`, `POSTHOG_HOST` |
| GA4            | `NEXT_PUBLIC_GA4_ENABLED`, `NEXT_PUBLIC_GA4_MEASUREMENT_ID`                                                | `GA4_ENABLED`, `GA4_MEASUREMENT_ID`, `GA4_API_SECRET`    |
| Matomo         | public enabled/URL/site ID                                                                                 | server enabled/URL/site ID/auth token                    |
| Cloudflare     | public enabled/site tag                                                                                    | same public status values are read for diagnostics       |
| Search Console | none                                                                                                       | enabled/service-account JSON/site URLs                   |
| Sentry         | public enabled/DSN/sample rate                                                                             | server enabled/DSN/sample rate                           |

The tracked profiles keep credentials empty and optional providers disabled.
Local analytics is off, automated tests are marked test traffic, development
and staging use isolated projects, and production accepts only production
configuration. Never reuse a PostHog project, GA property, Matomo site, Sentry
environment or Search Console credentials across environment boundaries.

The immutable image build emits browser and Node source maps, injects Sentry
debug IDs, uploads the artifacts under the same full commit SHA exposed at
runtime as `RELEASE_SHA`, and removes every `.map` file from the runtime image.
The build receives `SENTRY_AUTH_TOKEN` as a BuildKit secret and reads
`SENTRY_ORG`, `SENTRY_FRONTEND_PROJECT`, `SENTRY_BACKEND_PROJECT`, and optional
`SENTRY_URL` from GitHub build variables mounted as BuildKit secrets. None of
these values becomes a Docker build argument, image layer, release manifest, or
runtime file. An entirely unconfigured build skips the upload; a partially
configured build fails so a release cannot silently ship unsymbolicated.

To add a provider, implement `AnalyticsProvider`, define its purpose category,
lazy initialization and shutdown/reset behavior, add the provider control-plane
entry, public/server configuration validation, CSP origins, safe health
evidence and mocked failure tests. Do not expose a secret or mark a provider
active merely because an SDK is installed.

## Operations, testing, and rollout

Use `make analytics-check` for the focused schema/privacy/service/migration/API
gate, then `make check`. Browser-affecting changes finish with `make check-all`.
No test configuration may point at production collectors.

Provider-health triage:

1. Check enabled/configured state without displaying credentials.
2. Compare last success, last failure and queue backlog.
3. Check the worker lease/log with the same request/release context.
4. For Search Console, inspect the per-site sync state and finalized date.
5. Disable only the failing optional provider if needed; the internal ledger
   and marketplace workflows continue.

Deploy migration `00066` once from the certified backend digest before API and
worker rollout. It is an additive expansion and remains compatible with the
previous application. Application rollback reuses the previous image digests
and does not reverse the migration. Provider activation is a runtime change:
enable in development, validate sanitized payloads and identity/consent, then
staging, then production. Roll back a provider by disabling its flag; never
delete event history or automatically reverse the schema.
