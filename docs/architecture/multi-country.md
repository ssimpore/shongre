# Multi-country domains, routing and market isolation

## Outcome

Shongre is one platform and one deployment with country-aware presentation and
policy. It is not a collection of cloned country applications.

| Public entry       | Meaning                 | Canonical behavior                      |
| ------------------ | ----------------------- | --------------------------------------- |
| `shongre.fr/*`     | France marketplace      | root path, EUR, `fr-FR`                 |
| `shongre.com/`     | global gateway          | country choice only                     |
| `shongre.com/be/*` | Belgium marketplace     | EUR, `fr-BE` default                    |
| `shongre.com/ch/*` | Switzerland marketplace | CHF, `fr-CH` default                    |
| `shongre.com/sn/*` | Senegal                 | launch page, no marketplace traffic yet |
| `shongre.com/bf/*` | Burkina Faso            | launch page, no marketplace traffic yet |

France is never canonical under `/fr`. `www.shongre.fr`, `www.shongre.com` and
`shongre.com/fr/*` receive 308 redirects. Unknown domains and unknown two-letter
paths fail closed. Query strings are preserved by the request proxy.

## Ownership and request flow

```text
DNS/TLS/CDN for both domains
        |
        v
one Next.js deployment + proxy.ts
        |
        v
resolveMarketContext(host, path)
        |
        +-- global gateway
        +-- launch page
        +-- shared WebApplication with basename + MarketContext
        +-- permanent canonical redirect
        +-- 404 / invalid-host response
```

`CountryConfig` is the single public schema. Its safe bootstrap registry lives
in `@shongre/contracts` because host resolution must work before a database or
API is reachable. The backend `markets` table persists the same shape for
admin-owned mutable policy, audit and availability. Stable domain/base-path
changes are staged configuration changes: validate them in admin, update the
bootstrap registry through review, deploy the edge snapshot, then activate the
market. This avoids an unreviewed database edit instantly moving public traffic.

Commercial prices, credentials, legal text and provider secrets are not stored
in the bootstrap registry. Tax rates for markets pending legal review remain
`null`; no interface invents a rate.

## Market context and data isolation

The resolved context contains `country`, `market`, `locale`, `currency`,
`publicPath`, `internalPath`, `routingBasePath` and `canonicalUrl`. UI components
consume this through the existing market provider; they do not parse the host.

HTTP adapters attach `X-Shongre-Market`. The backend independently resolves the
referrer and explicit query/body market, rejecting mismatches and unlaunched
markets. The header is a scope hint, never authorization. Search and listing
queries always include market eligibility. A listing is shared data with
market-publication records, not a copied record per country. Taxonomy remains
shared, with `category_market_availability` carrying local enablement and local
attribute extensions.

Organizations and stores similarly use `organization_markets` and
`store_markets`. User identity, provider connections, CRM, messaging and audit
remain shared unless a domain rule explicitly requires a market association.

## Identity across `.fr` and `.com`

Browsers cannot safely share host-only sessions across unrelated registrable
domains. Authenticated market switching therefore calls `AuthService`:

1. the source authenticated session requests a target-country handoff;
2. the backend stores only a SHA-256 code hash with source/target, a safe
   relative return route and a 120-second expiry;
3. the browser navigates to the target host with the one-use authorization
   code;
4. the target atomically consumes it and creates a separate host-local session;
5. reuse, expiry, target mismatch and unavailable markets are rejected.

The query never contains an access or refresh token. Recent-auth/MFA evidence is
preserved only when still valid. Production places the same `/api/v1` reverse
proxy in front of the backend on both public domains, so cookies remain local to
the destination host.

## SEO and public URL construction

All code uses `buildPublicUrl()` / `buildMarketSwitchUrl()`. Canonicals remove
filter and pagination queries unless a route explicitly needs one. Public
metadata emits active reciprocal `hreflang` entries plus
`x-default=https://shongre.com/`; launch and disabled markets are excluded.
Free-text result pages are `noindex`.

The `.fr` sitemap contains France URLs. The `.com` root sitemap describes only
the gateway and points robots at `/be/sitemap.xml` and `/ch/sitemap.xml`.
Country sitemap routes return 404 unless the country is active,
marketplace-enabled and indexable. Product/Profile structured data and all share
actions use the same canonical builder.

## Public URL migration map

| Legacy or ambiguous source                      | Canonical target                                       |
| ----------------------------------------------- | ------------------------------------------------------ |
| `https://shongre.com/fr/<route>`                | `https://shongre.fr/<route>`                           |
| `https://www.shongre.fr/<route>`                | `https://shongre.fr/<route>`                           |
| `https://www.shongre.com/<route>`               | `https://shongre.com/<route>`                          |
| hardcoded `shongre.com/annonce/<id>` for France | `buildPublicUrl({ country: "FR", route })`             |
| relative link in an email/notification          | store `{ marketCode, linkRoute }`, resolve at delivery |

Redirects are permanent only when the mapping is unambiguous. No country is
guessed from language, IP or currency.

## Deployment and local development

Attach `shongre.fr`, `www.shongre.fr`, `shongre.com` and `www.shongre.com` to
the same Web deployment and certificate. Configure:

```env
SHONGRE_FR_DOMAIN=shongre.fr
SHONGRE_GLOBAL_DOMAIN=shongre.com
SHONGRE_CANONICAL_PROTOCOL=https
SHONGRE_TRUST_PROXY_HOST=false
OAUTH_ALLOWED_RETURN_ORIGINS=https://shongre.fr,https://shongre.com
```

Only enable trusted forwarded-host resolution when the CDN overwrites the
header. Both domain cache keys must vary on `Host`; redirects must not be cached
as another host's page. Reverse proxy `/api/v1/*` to the one backend deployment.

Local France remains `http://127.0.0.1:3000/`. Use `/be`, `/ch`, `/sn`, `/bf`
for country paths and `http://global.localhost:3000/` for the gateway. The
frontend is expected to work with the backend stopped in demo mode.

## Administration, rollout and rollback

The Markets administration surface exposes domain, base path, default and
supported locales, currency, timezone, launch status, marketplace/payment
availability, SEO visibility, compliance review and launch copy. Backend
validation prevents duplicate domain/path pairs, a non-root France route, a
root international market, payment without a provider, or activation before a
required legal review. Every change records actor, fields and versions.

Roll out through `coming_soon -> private_beta -> beta -> active`. A rollback
sets the market to `paused` or `disabled`; the resolver then serves the safe
launch surface and backend operations fail closed. Never delete a market or
duplicate its listings to roll back routing.

## Observability and acceptance gates

Structured request logs carry host, country, locale and currency. Monitor
`unknown_country`, `invalid_host`, `redirect`, `redirect_loop`, `canonical_mismatch` and
`resolution_error` by host/market; never record full search queries, auth codes
or tokens. Alert on an unexpected rise after routing changes.

Before production activation verify:

- `.fr`, gateway, `/be`, `/ch`, `/sn` and `/bf` on mobile and desktop;
- 308 targets and query preservation for France and `www` aliases;
- canonical, Open Graph locale, reciprocal `hreflang`, robots and sitemaps;
- EUR/CHF/XOF presentation and locale-specific formatting;
- search/listing isolation and wrong-market API rejection;
- guest switching and one-use authenticated domain handoff;
- admin legal/provider gates and configuration audit;
- rollback to `paused` without data mutation.

## Canonical data ownership and scopes

Every domain is classified before implementation:

| Scope | Meaning | Examples |
| --- | --- | --- |
| `PLATFORM_GLOBAL` | One record for the platform; market is not part of identity | users, identity, conversations, provider definitions, audit events |
| `MARKET_SCOPED` | The record is valid in exactly one explicit market | saved search, local legal content, market notification, provider route assignment |
| `MULTI_MARKET_SHARED` | One shared entity with explicit market availability rows | listings, organizations, stores, taxonomy nodes |

Listings are `MULTI_MARKET_SHARED`. `listings` owns content, seller, origin and
lifecycle. `listing_market_publications` owns `{market, status, isPrimary,
priceMinor, currency, localizedContent, availableServices, complianceState,
publishedAt, sortDate}`. The `(listing_id, market_code)` key prevents duplicate
country copies and the partial unique index permits at most one declared primary;
the application write boundary requires exactly one. Discovery joins this relation with `status=active` and
`compliance_state=approved`; it never falls back to `listings.market_code` for a
different requested country.

Legacy `listings.market_code`, `price` and `currency` remain as a compatibility
projection during migration. Their France/Euro defaults are removed. New code
must write the market-publication relation and use ISO 4217 minor-unit exponents
(for example EUR 2, XOF 0, BHD 3).

## Provider routing and graceful degradation

Provider definitions are platform-global. Runtime assignments are explicit and
keyed by:

```text
scope + market + capability + operation + currency + environment
```

`MARKET_SCOPED` rules must reference an enabled market. A payment currency must
match the market configuration and the provider's audited currency support.
Runtime selection also requires an implemented adapter, configured credentials,
enabled state, verified healthy evidence and fresh observation time. A second
provider is not a fallback merely because its numeric priority is lower:
`fallback_provider_id` and `automatic_failover=true` are both required. Without
that approval the feature degrades to unavailable. Frontend demo assignments are
deterministic and explicit per active market; they are not evidence of production
readiness.

## Adding a country safely

Use this checklist in order. A country must remain `coming_soon` until every
required gate is complete.

1. Add a reviewed `CountryConfig` entry with ISO country/market codes, domain,
   base path, locales, currency list, timezone, measurement system, phone prefix,
   address format and location hierarchy. Do not copy France's commercial policy.
2. Add the matching `markets` migration/config row. Leave marketplace, payments,
   monetization, SEO indexing and regulated capabilities disabled by default.
3. Classify each affected entity as `PLATFORM_GLOBAL`, `MARKET_SCOPED` or
   `MULTI_MARKET_SHARED`; add availability relations rather than country tables.
4. Configure taxonomy/category availability, local attributes, publication
   rules, geography, delivery methods and search facets for the country.
5. Supply explicit money configuration and tests for the currency exponent,
   locale formatting, tax display and rounding. Never infer currency from
   language.
6. Complete local legal review: marketplace terms, privacy/cookie text,
   prohibited items, consumer/professional duties, VAT/tax rules, KYC/KYB and
   payment/payout requirements. Record approvals; do not encode an assumed rate.
7. Assign providers per market/capability/operation/currency and environment.
   Verify credentials by opaque reference, webhooks, health probes, circuit
   behavior and any approved fallback. Demo success is not a production gate.
8. Add deterministic demo fixtures, including at least one local listing and
   relevant individual/pro personas. Confirm the frontend still runs with the
   backend stopped.
9. Add unit, integration, RLS/static and E2E coverage for routing, isolation,
   wrong-market rejection, locale/currency, search refresh, publication,
   provider incompatibility and launch-page behavior.
10. Validate canonical/hreflang/robots/sitemap behavior, mobile and desktop
    layouts, accessibility, observability dimensions, cache variation by host,
    rollback and one-use auth handoff.
11. Promote deliberately through `coming_soon -> private_beta -> beta -> active`.
    Activation is a reviewed admin action, never a side effect of adding a row.

## Human decisions still required

Repository behavior deliberately fails closed where local facts require people
or external contracts. Before any new production country is activated, legal and
operations owners must approve local marketplace terms, consumer law treatment,
tax/VAT configuration, KYC/KYB thresholds, prohibited categories, provider and
payout contracts, data-residency/retention constraints, delivery coverage and
support/escalation ownership. Senegal and Burkina Faso remain launch-only for
this reason. Belgium and Switzerland are technically routed in demo, but the
checked-in `legalReviewStatus=approved` values are configuration assertions and
must be reconciled with signed review evidence in the operational system before
production activation.
