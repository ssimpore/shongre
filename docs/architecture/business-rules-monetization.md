# Business Rules & Monetization

## Purpose

Shongre now treats prices, commercial eligibility, publication quotas, subscriptions, premium placement, delivery reference prices, commissions, taxes, promotions, and payout fees as versioned business configuration. React components and mobile screens are consumers; they are not authorities.

The canonical flow is:

```text
Admin draft → validation/simulation → independent approval → publish/schedule
                                                           ↓
Client context → active version cache → safe evaluator → immutable quote
                                                           ↓
Stripe Checkout → signed webhook → idempotency ledger → entitlements
```

`@shongre/contracts/monetization` owns the public schemas. The current audited demo/backfill catalog lives in `packages/contracts/src/fixtures/monetization-catalog.ts`. Demo adapters use it directly. Database deployments import that validated snapshot with `npm run db:backfill:monetization --workspace=shongre-backend` after migration `00015_business_rules_monetization.sql`.

The proposed replacement lives as `commercial-fr-v4-draft` in `packages/contracts/src/fixtures/monetization-proposed-catalog.ts`. It reuses the same schema and persistence path; it is not a second active catalog. `make monetization-draft-import` is deterministic and idempotent outside production. It never changes the active v3 snapshot. The shared professional-catalog selector may expose this newer, migration-linked version as a clearly labelled public preview, but it returns only the target plan identities, disables checkout, and never merges the active legacy plans into that presentation.

## Domain model

- `commercial_rule_sets` groups a stable business domain.
- `commercial_configuration_versions` is the lifecycle and immutable runtime snapshot. Only one version per rule set and market may be active.
- `commercial_rules` stores allowlisted structured conditions and outcomes, with priority, scope, effective dates, and status.
- `monetization_products` is stable identity; `monetization_product_versions` contains versioned copy, audience, scope, compatibility, and consumers.
- `monetization_prices` stores integer minor units, currency, billing period, tax basis points, duration, trial, and effectivity.
- `monetization_product_entitlements` expresses capabilities and quotas without branching on plan names.
- `monetization_promotions` and `monetization_promotion_products` define bounded validity, stacking, scope, and redemption limits.
- `monetization_quotes` and `monetization_quote_items` preserve the exact configuration version, product version, selected price id, billing period, amounts, tax, discount, entitlements, and SHA-256 snapshot hash used for a purchase.
- `monetization_orders`, `monetization_payment_events`, `monetization_entitlements`, `monetization_subscriptions`, and `monetization_usage_counters` hold financial and consumption state. Effective subscriptions, entitlements, orders and invoices retain their exact market and immutable configuration/product evidence; a market-scoped projection excludes records whose evidence cannot be resolved.
- `commercial_configuration_approvals` and append-only `commercial_configuration_audit` provide four-eyes approval and evidence.
- `commercial_plan_migration_mappings`, `commercial_price_protection_policies`, `commercial_campaigns`, `commercial_economics`, `commercial_provider_mappings`, `commercial_paid_placement_policies`, and `commercial_offer_definitions` are deferred projections of the same immutable catalog snapshot.
- `monetization_price_protection_records` and its event stream preserve price locks, grandfathering and contract protection without changing historical price records.
- `enterprise_commercial_contracts` stores customer-specific price books and entitlement snapshots. Accepted commercial terms are immutable and every transition has append-only audit evidence.

All monetary values are integer minor units. All rates are integer basis points. Database constraints reject negative prices, invalid rates, invalid status values, contradictory dates, self-approval, duplicate active versions, duplicate redemptions, and inconsistent quote totals.

## Rule evaluation

The evaluator accepts only the fields and operators declared by the shared Zod schemas. It has no `eval`, JavaScript expressions, SQL fragments, regex payloads, dynamic property paths, or executable callbacks.

Resolution is deterministic:

1. discard inactive or out-of-window rules;
2. match explicit scope dimensions;
3. match allowlisted conditions;
4. order mandatory rules first, then priority, specificity, and stable id;
5. use the first value for each outcome key;
6. apply the usage counter to the resulting quota;
7. return every match/non-match as an explanation.

This lets a category-specific Auto quota override a generic individual quota without duplicating the publication flow. Mandatory legal constraints can outrank normal commercial configuration.

## Quotes, checkout, and webhooks

Clients send product ids, optional published price ids (for monthly/annual choice), and context—never amounts. The server:

1. loads the active version or last-known-valid version;
2. validates product status, audience, market/category scope, dependencies, and exclusions;
3. resolves effective prices and promotions;
4. requires approved direct-cost/margin evidence when the selected price declares economics;
5. calculates discounts and taxes in minor units;
6. snapshots product versions and entitlements;
7. hashes the canonical snapshot;
8. stores an idempotent, expiring quote.

Checkout accepts only `quoteId` and an idempotency key. It recomputes the canonical quote hash before contacting a provider, and provider idempotency is bound to the quote rather than a caller-selected key. Stripe Checkout metadata carries the quote id and snapshot hash. The signed webhook claims the provider event, locks the order, verifies the snapshot hash, updates order/quote status, records promotion redemption, creates subscriptions, and grants each entitlement once. Subscription/invoice events renew periods, mark past-due state, or expire rights idempotently. Replayed events return without repeating effects.

Stripe checkout always requires a synchronized mapping for the exact internal price, provider, runtime environment and market. A missing or mismatched mapping fails closed before contacting Stripe. The adapter sends the verified external Price identifier instead of recreating mutable price data. Mapping rows store provider object identifiers and verification evidence, never credentials.

Promotion validation is available independently and returns stable reason codes. Quote persistence takes a PostgreSQL advisory lock for the code and counts paid redemptions plus unexpired quote reservations, preventing concurrent quotes from exceeding global or per-account limits.

The legacy free-form `/payments/intent` route now delegates to quote checkout and no longer accepts a client amount. The simulated production Stripe adapter was disabled.

## Subscription transitions

Upgrade, downgrade, billing-interval, same-plan renewal, cancellation and payment-failure behavior comes from the catalog's typed subscription policy. It is not inferred from a product name. Every change preview identifies the exact target product/configuration versions, policy and whether provider confirmation is required. Apply uses the client-observed subscription timestamp, an idempotency key and one database transaction with a subscription row lock; the subscription, attached items, entitlements and event evidence therefore change once or not at all. A scheduled downgrade keeps current rights until its recorded boundary. Provider-backed changes fail closed while their provider transition policy is unconfigured.

## Cache and resilience

Backend active catalogs are cached briefly by market. Every validated load becomes the last-known-valid copy for that same market. A transient database/configuration failure may serve only that same-market copy with `stale: true`. If no valid copy has loaded, the request fails closed; it never substitutes France or another market. Admin health surfaces show stale state.

## Security boundaries

- Browser/mobile code never connects to business tables or Stripe directly.
- RLS is enabled with no direct browser write policy; service-role mutations remain behind backend RBAC.
- Admin permissions are granular: read, edit, approve, publish, and order read.
- Draft creation, approval, and publication require a reason. Creator and approver must differ.
- Quote items and audit events are append-only.
- Quota consumption is atomic and refuses an increment beyond the limit.
- Publishing uses an advisory transaction lock and a partial unique index to prevent two active versions.
- A future `effectiveFrom` publishes as `scheduled`; the minute worker calls the locked `activate_due_commercial_configurations` function and invalidates caches after activation.
- Financial history references product/configuration versions rather than mutable current records.
- Customer, organization and Admin reads are filtered through exact market/catalog evidence. Unknown or legacy evidence is excluded instead of being attributed to the active market.
- Migration mappings require historical price and entitlement preservation plus completed shadow quotes.
- Approved economics require a direct cost, margin floor and evidence; quote generation rejects a price below its approved floor.
- Paid placement policies require visible labelling and literal organic-ranking isolation.

## Client boundary

Web uses `BusinessRulesServiceContract` with demo and HTTP adapters. The command center and public Pro page call the service registry. `GET /api/v1/monetization/professional-plans` and the demo adapter both use `selectProfessionalCatalogPresentation`: the public surface therefore receives one typed active-or-preview result with explicit product ids and `checkoutEnabled`, rather than independently choosing or combining tariffs. Its public-safe snapshot contains only the required products, verticals, campaign and price-protection copy; migration governance, commercial economics, provider mappings, commission policies and rules remain private. Auto, Education, and Immo retain their established API shapes through shared projections of the same commercial catalog. Mobile exposes a read-only billing projection (plan, rights, usage and invoices); digital purchase, steering and subscription mutation stay absent until an approved Apple/Google storefront and server receipt-validation policy exists. Demo mode remains asynchronous, deterministic, and backend-independent.

## Typed API surface

- `GET /api/v1/business-rules/catalog`
- `POST /api/v1/business-rules/eligibility`
- `POST /api/v1/monetization/quotes`
- `POST /api/v1/monetization/checkouts`
- `GET /api/v1/monetization/professional-plans`
- `POST /api/v1/monetization/promotions/validate`
- `GET /api/v1/monetization/entitlements`
- `GET /api/v1/monetization/subscriptions`
- `POST /api/v1/monetization/subscriptions/{id}/change-preview`
- `POST /api/v1/monetization/subscriptions/{id}/change`
- `POST /api/v1/monetization/subscriptions/{id}/cancellation`
- protected `/api/v1/admin/business-rules/*` overview, simulation, draft, approval, publish, and rollback routes

Runtime request/response schemas live in `@shongre/contracts/monetization`. `COMMERCIAL_REASON_MESSAGES` provides French and English user-safe copy for stable machine reason codes.
