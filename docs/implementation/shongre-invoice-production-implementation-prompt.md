# Shongre Invoice / Shongre Facturation — production implementation prompt

> Revised for the actual Shongre repository architecture on 28 August 2026.
> This prompt is intended to be given to a coding agent working inside the
> Shongre repository. It is an implementation mandate, not evidence that legal,
> provider, security, or production-release gates have already passed.

## Execution inputs

Before starting, read the repository and resolve these values from existing
configuration or from the operator. Never invent them.

```text
TARGET_APPROVED_PLATFORM=UNSET
TARGET_APPROVED_PLATFORM_SANDBOX_CREDENTIAL_REFERENCE=UNSET
TARGET_APPROVED_PLATFORM_PRODUCTION_CREDENTIAL_REFERENCE=UNSET
SHONGRE_ISSUER_LEGAL_ENTITY=UNSET
SHONGRE_ISSUER_BANK_AND_PAYMENT_CONFIGURATION_REFERENCE=UNSET
LEGAL_AND_ACCOUNTING_REVIEW_OWNER=UNSET
DATA_PROTECTION_REVIEW_OWNER=UNSET
COMMERCIAL_PLAN_APPROVAL_OWNER=UNSET
LIVE_FRONTEND_CUTOVER_AUTHORIZED=false
PRODUCTION_DEPLOYMENT_AUTHORIZED=false
```

`UNSET` is a valid discovery result but not a valid production-go-live result.
Implement fail-closed boundaries and sandbox/demo paths when an external input
is missing. Report the exact gate; never fabricate credentials, approvals,
provider behavior, legal identities, or production success.

These inputs contain identifiers or opaque secret-manager references only. Never
paste a raw credential, token, private key, bank secret, or password into this
prompt, source control, a planning document, logs, or tool output.

## 1. Role and mission

Act as a senior SaaS product architect, French electronic-invoicing specialist,
TypeScript modular-monolith architect, PostgreSQL/Supabase architect, OpenAPI
architect, security engineer, payment architect, DevOps engineer, accessibility
specialist, and product designer.

Analyze the complete existing Shongre codebase, then incrementally design,
implement, integrate, test, document, and harden a commercially sellable product
named **Shongre Invoice / Shongre Facturation**.

The product must support the same canonical invoicing engine in four modes:

1. Shongre issuing its own subscription, promotion, commission, fee, service,
   adjustment, refund, and credit-note documents;
2. existing Shongre professionals activating invoicing with their current
   identity and eligible organization;
3. independent external companies subscribing to Shongre Invoice without using
   the marketplace; and
4. entitled external software consuming the same domain through the canonical
   API and outbound webhooks.

Do not build four invoice engines. Do not rewrite Shongre. Deliver working,
tested vertical slices and preserve every repository invariant.

## 2. Instruction precedence and truthfulness

1. Read the complete root `AGENTS.md` before changing the repository. Its rules
   override architectural suggestions in this prompt.
2. Inspect current source, migrations, tests, contracts, and documentation before
   creating new abstractions.
3. Repository evidence overrides this prompt when implementation details have
   evolved. Record every material difference and adapt without weakening the
   product or compliance objective.
4. Official current law, specifications, standards, and the selected provider's
   current contract override regulatory examples in this prompt.
5. Do not call a capability complete because a schema, interface, button, page,
   mock response, or happy-path test exists.
6. Never claim that Shongre is a **plateforme agréée** unless current official
   authorization has been independently confirmed. The default transport mode
   is `COMPATIBLE_SOLUTION` and cannot be changed by an ordinary admin toggle.
7. Never show or report a successful legal transmission unless the selected
   provider has actually acknowledged the relevant operation according to its
   API semantics.
8. Do not deploy, publish, buy a service, sign a provider agreement, change DNS,
   or activate production credentials without explicit operator authorization.

## 3. Verified repository baseline that must be preserved

Do not introduce NestJS, Prisma, a second backend, a microservice fleet, a second
OpenAPI document, a second provider platform, or a second design system.

The repository currently uses:

- an npm workspace monorepo with `frontend/`, `backend/`, `mobile/`, and shared
  `packages/*`;
- a Next.js 16 and React 19 Web shell whose product routes largely use the
  existing React Router application architecture;
- TypeScript and Tailwind CSS with shared Shongre tokens and UI packages;
- frontend service contracts with deterministic asynchronous demo adapters and
  future HTTP adapters;
- a Node/TypeScript modular-monolith backend under `backend/`;
- PostgreSQL/Supabase as persistence, Auth, Storage, RLS, and infrastructure;
- ordered SQL migrations only under `backend/supabase/migrations/`;
- Zod-backed shared contracts under `packages/contracts/`;
- `backend/openapi/openapi.json` as the only authoritative OpenAPI 3.1 contract;
- generated OpenAPI artifacts in `packages/contracts/src/generated/` and
  `backend/src/generated/`;
- the canonical `/api/v1` business API;
- existing authentication, capabilities, organizations, finance, monetization,
  payments, storage, notifications, analytics, workers, audit, observability,
  and shared Provider Platform boundaries;
- one six-environment model selected by `APP_ENV`; and
- immutable image promotion and the root `compose.yaml`/Cloudflare Tunnel
  release architecture.

The existing `monetization_invoices`, invoice lines, billing customers, payments,
refunds, subscriptions, usage records, finance ledger, Stripe lifecycle, and HTML
invoice document endpoint are a **partial Shongre-billing implementation**. They
are not yet the complete multi-tenant legal invoicing SaaS, an electronic
invoicing engine, or a standards-valid archival system.

Treat those assets as migration and reuse inputs. Do not silently reinterpret an
account-scoped Stripe document as a legally finalized customer invoice.

The existing `organizations` model is France-oriented. Reuse it as appropriate,
but do not force every legal entity worldwide into SIREN/SIRET fields. Introduce
backward-compatible legal-entity and typed-identifier modeling rather than a
destructive organization rewrite.

The shared Provider Platform already owns connection records, encrypted or
opaque credentials, tenant policy, capability routing, usage evidence, health,
and audit. Extend it with explicit electronic-invoicing/e-reporting capabilities
instead of hiding permanent invoicing integrations in `OTHER` or creating a
second credential vault.

## 4. Mandatory discovery and architecture decision record

Begin with a focused discovery, but do not stop at an audit when safe
implementation work can continue.

Inspect at minimum:

- root `AGENTS.md`, `README.md`, `Makefile`, workspace manifests, CI, Compose,
  environment contracts, release manifests, and operations runbooks;
- `backend/openapi/openapi.json`, the generated contract workflow, and router;
- authentication, organization/membership, capabilities, RLS, and support-access
  architecture;
- monetization, payments, commissions, subscriptions, entitlements, usage,
  refunds, finance ledger, existing invoice generation, Stripe webhooks, and
  reconciliation;
- Provider Platform catalog, connections, credential vault, gateways, webhooks,
  provider execution safety, and health controls;
- storage, uploads, signed access, retention, queue/worker, notification/email,
  outbox/event, audit, logs, tracing, analytics, and feature flags;
- frontend service registry, demo store, demo personas/scenarios, HTTP adapters,
  routing, layouts, design system, i18n, consent, accessibility, and E2E tests;
  and
- all existing invoice, receipt, quote, customer, supplier, legal-entity,
  accounting-export, and billing-related schemas or UI.

Create or update one canonical architecture document containing:

1. the reuse/dependency map;
2. one-writer ownership for every financial/legal record;
3. the bounded-context diagram;
4. tenancy and legal-entity isolation;
5. the legacy monetization-invoice migration/compatibility strategy;
6. the invoice, payment, electronic-transport, and e-reporting state machines;
7. the OpenAPI and event seams;
8. the selected document formats and pinned specification versions;
9. the chosen provider and capability matrix, if available;
10. security, privacy, retention, backup, and support-access boundaries;
11. rollout, feature flags, observability, rollback, and external go-live gates;
    and
12. explicit scope classification as `PLATFORM_GLOBAL`, `MARKET_SCOPED`, or
    `MULTI_MARKET_SHARED` for every new domain family.

Do not create a pile of temporary audits. Keep one maintained architecture
document and one final implementation report.

## 5. Product boundary and deliberate non-goals

Shongre Invoice is an invoicing and electronic-exchange SaaS. It is not
automatically a full ERP, bank, payment institution, certified cash-register
system, tax-advice service, payroll product, inventory system, general ledger,
or VAT-return filing product.

Do not claim FEC/accounting-software compliance merely because CSV or journal
exports exist. Implement FEC only if the legal scope, ledger completeness, field
mapping, validation, and review have been explicitly approved. Otherwise expose
accurate generic exports and integration contracts.

Do not perform currency conversion or FX accounting unless a separately approved
exchange-rate source, valuation policy, rounding policy, and accounting treatment
exist. An invoice has one immutable currency.

Do not make OCR or AI extraction authoritative. If added later, extracted data is
a suggestion requiring validation and provenance.

Web is the first product surface. Preserve mobile build and shared-contract
compatibility, but do not duplicate the complete workspace into the mobile app
unless explicitly requested.

## 6. Shared domain architecture

Create a dedicated backend bounded context under `backend/src/modules/`, for
example `invoicing`, with domain/application services owning business rules and
controllers/router handlers performing transport orchestration only.

Use internal areas such as:

```text
tenancy-and-access
legal-entities-and-establishments
parties-customers-and-suppliers
catalog
quotes
invoices-and-credit-notes
numbering
money-tax-and-rounding
compliance-and-classification
documents-and-archive
electronic-invoicing
e-reporting
provider-transport
payments-and-allocation
recurring-invoicing-and-dunning
imports-and-exports
api-and-webhooks
audit-and-reporting
```

Keep a modular monolith. Use explicit internal interfaces and domain events, not
cross-module table inserts. Marketplace, subscriptions, commissions, CRM,
payments, and Shongre internal billing integrate through an anti-corruption
layer and idempotent commands/events.

Examples:

```text
SubscriptionInvoiceRequested
PromotionPurchaseCompleted
CommissionAccrued
RefundCompleted
InvoiceFinalized
ElectronicInvoiceSubmissionRequested
PaymentRecorded
```

An event may request an invoice; it must not directly create or mutate legal
invoice rows.

For every Shongre-integrated commercial flow, explicitly map supplier, customer,
legal issuer, payment collector, commission beneficiary, tax responsibility, and
merchant/seller-of-record. Payment passing through Shongre does not make Shongre
the seller. Where appropriate, `Seller -> Buyer` and `Shongre -> Seller` are two
different legal documents generated from separate obligations.

## 7. Tenancy, identity, organizations, and legal entities

Reuse Shongre identity and authorization. An existing user must not create a
second login to activate Invoice, and an external Invoice-only customer must not
be forced to create marketplace seller data.

Use an organization/tenant boundary, never `userId`, as the business-isolation
boundary. A user may have memberships in several organizations. An accounting
firm may receive explicit delegated access to several client organizations
without merging their data.

Model separately:

```text
Tenant/organization
LegalEntity
Establishment
TaxRegistration
LegalIdentifier
Membership/delegated access
```

An organization may own multiple legal entities, and a legal entity may own
multiple establishments. A legal invoice belongs to exactly one issuer legal
entity and records the relevant issuer establishment.

`LegalIdentifier` must be typed and country-aware:

```text
type
countryCode
value
issuingAuthority
verificationStatus
verifiedAt
verificationSource
```

France adapters may validate SIREN, SIRET, French VAT, RNE/RCS, and legal form.
Do not make those identifiers globally mandatory.

Every API query, database operation, uniqueness constraint, RLS policy, cache,
storage path, signed URL, search index, export, webhook, event, queue job,
idempotency key, metric, and audit record must preserve the correct tenant,
legal-entity, market, and environment scope.

Cross-tenant identifiers must return a privacy-safe `404` where appropriate.
Add independent RLS tests and backend authorization tests for ID guessing,
filters, exports, downloads, background jobs, webhooks, support access, and
delegated accountant access.

## 8. Parties, customers, suppliers, and immutable snapshots

Implement one reusable legal-party model for companies, associations, sole
proprietors, microenterprises, public bodies, individuals, and foreign entities.

Support:

- legal and trading names;
- typed identifiers and tax registrations;
- billing, delivery, and registered addresses;
- contacts and communication preferences;
- locale, currency, payment terms, purchase-order requirements, references, and
  electronic-routing identifiers;
- notes, tags, import/export, search, and duplicate suggestions; and
- customer/supplier roles without duplicating the underlying legal party.

Duplicate detection must suggest; it must not automatically merge legal records.

Party masters are mutable. Finalized quotes/invoices/credit notes store immutable
issuer, recipient, address, identifier, bank/payment instruction, tax, terms,
branding, and legal-mention snapshots. Editing a customer tomorrow must never
rewrite yesterday's legal document.

## 9. Catalog and quotes

Implement an optional product/service catalog with SKU, localized name and
description, unit, exact unit price, currency, tax rule, accounting mapping,
category, and active period. Allow ad-hoc lines.

Implement quotes/devis with draft, version, preview, send, secure customer view,
acceptance, rejection, expiration, revisions, deposit request, attachments,
conversion, and audit evidence.

Acceptance evidence records the exact quote version, actor or secure-token
context, timestamp, and terms. A quote conversion copies a commercial snapshot;
it does not share mutable line objects with the invoice.

## 10. Exact money, tax, discount, and rounding primitives

Never use JavaScript floating-point arithmetic for authoritative calculations.

Persist authoritative monetary totals as integer minor units plus ISO currency,
consistent with Shongre. Persist quantities, percentages, unit prices requiring
sub-minor precision, and intermediate tax bases as validated decimal strings or
an exact decimal/rational representation. Rates may use integer basis points when
that representation is exact.

Define, version, and test:

- line and document rounding policies;
- quantity × unit-price calculations;
- percentage and fixed discounts;
- multiple VAT rates;
- exemptions and exemption reasons;
- reverse charge;
- VAT on debits versus receipts where relevant;
- deposits and final-invoice reconciliation;
- credit-note signs and allocations;
- partial and overpayments; and
- zero-decimal and non-two-decimal currencies supported by enabled markets.

The sum of line/tax breakdowns must reconcile exactly to immutable document
totals. Do not silently add a rounding line unless the configured jurisdiction
and format allow it and the adjustment is explicit.

Unknown place-of-supply, VAT, exemption, customer-status, or tax facts produce a
typed validation/manual-review state. They never fall back to France or 20% VAT.

## 11. Invoice and credit-note core

Support at minimum:

```text
standard invoice
deposit invoice
final invoice
recurring-generated invoice
credit note / avoir
corrective/replacement relationship
supplier invoice received from an external source
```

Gate self-billing and other specialized cases behind verified jurisdiction
rules. Do not expose an unsupported document type.

An invoice contains immutable snapshots and explicit fields for issuer,
recipient, establishments, identifiers, dates/service period, currency,
purchase-order/customer references, payment terms, due date, lines, units,
prices, discounts, taxes, exemptions, reverse charge, totals, legal mentions,
payment instructions, notes, attachments, document origin, and related documents.

Document origin is explicit operational metadata such as `MANUAL`,
`SHONGRE_SUBSCRIPTION`, `MARKETPLACE_COMMISSION`, `API`, `RECURRING`, `IMPORT`, or
`EXTERNAL_INTEGRATION`. It must not be presented as a legal invoice field unless
the applicable rules require a related reference.

Keep separate state machines for:

1. commercial/legal document state;
2. electronic-validation/transmission lifecycle;
3. customer review/dispute state;
4. payment/allocation state; and
5. accounting export state.

Do not collapse them into one `status` or unrelated booleans.

Once finalized, a legal invoice is immutable. Corrections use a credit note,
corrective/replacement document, or a jurisdiction-approved cancellation flow.
Voiding or cancelling never deletes or reuses its number.

Credit notes are first-class documents with their own number, immutable snapshot,
tax breakdown, original-document reference, PDF/structured format, transmission,
payment/refund allocation, and audit trail.

## 12. Concurrency-safe legal numbering

Create a dedicated backend `InvoiceNumberingService`. Frontends, imports, payment
providers, and clients never assign a final legal number.

The sequence configuration is explicit and versioned by legal entity,
jurisdiction, document type, fiscal period, and an additional business unit only
where legally permitted.

Assign a number only inside the same database transaction that finalizes the
immutable invoice snapshot and outbox event. Use PostgreSQL locking, atomic
counters/sequences, and unique constraints. Test simultaneous finalization.

For applicable French rules, preserve a unique, chronological, continuous
sequence. Failed transactions must not consume a number where the database
mechanism can prevent it. A committed number is never edited, reused, or hidden.

Drafts use non-legal internal identifiers. Historical imports retain their source
numbers and an `IMPORTED_HISTORICAL` origin; they do not consume a Shongre legal
sequence unless a reviewed migration explicitly requires it.

## 13. Documents, originals, integrity, and retention

Build a document service behind the existing storage abstraction. Do not store
large binaries in PostgreSQL unless the existing architecture explicitly
requires it.

For every finalized/generated/received artifact preserve:

```text
immutable storage reference
media type and size
SHA-256 or stronger digest and algorithm
generator/parser version
template version
compliance ruleset and format/profile version
generation/receipt timestamp
source and actor
related canonical document ID
provider payload/original reference
environment and market/legal-entity scope
```

Store separately and immutably:

- canonical invoice snapshot;
- human-readable PDF;
- generated XML/structured original;
- hybrid Factur-X original where applicable;
- exact provider-submitted payload/document;
- exact provider-received original;
- acknowledgements, validation reports, status messages, and attachments.

Never silently regenerate and replace a legal original. A later rendering is a
new derivative with provenance.

Retention is policy- and jurisdiction-versioned. For France, accounting records
and supporting documents generally require ten-year retention, but confirm the
current legal basis and the event from which the period runs before coding the
policy. Account deletion triggers a retention-aware workflow, access restriction,
and eventual disposal after all legal holds expire; it never blindly deletes
legal documents.

Hashing alone is not a complete authenticity, integrity, readability, archival,
or evidentiary solution. Document those guarantees and any remaining qualified
archiving/signature requirement.

## 14. France compliance baseline and source control

France is the first compliance jurisdiction, not a global default. Implement a
versioned `ComplianceEngine` with country/jurisdiction adapters and effective
dates. Regulatory rules are reviewed source code/configuration, not arbitrary
business-admin settings.

At the beginning of each France compliance implementation or release:

1. re-check current official sources;
2. record retrieval date, URL, document/version, checksum where downloadable,
   effective dates, and implementation owner;
3. pin official XSD, Schematron, examples, and API artifacts permitted for use;
4. map every coded rule to a source/version and automated test; and
5. fail the release if a required current specification is unknown.

Verified baseline on 28 August 2026, to be revalidated at execution time:

- all affected companies must be able to receive electronic invoices from
  1 September 2026;
- large companies and ETIs begin applicable emission and e-reporting obligations
  on 1 September 2026;
- SMEs, TPEs, and microenterprises begin applicable emission and e-reporting
  obligations on 1 September 2027;
- exchange goes through a current State-approved **plateforme agréée**, directly
  or via a compatible solution;
- official external specifications v3.2 dated 30 April 2026 are published for
  the reform, while AFNOR XP Z12-012, XP Z12-013, and XP Z12-014 define the
  shared formats/profiles, APIs, and B2B use cases;
- structured formats include UBL, CII, and an applicable mixed structured/readable
  format such as Factur-X; and
- four reform-related invoice data points include the customer's SIREN where
  applicable, a distinct delivery address, operation nature/category, and the
  VAT-on-debits option where applicable.

Official starting points:

- `https://www.impots.gouv.fr/specifications-externes-b2b`
- `https://www.impots.gouv.fr/facturation-electronique-et-plateformes-agreees`
- `https://www.impots.gouv.fr/je-consulte-la-liste-des-plateformes-agreees`
- `https://www.impots.gouv.fr/professionnel/je-decouvre-la-facturation-electronique`
- `https://www.economie.gouv.fr/tout-savoir-sur-la-facturation-electronique-pour-les-entreprises`
- `https://www.economie.gouv.fr/entreprises/gerer-son-entreprise-au-quotidien/gerer-sa-comptabilite-et-ses-demarches/mentions-obligatoires-dune-facture-tout-savoir`
- current Code général des impôts, Livre des procédures fiscales, Code de
  commerce, BOFiP, and applicable decrees/orders on Légifrance.

The France adapter must determine obligations from explicit facts including
issuer/recipient establishment and VAT status, company size, customer type,
transaction type, place of supply, goods/services/mixed nature, tax treatment,
effective date, and any special public-sector case.

It must not implement `country === "FR" => e-invoice`.

### Country expansion and launch safety

Keep the legal invoice core multi-country while making tax, mandatory mentions,
numbering, electronic formats, reporting, archival rules, routing networks, and
provider availability explicit country/market capabilities. Future Belgium,
Switzerland, Senegal, Burkina Faso, or another country must fit behind versioned
country adapters and transport capabilities without forking the engine.

An unimplemented country can use generic non-regulated quote/invoice functionality
only when its legal requirements have been reviewed and configured. It must not
inherit French VAT, identifiers, wording, numbering, retention, or electronic
transport. Unknown, disabled, and `coming_soon` market states fail closed.

French invoice rendering/validation must also cover all current ordinary and
conditional legal mentions, including payment due terms, late-payment penalties,
the fixed recovery indemnity for professional customers where applicable,
exemption/reverse-charge wording, and sole-proprietor or other legal-form
requirements. Every mention is typed data/rule output, not free text scattered
through templates.

## 15. Transaction classification and regulatory workflows

Implement a versioned classifier producing explicit, tested outcomes such as:

```text
FR_B2B_EINVOICE
FR_B2C_EREPORTING
FR_INTERNATIONAL_EREPORTING
FR_B2G
OUT_OF_SCOPE
VOLUNTARY_EINVOICE
MANUAL_REVIEW
```

Classification output includes the facts used, ruleset version, explanation
codes, effective date, required fields, permitted formats, transport route,
reporting duties, deadlines, and any blocking uncertainty.

Keep B2B invoice transport, B2C/international transaction e-reporting, payment
e-reporting, and B2G/Chorus Pro routing as distinct workflows sharing the same
canonical invoice/party/tax facts.

Do not assume one e-reporting record per invoice. Model transaction records,
payment-reporting events, batches, corrections, submissions, acknowledgements,
deadlines, reconciliation, and idempotency explicitly.

B2G uses a dedicated capability/adapter and current Chorus Pro architecture. It
must not be silently routed through ordinary B2B transport.

## 16. Electronic document formats and validation

Create one provider-neutral canonical electronic-invoice model. Build serializers,
parsers, and validators for only the profiles proven by current official
specifications and conformance fixtures.

For supported profiles:

- generate valid structured content rather than inventing XML;
- generate a valid human-readable representation;
- for Factur-X, produce the required PDF/A-3 structure and correctly embedded
  XML/profile metadata;
- validate XSD, Schematron/business rules, semantic constraints, totals,
  identifiers, routing, and provider-specific requirements;
- preserve technical rule codes and map them to localized, actionable user
  messages; and
- record library, standard, profile, and validation artifact versions.

Do not mark Factur-X, UBL, or CII supported until valid and invalid official
fixtures pass conformance tests. Review library maintenance, licenses, security,
determinism, and SBOM impact before adoption.

Harden parsers against XXE, external entity/network access, entity expansion,
oversized documents, deeply nested payloads, ZIP bombs, malformed embedded files,
path traversal, and unsafe PDF content. Parsing untrusted received invoices must
never initiate arbitrary network or filesystem access.

The pre-transmission validation pipeline is:

1. canonical model and completeness;
2. exact money/tax reconciliation;
3. jurisdiction/compliance rules;
4. format schema;
5. Schematron/semantic rules;
6. recipient/directory resolution;
7. routing/capability policy;
8. provider-specific validation; and
9. final immutable artifact/digest verification.

## 17. Approved-platform provider integration

Extend the shared Provider Platform with explicit capabilities such as:

```text
invoicing.electronic.validate
invoicing.electronic.submit
invoicing.electronic.receive
invoicing.electronic.status
invoicing.ereporting.submit
invoicing.payment-reporting.submit
invoicing.directory.resolve
```

Define a provider-neutral gateway with capabilities equivalent to:

```text
getCapabilities
validateConfiguration
testConnection
resolveRecipient
validateInvoice
submitInvoice
fetchInvoice
getInvoiceStatus
submitEReporting
submitPaymentReporting
acknowledgeInvoice
refuseInvoice
healthCheck
parseAndVerifyWebhook
```

Provider-specific DTOs, authentication, status codes, retries, and credentials
stay inside backend adapters. Domain code must not contain
`if provider === "ProviderX"`.

Support both Shongre-managed and tenant-owned provider connections only when the
provider contract permits them. Reuse encrypted/opaque credential storage.
Secrets never enter public configuration, frontend bundles, database configuration
JSON, logs, audit metadata, errors, fixtures, image layers, or generated docs.

Before calling a provider, resolution must validate environment, tenant ownership,
legal entity, market/country, provider approval status, provider capability,
commercial entitlement, connection state, credential availability, format/profile,
currency, and release flag. No silent platform fallback may create an unexpected
cost or legal transmission.

A provider is `SUPPORTED` only when all of these pass:

- current official approved-platform status is verified;
- commercial/technical access is available;
- authentication and test connection work;
- sandbox submission and status/webhook flow work end to end;
- incoming invoices and originals can be retrieved where claimed;
- e-reporting/payment reporting work where claimed;
- signature verification, idempotency, timeout recovery, retries, and error
  mapping are tested;
- production credentials and routing are independently validated in staging;
- operational health, alerts, runbook, and support ownership exist; and
- provider contract/conformance certification requirements are satisfied.

Otherwise show `COMING_SOON`, `SANDBOX_ONLY`, `CONFIGURATION_REQUIRED`, or do not
show the provider. Saving an API key is not an integration.

Provider failover is capability- and policy-driven. Never resubmit automatically
through a second provider while the first provider's acceptance is ambiguous.
Reconcile the existing submission first so failover cannot duplicate a legal
invoice or e-reporting declaration.

### Sandbox and test isolation

Sandbox/test documents, credentials, providers, storage prefixes, sequences,
webhook events, usage, and accounting totals are explicitly isolated from
production. Sandbox data is visually identifiable, never receives a production
legal number, never reaches a production approved platform, never enters
production reporting/finance totals, and cannot be promoted into a production
original by changing a flag.

## 18. Submission, receipt, lifecycle, and idempotency

Use a transactional outbox pattern:

```text
finalization transaction
  -> immutable invoice + number + snapshots + outbox event commit
worker claims event
  -> reserves idempotent transmission
  -> calls provider
  -> stores exact response and lifecycle event
```

Never hold a database transaction open during a remote provider request.

Every command, worker, transmission, provider webhook, inbound document, status
event, e-reporting batch, payment report, and outbound webhook is idempotent.
Persist provider event IDs, request IDs, artifact digests, idempotency keys, claim
state, attempts, and final outcome. Handle the ambiguous case where a provider
accepted a request but Shongre timed out: reconcile before retrying.

Electronic lifecycle status is append-only and version-mapped. Keep:

```text
internal status
regulatory status and ruleset version
provider status and mapping version
provider event ID
occurred and received timestamps
actor/source
reason/explanation codes
raw-event immutable reference
```

Do not hardcode an incomplete status list from this prompt. Import the current
required/recommended statuses from the pinned specification and provider mapping.
Handle duplicates, out-of-order events, unknown future statuses, corrections, and
replay without losing history.

Implement an inbound supplier-invoice inbox. Verify the provider webhook, resolve
the exact tenant/legal entity, retrieve and validate the original, deduplicate by
provider IDs and digest, quarantine unknown/unsafe input, parse structured data,
store the original, and create a review item. Never infer a tenant from an
untrusted customer name or email.

Expose separate user-safe workflow labels and technical support detail. Raw
provider errors are never the only user explanation.

## 19. Payments and reconciliation

Reuse Shongre's payment/provider architecture. Do not process raw card data or
create an invoice-local PSP client.

Model `Payment` separately from `PaymentAllocation`. Support manual records,
provider payments, bank transfers, payment links, direct debit where an approved
provider supports it, partial payments, multiple allocations, overpayments,
refunds, and credit allocations.

Invoice totals never mutate because payment state changes. Derive outstanding
amount from immutable totals minus valid allocations/credits.

Payment links/customer portal operations use unguessable, expiring, revocable,
scoped tokens and provider-hosted payment collection where possible. Do not expose
banking credentials or raw PSP secrets.

Prepare optional reconciliation imports from bank/PSP/accounting records with
source provenance, idempotency, CSV-formula neutralization, duplicate detection,
and confidence-based suggestions. Human confirmation is required below a defined
threshold. Never invent or auto-post an uncertain transaction.

## 20. Recurring invoices, reminders, and delivery

Implement recurring templates, schedules, runs, and idempotent generation.
Support start/end, frequency, next run, timezone, proration only where explicitly
defined, tax/ruleset snapshot policy, draft versus automatic finalization,
transmission, payment, and notification policy.

Every run stores the intended period, ruleset/configuration version, job key,
result, and retry state. Two workers must not create two invoices for one period.

Implement configurable dunning with due-soon/due/overdue schedules, legal-entity
timezone, localized templates, opt-out rules appropriate to transactional
communications, and pause/cancellation state. Reuse the shared notification and
email-delivery platform.

Implement auditable invoice/quote delivery and a secure recipient portal:

- send and resend with exact document/version reference;
- delivery/bounce evidence from the shared provider;
- secure view/download;
- quote accept/reject;
- invoice payment link where enabled;
- revocation and access audit; and
- accessible FR/EN presentation.

Email delivery is not a substitute for legally required approved-platform
transmission.

## 21. SaaS subscriptions, entitlements, usage, and Shongre bundling

Reuse the centralized monetization catalog, quotes, Stripe checkout, subscriptions,
entitlements, usage, coupons/promotions, finance, and refunds. Do not hardcode
plan names, prices, quotas, or `if plan === ...` branches.

Model capabilities/limits such as:

```text
invoice workspace enabled
legal-entity count
seat count
finalized invoice count
electronic invoices sent/received
e-reporting submissions
storage
API access and rate quota
recurring invoices
supplier inbox
provider choice/BYOK
accountant delegated access
```

Meter only precisely defined, successful billable events. Retried/replayed events
do not consume usage twice. Keep subscription billing invoices distinct from the
customer invoices the subscriber creates.

Existing Shongre subscriptions may grant Invoice entitlements, and customers may
buy add-ons through the same engine. Never create a duplicate Stripe subscription
when an entitlement can represent the bundle.

Use central feature flags/capabilities scoped by environment, market, tenant, and
legal entity for staged rollout of electronic invoicing, each provider, incoming
invoices, e-reporting, B2G, recurring invoices, API access, and country support.
Do not gate releases with email-address checks or component-local booleans.

## 22. External API, service accounts, and webhooks

All HTTP changes start in `backend/openapi/openapi.json`. Use the existing
contract-first order:

1. edit the canonical OpenAPI components/operations;
2. declare unique operation IDs, security, `x-shongre-access`, permissions,
   standard errors, idempotency, and market context;
3. run the canonical generation workflow;
4. implement router and domain behavior;
5. implement client mappings/adapters;
6. add contract/integration/security tests; and
7. run `make openapi-check`.

Use additive `/api/v1/invoicing/...` resources. Do not create a parallel `/v1`
root, another Swagger document, handwritten wire types, or database-row contracts.

Expose entitled resources for organizations/legal entities, parties, customers,
suppliers, products, quotes, invoices, credit notes, payments, documents,
electronic submissions/statuses, e-reporting, provider connections, exports,
service accounts, and webhooks as the product phases require.

Every collection uses bounded pagination, filters, sorting, consistent errors,
request IDs, authorization, tenant/legal-entity scope, and rate limits. Every
creation/transmission endpoint defines idempotency semantics.

Reuse existing machine-access architecture if present. Service-account/API secrets
are scoped, expiring/rotatable/revocable, shown once, and stored only as a hash or
secure opaque reference. Do not invent OAuth if a simpler existing secure model
meets the approved requirement.

Outbound webhooks support signed, versioned events with event ID, occurred time,
tenant/legal-entity scope, retry/backoff, delivery log, manual replay, secret
rotation, endpoint SSRF protection, and duplicate-safe semantics. At minimum
cover finalized, sent, delivered, rejected/refused, paid/overdue, credit-note,
payment, electronic-status, and e-reporting outcomes.

## 23. Frontend product and current data-mode boundary

Build the invoicing workspace within the existing Web application, routing,
layouts, design system, service registry, market provider, i18n, analytics/consent,
and authorization architecture. Do not create a second frontend app or routing
system without an approved ADR.

Create a centralized `InvoicingServiceContract` or coherent group of contracts
with deterministic asynchronous demo adapters and HTTP adapters. UI components
never contain fake backend logic, provider conditions, legal thresholds, tax
rules, plan names, or data-mode branches.

The current repository rule remains: normal frontend execution defaults to demo
mode and works with the backend stopped. Implement the production-shaped HTTP
adapter, but do not silently switch the default or contact production. If a live
Invoice frontend is required while `AGENTS.md` still forbids the connection, stop
at the cutover gate and request the explicit repository-policy change. Only set
or release API mode when `LIVE_FRONTEND_CUTOVER_AUTHORIZED=true` and all cutover
tests pass.

Support deterministic demo personas and scenarios for guest, Invoice-only owner,
Shongre pro owner/employee, accountant/delegate, billing manager, viewer, support,
finance, and admin. Include empty, error, validation, quota, provider unavailable,
provider rejected, payment pending/failed, incoming invoice, cross-tenant denied,
and readiness-incomplete states.

Suggested workspace navigation:

```text
Dashboard
Sales
Quotes
Invoices
Customers
Purchases / Supplier invoices
Payments
Electronic invoicing
E-reporting
Products & services
Reports / Exports
Integrations / API
Team
Settings
```

Provide:

- standalone marketing and onboarding without marketplace requirements;
- activation from existing Shongre professional workspace;
- company/legal-entity, tax, numbering, payment, provider, branding, and team
  setup with an honest readiness checklist;
- actionable dashboard with date/legal-entity/currency filters;
- desktop invoice editor and progressive mobile flow;
- dynamic compliance fields returned by the service;
- PDF/structured document preview and secure download;
- electronic status timeline in business and technical views;
- received supplier-invoice inbox;
- customers, suppliers, products, imports, recurring schedules, payments,
  exports, provider connection, API keys, webhooks, team, and settings surfaces;
  and
- loading, empty, offline/retry, partial, validation, forbidden, quota, and
  provider-failure states.

A readiness percentage is presentation only. Display the underlying facts and
distinguish configured, externally verified, connected, sandbox-tested,
production-tested, and legally reviewed.

Use natural French by default and complete English translations. Keep UI locale,
recipient document language, market, and tax jurisdiction separate. Use
locale-aware money/date/address formatting without hardcoded `fr-FR`, `EUR`, or
France inside components.

Allow an organization to configure a logo, display/legal name, contact details,
invoice footer, payment instructions, and restrained accent styling where the
jurisdiction permits it. Branding cannot hide, alter, or remove mandatory legal
information. Structured invoice data remains authoritative regardless of the
visual template.

Meet WCAG 2.2 AA and validate keyboard, screen reader, focus, contrast, tables,
dialogs, menus, errors, reduced motion, responsive layouts, mobile navigation
clearance, and representative widths from 320px through 1440px+. Avoid oversized
business UI.

## 24. Roles, support access, and administration

Use capability checks rather than role-name comparisons. Capabilities include:

```text
invoice.read
invoice.create
invoice.finalize
invoice.transmit
invoice.export
invoice.received.manage
quote.manage
payment.manage
provider.manage
organization.billing.manage
team.manage
api.manage
audit.read
support.invoicing.inspect
```

Map owner, admin, billing manager, accountant, sales, viewer, service account,
and delegated accountant personas to capabilities through the canonical access
system. Backend authorization and RLS remain authoritative.

Extend the admin/operator workspace with tenant/subscription/entitlement/usage,
provider availability and health, regulatory version rollout, format versions,
country launch, failed transmissions, e-reporting, webhooks, jobs, quotas,
refunds, and support tools.

Support agents do not receive invoice content by default. Any break-glass or
impersonation access is explicit, reasoned, time-bounded, least-privileged,
customer-policy aware, and append-only audited. Secrets and complete bank data
remain hidden.

Regulatory transport mode, provider approval status, or compliance rules cannot
be changed through an ordinary commercial-admin toggle.

## 25. Security and privacy

Treat invoice, customer, supplier, payment, bank, tax, and provider data as
sensitive business data.

Implement and test:

- verified authentication and capability authorization on every resource;
- tenant/legal-entity isolation in services and RLS;
- current session/MFA/reauthentication for sensitive operations;
- CSRF protection where cookie auth is used;
- server-side input validation and response minimization;
- encrypted transport and encrypted/opaque secret storage with rotation;
- private object storage, short-lived signed URLs, and download authorization;
- raw-body webhook signature verification, replay windows, and deduplication;
- SSRF-safe provider endpoints and outbound webhook destinations;
- XML/PDF/ZIP parser hardening;
- upload MIME/signature/extension/size checks, randomized storage keys,
  quarantine, and malware scanning where infrastructure permits;
- rate limits, bounded pagination, request/body/file limits, and export controls;
- CSV formula-injection prevention;
- secure headers, session management, dependency/SBOM/secret scanning;
- audit without secrets or unnecessary invoice contents; and
- backup encryption, restore access control, and disposal evidence.

Never log credentials, tokens, full bank identifiers, raw payment data, invoice
line contents by default, customer personal details, signed URLs, or full provider
payloads. Logs use IDs, safe error categories, and correlation/trace IDs.

Apply GDPR purpose limitation, minimization, data-subject export, account deletion,
legal-retention exceptions, legal holds, subprocessor records, and eventual
disposal. Separate a human user's deletion from the tenant's legally retained
documents. Browser analytics remains behind the existing consent gate; operational
invoice processing does not bypass privacy policy merely because it is required.

## 26. Audit, observability, jobs, and operations

Create append-only audit events for document creation/edit/finalization,
numbering, transmission, receipt, validation, customer actions, downloads,
exports, payments/allocations/refunds, credit notes, provider configuration,
credential rotation, legal-entity settings, permissions, support access, and
regulatory configuration changes.

Audit includes actor/service account, tenant, legal entity, market, environment,
action, resource, timestamp, request/correlation ID, source, reason, and safe
before/after metadata where appropriate.

Use the existing worker/queue architecture for document generation, transmissions,
polling, webhook processing, receipt, recurring invoices, reminders, reporting,
exports, and imports. Jobs are persisted, tenant/market/environment-aware,
idempotent, observable, retryable with bounded backoff, and dead-lettered with
operator recovery. Never rely on an in-memory timer for a legal deadline.

Add safe metrics and dashboards for finalized documents, validation failures,
generation latency, submission latency, provider acceptance/rejection, webhook
delay, incoming backlog, e-reporting deadlines/failures, retries/dead letters,
document-storage failures, quota consumption, and customer-visible availability.

Provider and observability failure must not corrupt invoice state. Alerts route
through existing operational infrastructure with an owner and runbook.

## 27. Database, migrations, and legacy consolidation

Use normalized PostgreSQL models, constraints, indexes, timestamps, and explicit
foreign-key deletion rules. Use JSONB only for genuinely variable provider/raw
metadata, not core parties, lines, taxes, statuses, payments, or identifiers.

All changes are ordered, expand-first SQL migrations under
`backend/supabase/migrations/`. Never add Prisma schema or dashboard-only schema
changes. Add database types through the canonical generation process.

Expected concepts include legal entities/establishments/tax registrations,
parties/identifiers/addresses/contacts, products, quotes and snapshots, invoices
and lines/tax breakdowns, number series, document relationships, credit notes,
payments/allocations, recurring schedules/runs, electronic documents/transmissions,
status events, e-reporting transactions/batches/submissions, provider webhooks,
accounting exports, API/webhook records, outbox, and audit.

Do not blindly create every named table. Reuse an equivalent canonical table when
its ownership and semantics fit.

For existing `monetization_*` invoice/billing data:

1. inventory semantics, readers, writers, provider IDs, and historical quality;
2. define the canonical future writer;
3. add new structures without breaking current flows;
4. backfill deterministic links/snapshots with provenance;
5. verify row counts, totals, currencies, hashes, provider references, and access;
6. temporarily project compatibility reads where required;
7. migrate every caller and event producer;
8. stop legacy writes before removing duplicates; and
9. remove obsolete endpoints, generators, schemas, and UI only after tests prove
   the cutover.

Do not convert the current HTML generator into a legal PDF by renaming its MIME
type. Preserve old documents as historical derivatives and generate new legal
artifacts only through the validated document pipeline.

Use database transactions for finalization/numbering/outbox, credit-note creation,
payment allocation, usage recording, and submission reservation. Never leave an
invoice half-finalized.

Create indexes from measured access patterns, including tenant/legal entity plus
number, state, customer/supplier, issue/due date, provider/external ID, and job
claim status. Inspect query plans for dashboard, search, due work, and support
lookups.

## 28. Search, imports, exports, and integrations

Provide tenant/legal-entity-authorized search across invoice/quote number, party,
typed identifier, amount, purchase-order/customer reference, payment reference,
and provider reference. Use scalable pagination; never load all invoices into
memory.

CSV import supports upload quarantine, preview, explicit column mapping, locale
and encoding detection, dry run, row errors, duplicate suggestions, idempotent
commit, provenance, and a compensating rollback only where legally safe.

Support importing customers, suppliers, products, historical documents, and
opening unpaid balances with explicit origin and limitations. Historical import
does not imply that Shongre generated or validated the original legal document.

Implement generic accounting export architecture with legal entity, date range,
journal/document status, accounts, taxes, customers, products/categories, and
payments. Export is asynchronous for large sets, immutable/reproducible,
access-controlled, auditable, and delivered with expiring URLs.

Future accounting/ERP/CRM/bank connectors use provider-neutral adapters and
stable external mappings/statuses. Do not couple invoice core to each vendor.

## 29. Testing and evidence

Tests must prove behavior, isolation, financial correctness, conformance, and
failure safety.

Country-aware coverage includes France, Belgium, Switzerland, one disabled or
`coming_soon` market such as Senegal/Burkina Faso, and an unknown/mismatched
market. Tests prove explicit availability, locale/currency/timezone behavior,
no French-rule fallback, no cross-market cache/job/idempotency leakage, and
fail-closed launch gating. A France-only happy path is insufficient.

### Unit and property tests

- money, decimal quantities, discounts, tax, rounding, reconciliation;
- numbering and fiscal-period/timezone boundaries;
- quote conversion, invoice immutability, credit relationships;
- classification and versioned compliance rules;
- format mapping and status mapping;
- entitlements, usage, permissions, and retention calculation; and
- invalid/randomized input invariants where property-based tests add value.

### Database, integration, RLS, and security tests

- migrations on a clean database and representative upgrade/backfill;
- finalization transaction and append-only constraints;
- cross-tenant/legal-entity/market IDOR and RLS denial;
- payment allocation and outbox claims;
- storage/download isolation;
- webhook signature/replay/deduplication;
- SSRF, XXE/entity expansion, ZIP bomb, upload spoofing, CSV injection;
- service-account scope and support access; and
- imports, exports, retention holds, and deletion workflow.

### Concurrency and failure tests

- simultaneous invoice finalization/numbering;
- duplicate/out-of-order provider webhook;
- timeout after successful remote submission;
- two workers claiming the same outbox/recurring run;
- duplicate subscription/payment/import events;
- provider unavailable/rate-limited/partially degraded;
- document stored but response lost, and response stored but notification lost;
- DST/month/year/fiscal boundary; and
- retry without double usage or duplicate legal document.

### Format and provider conformance

- official valid/invalid UBL, CII, and Factur-X/profile fixtures actually claimed;
- PDF/A-3/XML embedding checks;
- XSD and Schematron failures;
- multi-rate, exempt, reverse-charge, deposit, final, and credit-note cases;
- current provider sandbox contract tests; and
- end-to-end submit/status/receive/e-reporting flows with recorded evidence.

### Frontend and end-to-end journeys

- external Invoice-only signup/organization/onboarding/customer/invoice/finalize;
- existing Shongre pro activation without second identity;
- Shongre internal subscription transaction to Shongre-issued invoice;
- quote secure view/acceptance/conversion;
- electronic validation/submission/timeline/payment;
- incoming supplier invoice review;
- accountant access to two authorized clients with strict separation;
- guest/forbidden/quota/error/retry/readiness/provider-unavailable states;
- deterministic demo mode with backend stopped;
- HTTP adapter contract mapping without enabling unauthorized live mode; and
- keyboard, screen reader, responsive, reduced-motion, and browser coverage.

### Performance and operational evidence

- bounded p95 budgets for lists/dashboard/search/finalization request;
- background throughput and backpressure for generation/submission/import/export;
- provider rate-limit handling;
- no N+1 or unbounded query on critical views;
- backup/restore of database plus representative immutable documents; and
- alert/runbook evidence for failed provider, stuck queue, expiring credentials,
  and missed reporting deadline.

Run the repository's actual gates, not invented commands. At minimum use the
applicable subset of:

```text
make format-check
make env-check
make migrations-check
make openapi-check
make providers-check
make test-critical
make frontend-check
make backend-check
make ui-check
make cross-platform-check
make test-e2e
make check
make check-all
```

Do not hide failures. Distinguish new failures, pre-existing unrelated failures,
external credential gaps, and unavailable optional tooling.

## 30. Implementation sequence and gated vertical slices

Maintain one evolving architecture and implementation plan. Complete each slice
with migration, domain logic, API contract, demo adapter, UI where applicable,
authorization/RLS, audit, tests, and documentation before expanding.

### Phase 0 — discovery and decisions

- repository/reuse map;
- legal issuer and merchant/seller-of-record map for every Shongre flow;
- tenant/legal-entity model and legacy migration ADR;
- current France source/version register;
- provider evaluation and external-input register;
- threat model, data classification, retention, and release plan.

Continue automatically into safe implementation. Stop only for a decision that
would materially change legal ownership, external spend/contract, production
data, provider selection, or repository policy.

### Phase 1 — core foundation

- shared contracts and permissions;
- tenant/legal-entity/party/customer/supplier foundation;
- exact money/tax primitives;
- quote/invoice/credit-note snapshots and state machines;
- numbering, finalization, outbox, audit, storage provenance;
- deterministic demo service and first accessible UI flow.

Vertical slice:

```text
organization -> legal entity -> customer -> draft invoice -> validate ->
finalize/number -> immutable human-readable document -> secure view/download
```

### Phase 2 — payments, recurring, delivery, and SaaS baseline

- payments/allocations/credits;
- quote acceptance and customer portal;
- recurring schedules and reminders;
- centralized entitlements/usage;
- standalone onboarding and existing-pro activation;
- Shongre internal invoicing event adapter;
- imports and generic accounting exports.

### Phase 3 — electronic format compliance

- current France classifier and effective rules;
- canonical electronic model;
- pinned validators/fixtures;
- standards-valid supported UBL/CII/Factur-X profiles;
- immutable originals and validation reports;
- dynamic compliance UI and readiness evidence.

Do not advance a format to `SUPPORTED` until conformance passes.

### Phase 4 — first real approved-platform integration

- Provider Platform capability extension;
- selected provider adapter;
- sandbox auth, recipient resolution, submit, status, webhook, receive;
- idempotency, reconciliation, health, metrics, alerts, and runbook;
- staging certification evidence.

If `TARGET_APPROVED_PLATFORM` or credentials/contracts are unset, complete the
provider-neutral implementation and deterministic sandbox adapter, mark the real
integration blocked, and do not claim electronic production readiness.

### Phase 5 — receiving, e-reporting, B2G, and accountant/API capabilities

- supplier-invoice inbox and actions;
- transaction/payment e-reporting, batching, corrections, deadlines;
- B2G adapter only when approved and testable;
- service accounts, external API, outbound webhooks;
- delegated accountant access;
- admin/support/provider operations.

Only release the capabilities actually implemented and provider-supported.

### Phase 6 — legacy cutover and hardening

- migrate Shongre billing events/documents to one canonical writer;
- compatibility read window and verified retirement of obsolete writers;
- security/privacy/accessibility/performance review;
- backup/restore and incident drills;
- complete documentation and operator training;
- staging burn-in and production release evidence.

### Phase 7 — live frontend and production release gate

Do not switch normal frontend mode to API unless explicitly authorized and the
repository policy permits it. Do not deploy unless production deployment is
authorized.

Production accepts only the exact frontend/backend image digests certified in
staging. Use root `compose.yaml`, persistent remote-managed Cloudflare Tunnels,
runtime environment values, the validated release manifest, and the one-time
exact-backend-digest migrator. Never publish origin ports, rebuild between
environments, put Tunnel tokens in Git/GitHub variables/image layers, run
migrations on replica startup, or reverse migrations during application rollback.

Use expand/contract compatibility and forward database fixes. Rollback reverts
application digests and feature flags while preserving legal records and schema
compatibility.

## 31. External go-live gates that source code cannot manufacture

Do not declare production-ready until evidence exists for all applicable gates:

- current official France specifications and legal/accounting review;
- Shongre issuer legal identity, VAT, address, bank/payment instructions, terms,
  privacy/DPA/subprocessor, and merchant/seller-of-record decisions;
- selected provider appearing on the current official approved-platform list;
- executed provider commercial agreement and sandbox/production credentials;
- provider interoperability/conformance/certification evidence required by the
  agreement;
- PSP/payment-link and bank-processing approval where used;
- document template and mandatory-mentions sign-off;
- retention, archival, data-location, deletion, and legal-hold sign-off;
- commercial plans, quotas, overages, taxes, invoices, support, and refund policy;
- production email/domain/provider setup;
- staffed support, incident, finance, security, privacy, and regulatory owners;
- staging migration, provider, security, accessibility, performance, backup/
  restore, observability, and rollback evidence; and
- explicit live-frontend and production-deployment authorization.

If any gate is absent, state `IMPLEMENTED_BUT_NOT_GO_LIVE_APPROVED`,
`SANDBOX_ONLY`, or `BLOCKED_BY_EXTERNAL_INPUT` as appropriate.

## 32. Final implementation report

After each meaningful phase, update one report. The final version must contain:

1. architecture discovered and deviations from the initial prompt;
2. reused components and why they were suitable;
3. new modules/contracts/migrations and domain ownership;
4. legacy data migration, compatibility window, and removed duplication;
5. OpenAPI operations and generated artifacts;
6. money/tax/numbering/immutability design and evidence;
7. supported countries, formats, profiles, provider capabilities, and exact
   rules/specification versions;
8. e-invoice send/receive and e-reporting scope actually implemented;
9. tenancy, authorization, RLS, secrets, storage, privacy, retention, audit, and
   threat mitigations;
10. SaaS onboarding, subscriptions, entitlements, usage, API, and webhooks;
11. frontend demo/API mode status and live-cutover status;
12. exact tests/commands run and results;
13. staging/release/backup/rollback/observability evidence;
14. known limitations, risks, deferred non-goals, and migration follow-ups; and
15. every unresolved external decision, credential, agreement, certification,
    authorization, or legal review.

## 33. Definition of done

Shongre Invoice may be called **implemented and production go-live approved**
only when all applicable statements are true and evidenced:

- independent businesses can subscribe without marketplace data;
- existing Shongre professionals activate without another identity;
- Shongre's own legal entity can issue its distinct commercial documents;
- accountant/delegated access works without cross-client leakage;
- tenants, legal entities, markets, environments, storage, jobs, exports, APIs,
  and webhooks are isolated;
- customers, suppliers, products, quotes, secure acceptance, invoices, numbering,
  immutable snapshots, documents, credit notes, payments, recurring schedules,
  reminders, imports, and exports work;
- tax/money/rounding is deterministic and reconciled;
- legal numbers are concurrency-safe and finalized documents are immutable;
- ordinary and reform-related French mandatory data/mentions are versioned and
  validated from current sources;
- every claimed electronic format/profile passes conformance fixtures;
- at least one currently approved platform operates end to end in the applicable
  production mode with real evidence;
- electronic invoices can be sent and received, originals are archived, and
  lifecycle events are append-only and reconciled;
- applicable transaction/payment e-reporting works with corrections/deadlines;
- no retry, timeout, webhook replay, or duplicate job creates duplicate legal or
  billable outcomes;
- subscriptions, entitlements, usage, external API, outbound webhooks, admin,
  support, and provider operations work according to capability;
- WCAG 2.2 AA, responsive, i18n, error/loading/empty states, and deterministic demo
  mode are verified;
- OpenAPI remains canonical, generated artifacts are current, CI passes, and
  obsolete competing implementations are removed;
- staging uses the release candidate's exact image digests and migrations, and
  production promotion follows the repository release invariants;
- backups/restores, alerts, incident response, retention, legal holds, privacy,
  and rollback are evidenced; and
- no fake integration, mock success, unsupported compliance claim, hidden external
  dependency, unresolved critical risk, or unfinished success path remains.

The target is one production-grade, France-ready, internationally extensible,
API-first, multi-tenant invoicing and electronic-exchange SaaS integrated with
Shongre while remaining independently marketable. Architecture alone is not the
finish line; verified working behavior and honest external go-live evidence are.
