# Delivery and courier marketplace

## Scope

`delivery` is the canonical domain for Shongre's local delivery-request
marketplace. The French product label is **Livraison & coursier** and the
English label is **Delivery & courier**. It supports two request origins:

- a standalone request created by an authenticated customer;
- a request linked to an eligible physical Shongre order by its buyer or
  seller.

It does not provide courier payment, escrow, commission, route optimization,
continuous location tracking, carrier integrations, cross-border fulfillment,
or a checkout delivery method. A courier quote is informational and does not
change an order amount or state.

## Activation and market isolation

The taxonomy identity is
`services.local_services.delivery_courier`. Runtime activation is separate
from taxonomy availability and requires all of the following:

1. a resolved marketplace `MarketContext`;
2. an enabled country and marketplace;
3. the country's delivery capability and operational, legal, and compliance
   readiness;
4. an available `SERVICE_REQUEST` taxonomy schema for the exact market;
5. an exact market-scoped `delivery.marketplace` rule evaluating to true.

The flag definition is public, owned by Marketplace Operations, and defaults to
false. Its shared evaluator deliberately ignores global, organization, account,
and default-enable rules for this key. Demo clients contain an explicit,
deterministic France-only simulation; that rule is not a production rule and is
never persisted by the backend.

To activate a market, an owner or appropriately authorized operator must first
record the market readiness evidence, validate the taxonomy projection, and
then create a 100% rule scoped to that exact market in the existing feature-flag
control plane. Run `make taxonomy-check`, `make openapi-check`,
`make migrations-check`, and `make test-critical` before rollout. Senegal and
Burkina Faso remain coming-soon and non-indexable.

Rollback removes or disables the exact market rule. The kill switch immediately
blocks discovery, new requests, publication, profile activation, applications,
and selection. Existing assigned deliveries retain only cancellation,
completion, dispute, and closure paths so users are not stranded.

## Boundaries and authorization

The Web and Expo clients use the same boundary:

```text
screen/component -> delivery contract -> demo or HTTP adapter -> API
API -> DeliveryService -> DeliveryRepository -> PostgreSQL
```

The backend is authoritative. UI visibility is only progressive disclosure.
Every API operation declares access metadata and uses one of these capabilities:

| Capability                        | Purpose                                              |
| --------------------------------- | ---------------------------------------------------- |
| `delivery.read`                   | Public-safe discovery and participant status reads   |
| `delivery.request.manage.own`     | Create, publish, select, and manage an owned request |
| `delivery.courier.manage.own`     | Manage one's same-market courier profile             |
| `delivery.application.manage.own` | Apply and withdraw one's application                 |
| `delivery.admin.manage`           | Market-scoped operational administration             |
| `delivery.moderate`               | Suspend unsafe requests without deleting evidence    |
| `report.create`                   | Report delivery UGC through canonical moderation     |

Staff identities remain outside the customer capability plane. Ownership,
selected-courier participation, order participation, market, request state,
profile status, vehicle, weight, service area, blocking, and feature readiness
can only narrow access. Missing context denies access. Cross-market and
nonparticipant lookups return a non-enumerating not-found response.

Public request projections expose only city/postcode-level origin and
destination, time windows, package requirements, requester display/trust state,
and application count. They never contain an exact street, contact name,
telephone number, access instruction, source order ID, courier user ID, or
application message. Exact stops are returned only to the requester and the
selected courier.

Delivery reports use the existing `/reports` boundary and create canonical
moderation cases with a `delivery_request` target. Moderators and Trust &
Safety staff receive the separate `delivery.moderate` capability; ordinary
market operators do not inherit it. Suspension is version-aware, removes the
request from public discovery and new matching, retains its private record and
immutable events, and records a reason in the delivery event stream.

## Lifecycle and concurrency

Request lifecycle:

```text
draft -> pending_review -> open -> assigned -> picked_up -> in_transit
                                                    -> delivered -> completed
open/assigned/picked_up -> cancelled
assigned/picked_up/in_transit/delivered -> disputed -> completed|cancelled
open -> expired|suspended; suspended -> open|cancelled
```

Application lifecycle:

```text
submitted -> accepted
          -> rejected
          -> withdrawn
          -> expired
```

Courier profiles are `inactive`, `active`, `paused`, or `suspended`.

Migration `00096_delivery_marketplace.sql` owns normalized profiles and service
areas, public requests, private stops, applications, immutable events,
matching-deduplication rows, and a durable outbox. All tables carry market
identity, use FORCE RLS, and revoke direct `anon` and `authenticated` access.
Only the backend service role reaches them through the repository.

Publishing, selecting a courier, and lifecycle transitions use security-definer
RPCs that lock the request, compare its version, validate participants and
state, write the domain mutation, append its immutable event, and enqueue its
outbox record in one transaction. A partial unique index guarantees one
accepted application. Selection rejects every other submitted application in
the same transaction. Clients must refresh after
`DELIVERY_ASSIGNMENT_CONFLICT` rather than silently retrying stale intent.

## Matching and notifications

Publication matches only opted-in, active, compliant couriers in the same
market whose pickup and drop-off service postcodes, vehicle, and weight
capacity fit the request. The profile UI supports a primary and optional second
service locality so a courier can explicitly cover both ends of a route.
`(request, courier profile, request version)` is unique, so retries cannot send
the same opportunity twice. Opportunity notifications use the optional
`delivery_opportunities` preference category; assignment and lifecycle updates
use the mandatory transactional `delivery` category. Payloads contain only a
market-safe relative route and public summary. Notification failure is logged
and deferred and never rolls back the delivery mutation.

## Clients, SEO, and accessibility

Web routes are `/livraison`, `/livraison/demande/:requestId`,
`/livraison/nouvelle-demande`, `/compte/livraison`, and
`/compte/livraison/coursier`. Expo exposes the same core journey at
`/account/delivery`. Both adapters remain asynchronous and partition demo state
by account and market. Public request detail is explicitly `noindex`; exact
addresses are never placed in document metadata, analytics, notification URLs,
or client storage.

Forms use the shared typed primitives and semantic design tokens, retain native
labels and validation, expose busy/error state, and preserve touch targets.
Neither client requests background location or any new device permission.

## Retention, deletion, and export

Account deletion fails closed while the account owns or is selected for a
non-terminal delivery. After work is terminal, the deletion preparation RPC
pauses the courier profile, disables opportunity notifications, withdraws and
redacts pending application content, anonymizes the requester projection, and
deletes exact stop rows. Coarse request facts and immutable delivery events are
retained only as operational/audit evidence. No new retention duration is
invented here: legal and privacy owners must approve the exact production
schedule and legal-hold exceptions before launch.

The repository does not yet have one canonical platform-wide account-export
orchestrator. Delivery data must be added to that shared exporter when it is
approved; a delivery-only export path must not be created as a competing
privacy architecture. This is a production launch blocker, not a silent
omission.

## Production launch blockers

The feature remains disabled in hosted markets until accountable owners approve
the legal/consumer-protection model, courier classification and any
registration or licence duties, insurance representations, prohibited and
high-risk goods policy, precise-address retention/legal holds, support and
incident procedures, and the platform-wide account-export integration. No
carrier, payment, mapping, identity, vehicle, licence, background-check, or
insurance provider is implied by this implementation.

## Verification and operations

Run focused checks after a delivery change:

```text
make taxonomy-check
make openapi-check
make migrations-check
npm run test:unit --workspace=backend -- tests/unit/delivery-marketplace.test.ts
npm run test:rls --workspace=backend
npm run test --workspace=frontend -- src/api/adapters/demo/demo-delivery.service.test.ts
npm run test --workspace=mobile -- tests/delivery.service.test.ts
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 npm run test:e2e --workspace=frontend -- e2e/delivery.spec.ts --project=chromium
make cross-platform-check
make test-critical
make check
```

Generating database types additionally requires the repository's validated
local database configuration. No local check authorizes applying the migration
to a hosted project or enabling the production flag.
