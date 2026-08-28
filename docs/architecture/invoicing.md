# Shongre Facturation architecture

Status: Phase 1 vertical slice implemented; external go-live gates unresolved  
Last reviewed: 2026-08-28  
Regulatory transport mode: `COMPATIBLE_SOLUTION`  
Production status: `IMPLEMENTED_BUT_NOT_GO_LIVE_APPROVED`

This is the canonical architecture decision record for Shongre Facturation. It
describes repository truth and deliberately separates implemented behavior from
legal, provider, operational, and release evidence that source code cannot
manufacture.

## Product boundary and customer types

Shongre Facturation is a separately activatable Shongre product, not a separate
application stack. Its stable product identity is `shongre.facturation`; its
commercial access gate is `invoicing.enabled`. It reuses the same account,
organization, membership, team, market configuration, monetization, audit,
OpenAPI, database, release images, and Cloudflare Tunnel topology as every
other Shongre product.

The boundary supports two acquisition modes:

| Customer type             | Account and organization                                                   | Product portfolio                              | Facturation entry                                                             |
| ------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------- |
| Facturation-only          | Created through the shared professional registration and organization path | `facturation` only                             | Direct registration → entitlement → Facturation onboarding                    |
| Existing Shongre customer | Existing identity, organization, team, and business facts are reused       | Facturation is added to the existing portfolio | Shared product catalog/add-on purchase → entitlement → Facturation onboarding |

An organization may hold Marketplace, Prospects, and Facturation together in
any combination. Product activation never copies the user or organization and
never creates a second authentication identity. A Facturation-only session is
given a product-isolated header, footer, onboarding, workspace, team view,
settings, and subscription view; Marketplace and Prospects navigation is not
rendered. Shared legal, privacy, cookie, help, account-security, organization,
and team services remain available where relevant.

Facturation does not import Prospects internals and Prospects does not write
Facturation records. Cross-product producers use shared contracts or
idempotent commands/events. Invoice journeys accept organization-owned parties
and manually entered invoice lines and therefore do not require listings,
marketplace orders, CRM companies, or Prospects leads.

## Product portfolio and entitlement model

The shared `OrganizationProductPortfolio` contract is the public boundary for
product access. The current Facturation projection uses these entitlement keys:

| Key                    | Type                                                     | Meaning                                                              |
| ---------------------- | -------------------------------------------------------- | -------------------------------------------------------------------- |
| `invoicing.enabled`    | boolean                                                  | Mandatory commercial gate for every Facturation tenant read or write |
| `invoicing.accessMode` | `STANDALONE`, `ADD_ON`, `BUNDLED`, or `INTERNAL_SHONGRE` | Acquisition and packaging mode                                       |
| `invoicing.planName`   | string                                                   | Approved catalog label shown to the organization                     |
| `invoicing.seats`      | positive integer                                         | Product seat allowance used by team administration                   |

Functional capabilities such as `invoice.read`, `invoice.create`,
`invoice.finalize`, `invoice.party.manage`, and `invoicing.tenant.manage` remain
separate from the commercial gate. Backend access requires both an active
organization membership/capability and a currently active
`invoicing.enabled=true` entitlement. RLS calls the same entitlement predicate;
hiding a menu is never the security boundary.

As in Shongre Prospects, billing still records the paying account, but product
access is explicitly scoped to `organization_id`. The payer is an audit and
commercial subject, never an authorization shortcut. Quote, order,
subscription, and entitlement records carry the target organization through the
shared monetization flow; only an owner, administrator, or member with
`subscription.manage.own` may purchase for it. Ambiguous legacy rows are not
guessed: only a payer with exactly one active organization is backfilled, while
multi-organization cases fail closed for operator-reviewed assignment.

Statuses `trialing` and `active` are usable. Expired, cancelled, paused, or
missing access fails closed. Revocation immediately removes the tenant from the
workspace projection and makes direct backend/RLS access fail.

## Independent purchase and activation

New Facturation customers enter
`/inscription/professionnel?product=facturation&redirect=/facturation/onboarding`.
The product intent attributes acquisition but does not grant production access.
The registration API preserves the submitted legal name, address, country,
legal form, VAT number, and country-specific business identifier in the shared
organization boundary. Migration `00070` provisions the owner membership and
market atomically and idempotently, but deliberately creates no product grant.
After entitlement activation, onboarding bootstraps the first invoicing legal
entity from those shared facts rather than asking the customer to enter them a
second time. The shared account and organization are created once; the existing monetization
quote/checkout/subscription flow must then publish an active
`invoicing.enabled` grant. Existing customers use `/facturation/activation`,
which preserves their identity and organization and completes provisioning only
after the same grant exists. `/api/v1/invoicing/activation` deliberately cannot
mint an entitlement.

In deterministic demo mode, the adapter provisions a clearly labelled trial so
both acquisition paths are testable with the backend stopped. In API mode the
backend rejects activation without a pre-existing grant. Because
`COMMERCIAL_PLAN_APPROVAL_OWNER=UNSET`, migration `00069` registers the product
identity but no production price, quota, or plan version. The product catalog
must remain unavailable for purchase until an approved commercial version is
published through the existing monetization workflow.

The complete product-specific path is:

```text
shared registration or existing login
  -> existing organization or idempotent shared organization creation
  -> approved Facturation quote/checkout (production) or demo trial
  -> active invoicing.enabled entitlement
  -> Facturation onboarding and legal-entity bootstrap from organization facts
  -> customers -> draft -> edit -> view -> finalize -> export/delivery
  -> payment tracking, team permissions, settings, subscription management
```

Export currently means the authenticated human-readable derivative; electronic
delivery remains fail-closed until the provider and legal gates below are
resolved.

## External-input register

| Input                             | Resolved value | Consequence                                                                       |
| --------------------------------- | -------------- | --------------------------------------------------------------------------------- |
| Approved platform                 | `UNSET`        | Real electronic transmission remains disabled.                                    |
| Sandbox credential reference      | `UNSET`        | No provider sandbox certification can be claimed.                                 |
| Production credential reference   | `UNSET`        | Production provider calls remain disabled.                                        |
| Shongre issuer legal entity       | `UNSET`        | Shongre cannot issue production legal documents from this implementation.         |
| Issuer bank/payment configuration | `UNSET`        | Production payment instructions remain unavailable.                               |
| Legal/accounting review owner     | `UNSET`        | Legal template, numbering, tax, and retention approval is outstanding.            |
| Data-protection review owner      | `UNSET`        | Retention, deletion, subprocessor, and support-access approval is outstanding.    |
| Commercial-plan approval owner    | `UNSET`        | Invoice SaaS prices and quotas must not be published.                             |
| Live frontend cutover             | `false`        | Web remains demo-first and does not contact the backend in normal execution.      |
| Production deployment             | `false`        | No deploy, DNS, tunnel, credential, or production migration action is authorized. |

## Reuse and dependency map

```text
Web (demo by default)
  -> InvoicingServiceContract
       -> deterministic DemoInvoicingService
       -> future HttpInvoicingService (explicit API mode only)

Canonical OpenAPI /api/v1
  -> authenticated capability and market boundary
  -> invoicing application service
       -> organization membership and tenant resolution
       -> exact money/tax calculator
       -> invoicing repository
            -> PostgreSQL legal entities, parties, invoices and immutable snapshots
            -> concurrency-safe finalization function
            -> append-only outbox and audit

Adjacent domains
  monetization -> requests a Shongre billing invoice through an anti-corruption event (future cutover)
  finance      <- receives posted/reconciled facts, never rewrites an invoice
  payments     -> allocations reference immutable invoices (Phase 2)
  providers    -> electronic-invoice capabilities extend the shared Provider Platform (Phase 4)
  storage      <- owns large/private originals when the validated document pipeline is introduced
```

Reused assets are the existing profile/session identity, organizations and
memberships, country-aware organization business identifiers, capabilities,
country registry and request market resolver,
monetization catalog/entitlements, finance ledger, Provider Platform, private
storage boundary, scheduled worker, notification outbox, audit conventions,
OpenAPI generation, shared contracts, frontend service registry, demo adapters,
and Shongre design system.

## Required portfolio validation matrix

| Configuration                                | Facturation access     | Prospects access        | Expected behavior                                                          |
| -------------------------------------------- | ---------------------- | ----------------------- | -------------------------------------------------------------------------- |
| New Facturation-only customer                | Yes after grant        | No                      | Product-only onboarding and workspace; no Marketplace/Prospects navigation |
| Existing Shongre customer adding Facturation | Yes after add-on grant | Preserve existing value | Same account, organization, business profile, and team                     |
| Prospects-only organization                  | No                     | Yes                     | Facturation route and backend reject access                                |
| Facturation + Prospects organization         | Yes                    | Yes                     | Both isolated workspaces are selectable, with shared organization facts    |
| Full Shongre customer                        | Yes                    | Yes                     | Marketplace and both products remain available without duplicate accounts  |
| User without Facturation entitlement         | No                     | Irrelevant              | Frontend guard denies the workspace; API and RLS fail closed               |

The contract suite evaluates all six portfolios. Frontend route-policy tests
verify product-plus-capability gating, while
`frontend/e2e/facturation.spec.ts` exercises footer discovery, direct
Facturation-only onboarding and invoicing, existing-account add-on activation,
Prospects-only denial, multi-product access, and accessibility in the rendered
application. The demo adapter also has an account/organization switch test that
proves legal entities, parties, invoices, documents, counters, and idempotency
records do not cross tenants. Backend service tests remove the product grant
while retaining invoice permissions and assert `FORBIDDEN` with the
`INVOICING_ENTITLEMENT_REQUIRED` gate. Migration tests verify that RLS includes
the active organization product predicate. Migration
`00071_organization_product_entitlements.sql` makes this scope explicit on the
shared monetization quote, order, subscription, and entitlement records without
duplicating accounts, organizations, or billing infrastructure.

The existing `monetization_invoices` and HTML document endpoint remain the
current Shongre subscription-billing compatibility path. They are not redefined
as tenant-authored legal invoices and are not the canonical writer for the new
bounded context.

## Scope classification and tenancy

| Domain family                    | Scope                 | Isolation rule                                                                                             |
| -------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------- |
| User identity                    | `PLATFORM_GLOBAL`     | Existing authenticated profile; never invoice tenancy.                                                     |
| Organization/tenant              | `MULTI_MARKET_SHARED` | Stored once; access requires an active membership.                                                         |
| Legal entity and establishments  | `MULTI_MARKET_SHARED` | Country-aware identifiers and explicit market availability; no French identifier is globally mandatory.    |
| Parties/customers/suppliers      | `MULTI_MARKET_SHARED` | Tenant-owned master data with typed identifiers and immutable document snapshots.                          |
| Invoice/credit note              | `MARKET_SCOPED`       | Exactly one tenant, issuer legal entity, market, country, currency, timezone, and environment.             |
| Number series                    | `MARKET_SCOPED`       | Legal entity, jurisdiction, document type, fiscal period, market, and environment form the sequence scope. |
| Document artifact                | `MARKET_SCOPED`       | Private, immutable, tenant/legal-entity/market/environment-scoped provenance.                              |
| Outbox/audit                     | `MARKET_SCOPED`       | Carries tenant, legal entity, market, country, environment, correlation, and actor explicitly.             |
| Electronic transport/e-reporting | `MARKET_SCOPED`       | Capability-, provider-, country-, environment-, and release-gated; currently disabled.                     |

An organization may contain several legal entities. A legal invoice has exactly
one issuer legal entity. A user may belong to several organizations; every
command names a tenant or resource and backend membership checks return a
privacy-safe `404` on scope mismatch. Background work never infers France or an
ambient tenant.

## One-writer ownership

| Record                                                              | Canonical writer                                                                |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Tenant membership                                                   | Existing organization/access domain                                             |
| Legal entity, establishment, tax registration, legal identifier     | Invoicing tenancy/legal-entity application service                              |
| Party master and typed identifiers                                  | Invoicing party application service                                             |
| Draft invoice and draft lines                                       | Invoicing invoice application service                                           |
| Final number, immutable snapshot, final totals, finalization outbox | One PostgreSQL finalization transaction                                         |
| Credit note and relationship to original                            | Invoicing credit-note command plus the same PostgreSQL finalization transaction |
| Payment                                                             | Existing payments domain                                                        |
| Payment allocation                                                  | Invoicing/payment reconciliation boundary (Phase 2)                             |
| Accounting entry                                                    | Existing finance ledger                                                         |
| Electronic submission/status                                        | Invoicing transport service through Provider Platform (Phase 4)                 |
| Existing subscription billing documents                             | Monetization compatibility writer until the verified cutover                    |

Marketplace, subscription, promotion, commission, and refund flows may request a
document with an idempotent command/event. They never insert or mutate invoicing
tables directly. Merchant/seller-of-record mapping must be approved for each flow
before enabling its producer.

## State machines

Commercial/legal document state:

```text
DRAFT -> VALIDATION_REQUIRED -> READY_TO_FINALIZE -> FINALIZED
                                             \-> FINALIZATION_FAILED
FINALIZED -> CREDITED (only through a first-class credit note relationship)
```

There is no delete, number reuse, or mutable finalized state. Corrections create
another related legal document.

Electronic lifecycle (disabled until conformance and provider evidence exist):

```text
NOT_APPLICABLE | NOT_REQUESTED
  -> VALIDATION_PENDING -> VALIDATION_FAILED | READY_TO_SUBMIT
  -> SUBMISSION_PENDING -> SUBMITTED_UNCONFIRMED
  -> ACCEPTED | REJECTED | REFUSED | MANUAL_RECONCILIATION
```

Payment/allocation state remains separate:

```text
UNPAID -> PARTIALLY_PAID -> PAID
                  \-> OVERPAID
PAID/PARTIALLY_PAID -> PARTIALLY_REFUNDED -> REFUNDED
```

E-reporting uses independent transaction records, batches, submissions,
acknowledgements, corrections, and deadlines. It is never derived from one
invoice status boolean.

## Exact money, tax, and numbering

Public totals use integer minor units plus ISO currency. Quantities and unit
prices that require sub-minor precision use validated decimal strings and are
converted to scaled integers/`bigint` for calculation. The Phase 1 policy rounds
the net amount and tax of each line with explicit half-up rounding, then sums
the immutable line results. Floating-point arithmetic is not authoritative.

Unknown currency, tax treatment, recipient facts, jurisdiction, or market
availability blocks finalization. No path defaults to France or 20% VAT.

Finalization locks the invoice and its number-series row in a short PostgreSQL
transaction. It validates optimistic version, membership, totals, currency,
market/environment scope, and finalized-line presence; assigns the next number;
stores the immutable snapshots and digest; records an immutable human-readable
derivative manifest; and appends outbox/audit events. No remote provider call is
made while locks are held. A committed number is never edited, reused, deleted,
or hidden.

Sandbox/test sequences are isolated by environment and cannot become production
documents by flipping a flag.

## Legacy compatibility strategy

1. Inventory all `monetization_invoices`, lines, Stripe IDs, readers, writers,
   totals, currencies, and historical HTML derivatives.
2. Preserve those records and their current endpoint during Phase 1.
3. Introduce explicit links from a legacy billing record to a canonical
   invoicing document only after issuer/customer/tax snapshots are deterministically
   available.
4. Add an idempotent anti-corruption consumer for subscription, promotion,
   commission, adjustment, refund, and credit-note requests.
5. Backfill links with provenance; reconcile counts, totals, currency, provider
   references, and access.
6. Stop legacy writes only after every producer is migrated and the compatibility
   projection is verified.
7. Remove the old generator only after retained historical derivatives remain
   accessible and all callers are proven migrated.

Renaming the existing HTML response to PDF or treating a Stripe invoice ID as a
Shongre legal number is explicitly forbidden.

## OpenAPI, events, formats, and provider seams

All HTTP operations are additive `/api/v1/invoicing/...` resources defined first
in `backend/openapi/openapi.json`. Identity comes from the principal; operations
declare market context, capabilities, idempotency, standard errors, and bounded
pagination.

Initial domain events are `InvoiceDraftCreated`, `CreditNoteDraftCreated`,
`InvoiceFinalized`, and `CreditNoteFinalized`. Future events include
`ElectronicInvoiceSubmissionRequested`, `ElectronicInvoiceStatusRecorded`, `PaymentRecorded`, and
`EReportingSubmissionRequested`. Events carry tenant, legal entity, market,
country, currency, environment, schema version, event ID, and correlation ID.

No structured electronic format is currently marked `SUPPORTED`. Target formats
are only those proven by pinned official fixtures and validators. Factur-X is
not supported until PDF/A-3 structure and embedded XML/profile validation pass;
UBL or CII are not supported until current XSD, Schematron, semantic, and invalid
fixture suites pass.

The shared Provider Platform will eventually add explicit capabilities for
validation, submission, receipt, status, e-reporting, payment reporting, and
directory resolution. `TARGET_APPROVED_PLATFORM=UNSET`, so the real gateway is
fail-closed and the product must display `CONFIGURATION_REQUIRED` or
`SANDBOX_ONLY`, never a successful legal transmission.

## France source/version register

Retrieved on 2026-08-28 from official sources:

| Source                                                                                                                                  | Version/effective evidence                      | Recorded result                                                                                                                                                                                               |
| --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [DGFiP external specifications](https://www.impots.gouv.fr/specifications-externes-b2b)                                                 | v3.2 dated 2026-04-30; page modified 2026-07-02 | Current page links specifications, annexes, examples, XSD, and Swagger plus AFNOR XP Z12-012/013/014. Download SHA-256: `cd8f6e817e37f329e6f62a35aa131b78a51379bec953445b774fa8adbaaa3862` (6,766,301 bytes). |
| [French reform calendar and obligations](https://www.economie.gouv.fr/tout-savoir-sur-la-facturation-electronique-pour-les-entreprises) | Retrieved 2026-08-28                            | Receipt for all affected businesses and emission/e-reporting for large companies/ETIs from 2026-09-01; SME/micro emission/e-reporting from 2027-09-01; four reform-related invoice mentions listed.           |
| [Approved-platform list](https://www.impots.gouv.fr/je-consulte-la-liste-des-plateformes-agreees)                                       | Page modified 2026-08-19                        | The State publishes separate definitive and pending lists. No Shongre target is selected from either list.                                                                                                    |
| [Decree 2026-677](https://www.legifrance.gouv.fr/loda/id/JORFTEXT000054499487/)                                                         | In force since 2026-07-29                       | Current regulatory change is recorded for legal review; source code does not interpret it without mapped reviewed rules.                                                                                      |

This register is implementation evidence, not legal advice. Before any France
compliance release, pin the permitted official artifacts in a reviewed location,
record each checksum/version/effective date, map every coded rule to a test, and
obtain the named legal/accounting owner’s approval.

## Security, privacy, retention, and support access

- Deny-by-default RLS mirrors backend tenant/legal-entity authorization.
- Object IDs outside the caller’s tenants resolve as `404`.
- Finalized snapshots, documents, audit, and status events are append-only.
- Private downloads are authenticated, scoped, short-lived where storage URLs
  are used, and audited without putting signed URLs or invoice contents in logs.
- Provider secrets remain opaque/encrypted inside the shared Provider Platform.
- Logs contain IDs, safe categories, market/environment, and correlation only.
- Support sees metadata only by default. Break-glass content access requires a
  reason, narrow capability, expiry, policy allowance, and append-only audit.
- Retention is jurisdiction- and policy-versioned. The commonly cited French
  ten-year accounting retention period is not encoded until counsel confirms
  scope and the start event. Account deletion restricts access and respects
  legal holds; it never blindly deletes legal records.

## Rollout, observability, rollback, and go-live gates

Capabilities are feature-flagged by environment, market, tenant, legal entity,
and country. Initial metrics cover drafts/finalizations, validation failures,
numbering conflicts, outbox backlog, document generation failures, and request
latency without invoice contents or personal data.

Database changes are expand-first. Application rollback returns to earlier
immutable image digests and disables flags; it never reverses a legal-data
migration or removes assigned numbers. Migrations run once from the exact
backend digest before rollout. Production may consume only frontend/backend
digests certified in staging through the root release manifest and persistent
remote-managed Cloudflare Tunnel topology.

Production remains blocked until all applicable provider, legal/accounting,
issuer, bank/payment, privacy/retention, commercial, security, accessibility,
performance, backup/restore, observability, support, staging, live-frontend, and
deployment gates in the implementation mandate have named owners and evidence.
