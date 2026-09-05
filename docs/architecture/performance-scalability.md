# Performance, caching, and scalability

## Scope and source of truth

`packages/contracts/src/operational-performance.ts` is the typed source for
launch SLOs, performance budgets, cache defaults, request timeouts, retry
timing, and bounded discovery/load-test defaults. Backend environment overrides
are parsed once by `backend/src/app/config/index.ts`; Web consumers import the
same contract. A timeout, TTL, pool threshold, or bundle budget must not be
redeclared in a component, repository, adapter, workflow, or deployment file.

The values are launch objectives, not claims about production capacity. They
must be recalibrated after 30 days of representative production traffic without
weakening the error budget to hide a regression.

## Service objectives and budgets

| Signal                         |                                   Launch objective |
| ------------------------------ | -------------------------------------------------: |
| Successful API availability    |           99.9% monthly, excluding intentional 4xx |
| API latency                    | p95 < 750 ms; p99 < 2,000 ms for non-upload routes |
| Database interactive query     |          p95 < 100 ms; slow-query threshold 250 ms |
| LCP / INP / CLS / TTFB         |                 ≤ 2,500 ms / 200 ms / 0.1 / 800 ms |
| Anonymous CDN cache hit ratio  |    discovery ≥ 40%; catalog ≥ 70%; reference ≥ 80% |
| Cache invalidation propagation |                                    p95 < 5 seconds |
| Payment webhook acceptance     | 99.9% within 30 seconds; none older than 5 minutes |
| Database recovery              |                     RPO ≤ 5 minutes; RTO < 2 hours |
| Object recovery                |                                      RTO < 4 hours |

`frontend/scripts/check-client-bundle-budget.mjs` enforces executable and
generated-taxonomy budgets independently. `scripts/load-smoke.mjs` enforces
hosted success/latency and conditional-cache behavior. Browser Web Vitals are
recorded only through the consent-gated analytics boundary.

## Request and cache flow

```text
browser
  -> immutable Next build assets / bounded public brand assets
  -> Cloudflare cache (Host + URL + market + locale variation)
  -> Next server or backend API
  -> anonymous public-response registry
       -> ETag + versioned Cache-Tag + SWR/SIE
       -> public projection service
       -> repository (explicit projection + bounded page)
       -> PostgreSQL/Supabase
```

The backend registry in
`backend/src/infrastructure/http/public-response-policy.ts` is deny-by-default.
Only explicitly listed public GET projections may be shared. Any request with a
Cookie or Authorization header, all principal/permission-dependent reads, all
writes, all errors, and all unregistered routes return `private, no-store`.
Public cache variation includes origin, market, locale, and content encoding.
No identity, organization, role, subscription, balance, verification, message,
payment, or moderation response is eligible for shared caching.

Profiles are deliberately bounded:

- discovery: 15 seconds shared, 30 seconds SWR, 120 seconds stale-if-error;
- catalog: 5 minutes shared, 10 minutes SWR, 1 hour stale-if-error;
- reference: 1 hour shared, 24 hours SWR/stale-if-error.

All may be overridden through the validated `PUBLIC_CACHE_*` variables. Bump
`PUBLIC_CACHE_KEY_VERSION` for an emergency logical flush. Anonymous responses
emit `Cache-Tag`; cache-affecting writes emit the same tag namespace through the
`public_cache_invalidation_requested` structured event and the
`X-Shongre-Cache-Invalidate` response header. The deployed edge must consume
that event with its protected purge credential and meet the five-second
invalidation SLO. Until that adapter is evidenced, the short discovery TTL is
the consistency bound; do not add an API token to application source or a
public environment variable.

The commercial catalogue cache is a separate market-only resilience cache. It
coalesces concurrent misses, applies deterministic ±10% TTL jitter, invalidates
after publication/activation, and serves a same-market last valid value only
inside the configured five-minute stale-if-error window. It never caches
quotes, entitlements, eligibility, subscriptions, permissions, or balances.

Redis is intentionally absent. Introduce a Redis-compatible shared cache only
after at least two API replicas show repeated origin/database work that the CDN
and request coalescing cannot absorb, or when measured invalidation cannot meet
the SLO. Keys must begin with the configured cache-key version and include every
applicable market, locale, tenant, organization, principal/role, and permission
version. Use single-flight locking with a bounded lease and never make Redis
authoritative.

Server-rendered employment, automotive, education, and real-estate metadata now
resolve through the same lazy demo/HTTP service registry as the client. In API
mode they no longer instantiate demo services. Generic listing/category,
seller, collection, and sitemap inventory still depend on frontend demo
repositories because the metadata loader has not been migrated and the public
API does not yet expose a slug-safe seller projection or cursor-based sitemap
feed. That gap is a production indexing release blocker: migrate listing reads,
add those two OpenAPI contracts, migrate the loader, and remove the repository
imports before enabling large-scale indexing. Do not substitute unbounded
per-record API calls.

## Database path and query evidence

The hot listing read selects an explicit column projection and nested public
seller/media/publication projections. Market discovery orders by the
publication's `sort_date`, matching the market-scoped freshness model and the
existing `listing_market_discovery_idx`. The repository retains exact totals
because they are part of the current API contract; deep/high-cardinality
results must migrate contract-first to an opaque keyset cursor before exact
count becomes a bottleneck.

`make performance-db-plan PERFORMANCE_DATABASE_URL=postgres` creates 250,000
deterministic rows in transaction-local temporary tables, runs `ANALYZE` and
`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)`, verifies index use and rolls back.
It refuses credentials, non-loopback targets, production, and datasets outside
100,000–2,000,000 rows. On the 2026-09-05 development workstation the original
listing-level ordering produced 123.346 ms with a hash join, sequential scan,
and sort; publication-level ordering produced 0.155 ms with bounded nested-loop
index scans. These figures prove the query-shape improvement, not hosted
capacity. A production release still requires a plan captured on staging with
production-like statistics and RLS.

Existing migrations already provide full-text/GIN, organic freshness,
market-publication discovery/price, publisher, foreign-key, and partial indexes.
No new index was added because the measured query now uses the existing one.
Add indexes only from a captured slow query and validate write amplification,
size, selectivity, and the before/after plan. Large-table indexes must use the
protected online-migration procedure, lock/statement timeouts, and an
expand-first release; application rollback never reverses schema.

The repository-wide audit also found legacy broad selections in non-hot domain
repositories. They are intentionally retained until each owning transport or
domain projection is specified and a representative trace shows the columns
actually consumed; a mechanical removal would risk silently dropping fields
from payments, moderation, reporting, or internal operations. No new broad
selection is permitted on a public or high-volume path. Migrate each measured
path contract-first, prove all consumers against the narrower projection, and
then remove the broad selection in the same change.

Supabase REST is the application database boundary, so the deployment's
Supavisor pool owns PostgreSQL connection limits. Use transaction mode for
stateless API/worker traffic, reserve direct/session connections for migrations
and operations, cap each workload so API + worker + migration + observability
remain below 80% of the database connection limit, and alert before saturation.

## Asynchronous work and backpressure

Email, notifications, provider webhooks, media scanning/cleanup, analytics,
search indexing, CRM/marketing work, and lifecycle expiry already use the
repository's durable PostgreSQL queues/outboxes and worker leases. Claims use
bounded batches and `SKIP LOCKED`; retries are idempotent and exponentially
backed off; terminal failure is retained for operational review. Do not move
these paths back to request timers or process memory. Scale workers by queue age
and provider quotas, not CPU alone.

## Observability and scaling triggers

HTTP completion logs include request/trace ID, route path (never the query
string), status, duration, cache policy, cache-tag count, encoding, and response
bytes. The listing repository emits privacy-safe query duration, result/count,
market, page, limit, and sort dimensions. Catalogue access emits fresh-hit,
miss, refresh, coalesced, and bounded-stale outcomes. Dashboards must show API
p50/p95/p99, 5xx/error-budget burn, database/query latency, connection
saturation, cache hit/age/invalidation, queue depth/oldest age/retries/dead
letters, Web Vitals, bundle bytes, CPU, memory, and object-storage egress.

Investigate and scale when any of these persist for 15 minutes (or page sooner
for the existing critical alerts): database p95 > 100 ms, connections > 80%,
API p95 > 750 ms, catalog/reference hit ratios below target, payment work older
than five minutes, or worker oldest-age growth across two intervals. Read
replicas are justified only for measured read saturation after query/index and
cache work; dedicated search is justified only when Postgres full-text/geo
plans breach SLO at representative scale; materialized views require an owned
refresh/invalidation contract.

## Verification and rollout

Run:

```bash
make performance-check
APP_ENV=local PERFORMANCE_DATABASE_URL=postgres make performance-db-plan
make performance-smoke # against the exact staging release, with required env
make observability-evidence
make check
make check-all
```

Roll out cache policy first in staging, compare uncached, fresh, revalidated,
and stale-if-error paths, then canary one API replica. A rollback restores the
previous immutable application digest. Cache rollback is a
`PUBLIC_CACHE_KEY_VERSION` bump plus a tag purge; it never requires deleting
customer data. Preserve old and new schema compatibility throughout deployment.
Run backup/object restore evidence before production and retain the exact
release SHA, query plans, load evidence, dashboard links, and alert receipt.

The repository cannot certify production capacity without hosted production-
like data, Supabase pool metrics, CDN purge credentials, and a staging traffic
run. Those are release evidence, not values to fabricate in source control.
