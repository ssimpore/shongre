# Shongre Solutions product boundary

## Purpose

Shongre Solutions is the catalog and launch surface for Shongre applications.
It is part of the existing frontend, identity, organization, authorization,
runtime-configuration, design-system, demo-data, build, and deployment stack.
It is not an application marketplace with executable third-party URLs and it
does not own authentication, customer records, subscriptions, or product data.

The local routes are:

- `/solutions` — public catalog;
- `/solutions/:solutionSlug` — reusable public detail;
- `/admin/solutions` — staff governance, protected by
  `admin.configuration.manage`.

Hosted canonical entry points are:

- `https://solutions.shongre.fr/` — Solutions catalog;
- `https://prospects.shongre.fr/` — Prospects product;
- `https://facturation.shongre.fr/` — Facturation product.

All three hostnames resolve to the same frontend image. The runtime application
registry maps a typed application identifier to an environment-specific origin.
Catalog administrators select the identifier; they cannot enter or override a
production hostname. This prevents catalog content from becoming an open
redirect.

## Catalog contract

`SolutionsService` is the stable asynchronous boundary used by public and admin
screens. It supports public listing/detail reads and authorized admin creation,
editing, lifecycle transition, and history reads. Current execution uses the
deterministic `DemoSolutionsService` and the central Shongre browser storage
service. The reserved HTTP adapter intentionally performs no request until a
backend public contract exists.

Each catalog record owns product presentation and launch metadata:

- identity, slug, descriptions, category, icon;
- lifecycle and optional availability dates;
- eligible markets, languages, audiences, and capabilities;
- optional entitlement key and authentication/entitlement requirements;
- allowlisted destination application identifier and local application path;
- release notes, public notices, maintenance explanation, replacement slug;
- featured flag and sort order.

It never stores an authentication token, organization secret, arbitrary launch
origin, Cloudflare token, DNS record, or deployment credential.

## Lifecycle and visibility

The supported lifecycle is:

`DRAFT → INTERNAL → COMING_SOON → BETA → AVAILABLE → MAINTENANCE → DEPRECATED → RETIRED`

Transitions need not be linear, but every admin transition requires a recorded
actor, timestamp, and explanation. Public behavior is centralized:

- `DRAFT` is admin-only;
- `INTERNAL` is restricted to Shongre staff;
- `COMING_SOON` is visible but cannot launch;
- `BETA` is visible and can optionally require authentication or entitlement;
- `AVAILABLE` requires a valid allowlisted destination;
- `MAINTENANCE` stays visible, requires a public explanation, and cannot launch;
- `DEPRECATED` stays accessible with a migration/replacement notice;
- `RETIRED` is absent from public reads but remains in admin history.

The normalized launch decision evaluates lifecycle, market, authentication,
entitlement, access class, maintenance, and destination availability. UI
visibility is presentation only; the demo service also enforces admin capability
checks. A future backend adapter must enforce the same contracts server-side.

## Markets, accounts, and entitlements

Catalog eligibility is country-aware. Seed products support France, Belgium,
and Luxembourg where declared, and the active market is passed to public reads
and launch decisions. Locale and availability dates remain explicit. Currency
does not belong to the catalog unless a future commercial offer displays money;
authoritative prices remain in monetization services using minor units.

Prospects and Facturation remain separately entitled Shongre products. Existing
organizations add those entitlements to the same account and organization;
product-only organizations receive only their product workspace and relevant
shared settings. Solutions links to product acquisition or launch flows but
does not duplicate accounts, organizations, business information, plans, or
subscriptions.

The Marketplace is also a managed catalog entry and resolves to the existing
market-aware Shongre application. It remains publicly discoverable; actions
inside it continue to use the Marketplace’s established authentication and
permission policies.

## Adding or activating a solution

1. Create the catalog entry as `DRAFT` in `/admin/solutions`.
2. Configure descriptions, markets, languages, audiences, entitlement key, and
   an allowlisted application destination.
3. Preview the public detail route.
4. Transition to `INTERNAL`, `COMING_SOON`, or `BETA` with an audit explanation.
5. Validate product authentication, organization membership, market eligibility,
   entitlement acquisition, workspace access, and logout behavior.
6. Transition to `AVAILABLE` only after the application identifier resolves in
   each target environment. The service rejects an available record without a
   destination.
7. Customers activate the product through its subscription/entitlement flow;
   existing accounts keep the same organization and users.

## Host routing and security

Origins are injected at runtime through `SHONGRE_MARKETPLACE_ORIGIN`,
`SHONGRE_SOLUTIONS_ORIGIN`, `SHONGRE_PROSPECTS_ORIGIN`, and
`SHONGRE_FACTURATION_ORIGIN`. Production requires HTTPS and distinct hosts.
Local development uses one loopback origin and falls back to `/solutions`,
`/prospects`, and `/facturation`.

The request proxy recognizes only configured application hosts. Other hosts
continue through the existing deny-by-default market resolver. Product hosts
receive the same CSP, security headers, cookie-consent gate, and application
providers as the marketplace. Cross-host links never place sessions or tokens
in query strings. A future unified login handoff must use fixed allowlisted
return destinations, server-managed sessions, SameSite/CSRF protections, and
the reviewed callback process in `docs/architecture/authentication.md`.

## Deployment boundary

Root `compose.yaml` is unchanged: no origin ports are published and the existing
remote-managed Cloudflare Tunnel remains the only hosted ingress. Operators add
public-hostname mappings to `frontend:3000` outside application deployment.
Releases build one frontend digest per main commit and promote that exact digest
through DEV, STAGING, and PRODUCTION. Runtime origin changes do not rebuild the
image and must not create DNS, Tunnel, token, database, or deployment pipelines.

Hosted certification can set `PLAYWRIGHT_SOLUTIONS_URL`,
`PLAYWRIGHT_PROSPECTS_URL`, and `PLAYWRIGHT_FACTURATION_URL` alongside the
existing hosted-smoke variables. The smoke test verifies the resolved
application header, hostname-specific title, canonical URL, and shared security
headers for every application host.
