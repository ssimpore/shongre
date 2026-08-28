# Shongre Facturation implementation report

Last updated: 2026-08-28  
Implemented release slice: Phase 1 core foundation  
Release classification: `IMPLEMENTED_BUT_NOT_GO_LIVE_APPROVED`

This is the single evolving delivery report for Shongre Facturation. The canonical
architecture, ownership, state machines, compliance-source register, and rollout
gates are maintained in [`../architecture/invoicing.md`](../architecture/invoicing.md).

## 1. Architecture discovered and deviations from the initial prompt

Shongre is already a TypeScript modular monolith with a canonical Supabase/
PostgreSQL migration chain, one OpenAPI 3.1 contract, generated types, an
organization membership model, a country registry, an application-service/
repository backend, and adapter-based frontend data access.

The implementation therefore adds an `invoicing` bounded context instead of a
second application or a rewrite. Existing `monetization_invoices` remain the
compatibility writer for Shongre account billing. They have not been silently
reclassified as legal tenant-authored invoices.

The mandate describes Phases 0–7. This delivery implements a tested Phase 1
vertical slice. It deliberately does not pretend that provider selection, legal
review, structured-format conformance, SaaS billing, receiving, e-reporting,
B2G, staging certification, or production release happened.

## 2. Reused components and why they were suitable

- Existing organizations and active memberships anchor tenancy and privacy-safe
  authorization.
- Existing access-control capabilities and request principals keep permissions
  centralized.
- The country registry provides explicit market, country, currency, locale,
  timezone, and launch status without a France fallback.
- The canonical OpenAPI generator, manifest, endpoint inventory, router, and
  standard errors preserve the public API workflow.
- The shared Provider Platform, finance, payments, private storage, jobs,
  notification outbox, and monetization systems remain future integration seams;
  Phase 1 does not duplicate them.
- Frontend service contracts, demo/HTTP adapters, service registry, routes,
  access policy, design system, i18n, product layout, and SEO hooks were extended
  rather than forked.

## 3. New modules, contracts, migrations, and domain ownership

The shared contract now defines country-aware legal entities, typed legal
identifiers, parties with customer/supplier roles, invoice lines, tax
breakdowns, invoices, first-class credit notes, readable documents, readiness,
pagination, and finalization commands.

The backend adds an exact money/tax calculator, application service, demo and
PostgreSQL repositories, and authenticated product routes. Migration
`00068_invoicing_foundation.sql` adds legal entities and identifiers, parties
and identifiers, number series, invoices, lines, tax breakdowns, immutable
readable documents, outbox, audit, RLS, immutability triggers, and the single
transactional finalizer. Migration `00069_invoicing_product_access.sql`
registers `shongre.facturation`, adds the organization entitlement predicate,
tightens invoicing RLS to require `invoicing.enabled`, and adds the atomic,
optimistically versioned draft-update transaction.
Migration `00070_shared_product_organization_provisioning.sql` adds a reusable,
country-aware organization identifier boundary, idempotent organization/owner/
market provisioning for direct product acquisition, and an entitlement-checked
bootstrap that derives the first Facturation legal entity from shared business
facts. It grants no product access.
Migration `00071_organization_product_entitlements.sql` moves the commercial
access subject from an inferred payer/owner relationship to an explicit
`organization_id` on shared quotes, orders, subscriptions, and entitlements.
It preserves `account_id` as the payer and audit subject, backfills only
unambiguous legacy memberships, and fails closed for accounts managing several
organizations.

Canonical ownership is explicit: the invoicing service writes drafts and master
data; the PostgreSQL finalization function alone assigns numbers, snapshots,
documents, and finalization events. Payments and accounting remain owned by
their existing domains.

Separate establishment and tax-registration records are not yet present;
country-aware typed identifiers are the current Phase 1 foundation.

## 4. Legacy migration, compatibility window, and removed duplication

No legacy row was mutated, deleted, or backfilled. `monetization_invoices` and
its HTML document endpoint remain operational during the compatibility window.
No duplicate Supabase tree, backend directory, frontend data mode, or live API
path was introduced.

The architecture records the future inventory, provenance backfill,
reconciliation, compatibility projection, producer cutover, and removal order.
That cutover has not started because issuer/tax facts and production ownership
are unresolved.

## 5. OpenAPI operations and generated artifacts

The canonical `/api/v1` contract contains:

- `GET /invoicing/workspace`
- `POST /invoicing/activation`
- `GET|POST /invoicing/legal-entities`
- `POST /invoicing/legal-entities/from-organization`
- `GET|POST /invoicing/parties`
- `GET|POST /invoicing/invoices`
- `GET /invoicing/invoices/{invoiceId}`
- `PUT /invoicing/invoices/{invoiceId}`
- `POST /invoicing/invoices/{invoiceId}/finalize`
- `GET /invoicing/invoices/{invoiceId}/document`

Each operation declares authentication, access metadata, market context where
applicable, standard errors, and idempotency for commands. Generated OpenAPI
types, the backend manifest, and the endpoint inventory are synchronized. The
repository check reports 437 inventoried operations and full router/operational
endpoint coverage.

## 6. Money, tax, numbering, and immutability evidence

- Public money is integer minor units plus ISO currency.
- Quantities and sub-minor unit prices are bounded decimal strings converted to
  scaled `bigint`; authoritative calculations do not use floating point.
- Phase 1 rounds net and tax per line with explicit half-up behavior and sums
  immutable line results.
- Exempt tax lines require an exemption reason; no market defaults to 20% VAT.
- Finalization locks the invoice, the related original for a credit note, and
  the market/legal-entity/document/fiscal-year/environment number series.
- Production numbering fails closed unless the series is approved. Test/demo
  numbering is isolated by environment.
- The final transaction stores issuer, recipient, and canonical snapshots with
  SHA-256 provenance, then appends outbox and audit records without a remote call.
- Finalized legal fields, finalized lines/taxes, readable documents, and audit
  records are immutable. Full cumulative credit changes the original to
  `CREDITED`; over-crediting is blocked under lock.

## 7. Supported countries, formats, profiles, providers, and readiness

The generic core is verified for configured active FR, BE, and CH market
contexts, including EUR/CHF, supported locale, and timezone matching. The demo
workspace is seeded only for FR. SN and BF are `coming_soon` and fail closed;
unknown or mismatched market contexts fail closed. This is core model support,
not evidence of jurisdiction-specific tax or e-invoice compliance.

Only `TEXT_V1` is generated. It is explicitly a human-readable derivative with
`legalOriginal=false`. PDF, PDF/A-3, Factur-X, UBL, CII, Peppol profiles, XSD/
Schematron conformance, and official invalid fixtures are not supported.

`TARGET_APPROVED_PLATFORM=UNSET`. No provider capability is marked supported or
production-ready. Electronic state remains `CONFIGURATION_REQUIRED`.

## 8. E-invoice send/receive and e-reporting actually implemented

None. Phase 1 creates and finalizes internal immutable documents only. It does
not submit, receive, poll, acknowledge, resolve a directory, perform payment
reporting, perform e-reporting, or route B2G documents. No successful legal
transmission is displayed or emitted.

The architecture pins the current official France source register and its
retrieval evidence, but no legal interpretation is activated without a named
review owner and mapped conformance tests.

## 9. Tenancy, authorization, RLS, secrets, privacy, retention, and audit

Resources carry organization, legal entity, market, country, environment, and
currency explicitly. Backend composition verifies the active Facturation
product entitlement, active membership, and capabilities; cross-tenant access
returns privacy-safe not-found results and a missing product grant fails with a
named entitlement gate.

All new tables enable and force RLS. Tenant-owned reads use membership plus the
same active `invoicing.enabled` predicate; writes go through the server
application boundary. The security-definer finalizer and draft updater are
revoked from public and granted only to `service_role`. No privileged secret
was added to frontend code, OpenAPI, fixtures, logs, image layers, or Git.

Finalization emits safe-metadata audit and outbox events. The current readable
artifact is stored inline and served through an authenticated scoped endpoint;
private object storage, signed downloads, break-glass support access, backup/
restore evidence, and jurisdiction-versioned retention are deferred and must be
approved before legal originals are introduced.

## 10. Product onboarding, subscriptions, entitlements, usage, API, and webhooks

Facturation is now a first-class, independently activatable product following
the Prospects portfolio pattern. Shared contracts model organization product
portfolios and standalone/add-on/bundled access. The backend and RLS require an
active `invoicing.enabled` entitlement, while invoice permissions remain a
separate role/team concern. A product-specific registration intent, activation
route, shared organization provisioning, onboarding, product-only shell,
subscription projection, and deterministic demo trial cover new standalone
customers and existing-account add-ons. The API stores the organization facts
collected at direct signup; onboarding can create the invoicing issuer from
that shared record without duplicating business input.

The product identity is registered without a production price because the
commercial approval owner is unresolved. Production activation validates a
grant created by the existing monetization flow; it cannot create one. Usage
meters, public API keys/webhooks, recurring schedules, reminders, and real
delivery orchestration remain deferred.

The shared checkout now requires an explicit organization for Facturation and
Prospects products and verifies that the payer can manage subscriptions for
that organization. This permits a Facturation-only tenant, an add-on customer,
and a multi-product tenant to share one identity and business record without
leaking an entitlement between organizations controlled by the same account.

## 11. Frontend demo/API mode and live-cutover status

The frontend adds a public `/facturation` acquisition page, direct
Facturation-specific professional registration, `/facturation/activation`,
`/facturation/onboarding`, and a protected `/facturation/app` workspace. The
landing follows the established
Shongre Prospects product rhythm with a code-native product preview, explicit
workflow, finalization explanation, multi-market context, production
guardrails, profile-aware calls to action, and a localized entry in the general
platform footer. The workspace lists invoices, readiness gates, totals, creates
deterministic drafts, finalizes locally, selects rows with keyboard-accessible
controls, and views/downloads the non-legal readable derivative.

Facturation-only users see only the Facturation product shell plus relevant
help/legal/shared settings. The workspace supports customer creation, draft
creation and editing, immutable finalization, invoice viewing, authenticated
derivative export, payment-state tracking, organization team permissions,
settings, and subscription status. None of those journeys needs a listing,
marketplace order, or Prospects record.

The same contract has deterministic demo and future HTTP adapters. Normal
execution remains `demo`; no component contains a demo/backend conditional and
there is no silent fallback. `LIVE_FRONTEND_CUTOVER_AUTHORIZED=false`.

The rendered landing, direct registration, onboarding, product-only workspace,
draft editing, customer creation, entitlement denial, and existing-account
activation were checked in the in-app browser. The registration and workspace
were measured at 390×844 and the workspace at 1440×900; document and body widths
remained within the viewport, and the final browser log contained no warning or
error.

Visual comparison used the accepted Facturation concept plus the latest desktop
and mobile landing captures. Fidelity was preserved through the quiet Shongre
product header, compact left workspace navigation, warning/readiness treatment,
summary cards, recent-invoice table, and side-by-side draft/total composition.
The deliberate above-the-fold difference is that the public URL presents a
two-column product story and code-native preview; the authenticated workspace
contains the dense operational dashboard from the concept. Responsive
validation used the browser viewport override and DOM width measurements.

## 12. Exact tests and commands run

The code-level checks run after the architecture hardening changes passed:

```text
npm run typecheck --workspace=@shongre/contracts
npm run typecheck --workspace=backend
npm run typecheck --workspace=frontend

npm test --workspace=@shongre/contracts -- --run
  17 files, 121 tests

npm test --workspace=backend -- --run
  117 files, 645 tests

npm test --workspace=frontend -- --run
  112 files, 736 tests

npm run openapi:check
  OpenAPI valid; generated types/manifest/inventory current; 432 router plus 5 operational endpoints

node scripts/validate-deployment-env.test.mjs
node scripts/production-readiness.test.mjs
node scripts/release-manifest.test.mjs
  deployment isolation, production launch scope, and build-once manifest invariants passed
```

The tests cover exact/sub-minor calculations, date/tax contract validation,
permissions, tenant isolation, active non-FR contexts, fail-closed markets,
idempotent creation/finalization, immutable document provenance, first-class
credit notes, cumulative over-crediting, SQL locks/RLS/immutability markers,
demo independence, product portfolios, entitlement denial, route isolation,
atomic draft editing, activation routes, and the service registry. The rendered
`frontend/e2e/facturation.spec.ts` matrix additionally passes all six supported
customer portfolios in Chromium and WebKit.
It also covers direct-registration organization provisioning, preservation of
country-aware legal facts, idempotent legal-entity bootstrap, the invariant that
signup never grants an entitlement, organization-scoped commercial access,
durable webhook fan-out, renewable worker leases, market four-eyes governance,
malware scanning, API throttling, messaging pagination, and multilingual search
migration structure.

Migrations `00071` through `00076` were applied successfully to a disposable
PostgreSQL 17 database after stopping at and isolating the legacy replay defects
described below. This validates the new SQL syntax and dependency order, but is
not represented as a successful clean-chain migration or pgTAP run.

## 13. Staging, release, backup, rollback, and observability evidence

No staging or production environment was changed. No database migration was
applied, image pushed, release manifest produced, tunnel/DNS modified, secret
created, provider contacted, or deployment performed.

The architecture preserves the root delivery invariants: build once per commit,
runtime-only environment configuration, digest promotion from staging,
migrations once from the exact backend digest, expand/contract compatibility,
and application rollback without reversing legal-data migrations.

Code-level audit/outbox and proposed metrics exist. Signed provider webhooks now
enter one durable worker inbox and private/listing uploads use the shared
fail-closed malware scanner; the current inline Facturation derivative does not
yet use object storage. Staging certification, load/concurrency evidence against
PostgreSQL, backup/restore proof, dashboards, alerts, support drills, signed
image digests, and rollback rehearsal do not exist yet.

## 14. Known limitations, risks, deferred non-goals, and follow-ups

- A fresh replay stops in legacy migration `00030` because it updates columns
  that prior migrations do not create, then encounters an incompatible view
  replacement; `00032` references `public.users` although canonical identities
  live in `public.profiles`; seeded compliance references prevent the direct
  profile cleanup in `00040`. These pre-existing files cannot be edited safely
  while deployed checksums are unknown. Clean Supabase reset, pgTAP execution,
  generated database-type comparison, and production migration remain blocked
  until an operator reconciles the migration ledger and approves a compatible
  baseline repair.
- Phase 1 offers create/edit/finalize/read and human-readable export, but not
  cancellation, deletion, duplicate detection, structured accounting export,
  quotes, supplier ingestion, or accounting posting.
- Establishments and tax registrations need first-class models before advanced
  jurisdiction rules.
- Payment allocation, refunds, recurring invoices, reminders, delivery,
  subscriptions, usage, external API/webhooks, receiving, e-reporting, B2G, and
  provider lifecycle work remain Phases 2–5.
- `TEXT_V1` is not a legal original. The shared object-storage upload paths now
  require malware scanning, but a future legal-original pipeline still needs
  short-lived downloads and an approved retention/legal-hold policy.
- France compliance fixtures and provider sandbox certification remain absent.
- Legacy monetization cutover and production hardening remain Phases 6–7.
- The repository-wide i18n migration checker reports 3,468 strings in 203
  non-migrated files. Its enforcement baseline passes, but those surfaces still
  need progressive localization work.

## 15. Unresolved external decisions and go-live gates

Every external production input remains unresolved:

- approved platform selection and agreement: `UNSET`;
- provider sandbox and production credential references: `UNSET`;
- Shongre production issuer legal entity: `UNSET`;
- issuer bank/payment instructions: `UNSET`;
- legal/accounting owner and review evidence: `UNSET`;
- privacy, retention, deletion, subprocessor, and support-access owner: `UNSET`;
- commercial plans, pricing, quotas, and bundle owner: `UNSET`;
- structured-format/profile selection and conformance certification: `UNSET`;
- security review, accessibility evidence, performance SLOs, backup/restore,
  observability, support readiness, staging certification, and release manifest:
  `UNSET`;
- live frontend cutover: `false`;
- production deployment authorization: `false`.

The honest outcome is a working, tested Phase 1 foundation classified
`IMPLEMENTED_BUT_NOT_GO_LIVE_APPROVED`. Real provider work and legal transport
remain `BLOCKED_BY_EXTERNAL_INPUT`; later safe internal phases are not claimed
complete.
