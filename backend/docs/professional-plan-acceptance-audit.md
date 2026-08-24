# Professional plans — end-to-end acceptance audit

Audited against commercial configuration `commercial-fr-v3` on 2026-08-24.
This document counts a feature as delivered only when its user surface,
service contract, authoritative enforcement, persistence, permissions and tests
form a usable path. A catalog value alone is not implementation.

## A. Plan inventory

The catalog contains 77 products: 65 configured active, 5 archived and 7
disabled. Product-level readiness leaves 31 purchasable and suspends 34 active
products whose paid outcome is incomplete. There are 16 current professional
plans across five active verticals.

| Vertical  | Plan                | Audience     | Monthly | Annual | Commercial state                  |
| --------- | ------------------- | ------------ | ------: | -----: | --------------------------------- |
| General   | Shongre Free        | professional |      €0 |      — | available                         |
| General   | Shongre Pro         | professional |  €19.90 |   €199 | available                         |
| Auto      | Auto Essential      | professional |  €29.90 |   €299 | available with suspended features |
| Auto      | Auto Business       | professional |  €59.90 |   €599 | available with suspended features |
| Auto      | Auto Scale          | organization | €119.90 | €1,199 | available with suspended features |
| Immo      | Immo Essential      | professional |  €29.90 |   €299 | available with suspended features |
| Immo      | Immo Business       | professional |  €69.90 |   €699 | available with suspended features |
| Immo      | Immo Agency+        | organization | €129.90 | €1,299 | available with suspended features |
| Emploi    | Emploi Free         | organization |      €0 |      — | available                         |
| Emploi    | Emploi Recruit      | organization |  €19.90 |   €199 | available with suspended features |
| Emploi    | Emploi Business     | organization |  €49.90 |   €499 | available with suspended features |
| Emploi    | Emploi Scale        | organization |  €99.90 |   €999 | available with suspended features |
| Education | Education Free      | professional |      €0 |      — | available                         |
| Education | Education Pro       | professional |   €7.90 |    €79 | available                         |
| Education | Education Studio    | organization |  €24.90 |   €249 | available with suspended features |
| Education | Education Organisme | organization |  €59.90 |   €599 | available with suspended features |

Archived General and Education families remain non-selectable historical records.
The disabled Emploi Enterprise plan and disabled partner-referral products are
not offered.

## B. Feature inventory

| Domain                | Delivered foundation                                                                                                               | Suspended until complete                                                                                                    |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Professional identity | professional profiles, public storefront projections, verification dimensions, privacy-safe public views                           | organization storefront variants listed in the matrix                                                                       |
| Publication           | structured vertical forms, drafts, validation, moderation submission, lifecycle, active/monthly quotas, media limits               | shared templates, duplication and bulk actions where listed                                                                 |
| Leads and CRM         | structured Auto/Immo leads, Emploi candidate pipeline, Education lead handling, notes/events where implemented                     | Education central inbox and unsupported shared team assignment paths                                                        |
| Analytics             | configured standard/advanced vertical aggregates and promotion attribution                                                         | Education Organisme reporting and unsupported export tools                                                                  |
| Team and locations    | existing membership reads and baseline owner access; historical data remains readable after downgrade                              | paid extra seats, invitations, locations, branch permissions and agency groups without one transactional production service |
| Imports and sync      | typed preview/job records, permissions and idempotency scaffolding                                                                 | all CSV/XML/feed/API claims lacking upload, parser, worker and reconciliation completion                                    |
| Monetization          | quotes, immutable snapshots, checkout, subscriptions, trials, coupons, invoices, credits, upgrades, downgrades, cancellation       | unfulfilled packs, capacity add-ons and vertical add-ons listed below                                                       |
| Listing visibility    | canonical one-listing Urgent, Remonter and 7/30-day À la une offers; demo activation; paid-order fulfillment and refund revocation | ten-bump credit pack and vertical-specific visibility/lead add-ons without complete consumption and fulfillment             |
| Admin                 | versioned draft/approve/schedule/publish/rollback, feature metadata, preview, availability switch, dependency checks and audit     | engineering readiness itself is intentionally not Admin-editable                                                            |

The readiness model has six feature types, four availability states and three
implementation states. `ready + enabled/beta` is the only combination that can
be advertised or granted.

## C. Implementation status

The active catalog currently contains 162 operational entitlement definitions,
87 internally incomplete definitions and 8 definitions blocked by external
dependencies. Non-ready definitions remain in immutable snapshots for history,
but are:

- excluded from plan cards and comparisons;
- neutralized in vertical projections;
- excluded from quote snapshots, recurring credits, plan changes and
  complimentary grants;
- ignored by effective-entitlement resolution, including old grants;
- rejected by checkout when they are the product's only outcome;
- shown as suspended in Admin.

The configuration validator blocks an Admin draft that re-enables a non-ready
feature or enables a feature whose declared dependency is unavailable.

## D. Entitlement matrix

Only suspended promises are listed below; every other positive entitlement in
the plan is operational and remains advertised.

| Plan                      | Incomplete — hidden and not granted                                                                                    | External dependency — hidden and not granted |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| General Free / Pro        | none                                                                                                                   | none                                         |
| Auto Essential            | saved templates                                                                                                        | none                                         |
| Auto Business             | extra team seats, extra locations, templates, duplication, bulk actions, CSV/XML import, priority support              | none                                         |
| Auto Scale                | extra team seats, extra locations, CSV/XML import, exports, branch permissions, priority support                       | inventory API sync, API access               |
| Immo Essential            | saved templates                                                                                                        | none                                         |
| Immo Business             | extra team seats, extra locations, bulk actions, CSV/XML import, templates, duplication, priority support              | none                                         |
| Immo Agency+              | extra team seats, extra locations, agency groups, CSV/XML import, team permissions, priority support                   | inventory API sync, API access               |
| Emploi Free               | none                                                                                                                   | none                                         |
| Emploi Recruit / Business | extra recruiter seats, reusable job templates                                                                          | none                                         |
| Emploi Scale              | extra recruiter seats, templates, CSV import                                                                           | ATS/API sync                                 |
| Education Free / Pro      | none                                                                                                                   | none                                         |
| Education Studio          | team mutations, locations, organization storefront, course catalog, bulk course actions                                | none                                         |
| Education Organisme       | team mutations, locations, organization storefront, course catalog, CSV import, central inbox, bulk actions, reporting | API access                                   |

Suspended standalone products comprise the generic ten-bump pack; current Auto,
Immo, Emploi and Education add-ons without an end-to-end fulfillment consumer; and
Employment's visibility pack. Their prices and history remain configurable,
but public catalogs and checkout cannot sell them.

## E. Functional acceptance

| Scenario                                                                                                       | Result                                                                                      |
| -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Auto Business structured publication, quotas, media, leads, reminders, analytics and monthly credits           | pass                                                                                        |
| Auto Business team/location/template/bulk/import path                                                          | intentionally unavailable; no longer sold or granted                                        |
| Immo Business structured property publication, media, leads, attribution, analytics and monthly credits        | pass                                                                                        |
| Immo Business team/location/template/bulk/import path                                                          | intentionally unavailable; no longer sold or granted                                        |
| Emploi Business job publication, applications, pipeline, assignment, interviews, analytics and monthly credits | pass                                                                                        |
| Emploi Business extra seats/templates                                                                          | intentionally unavailable; no longer sold or granted                                        |
| Education Studio offers, media, leads, analytics and monthly credits                                           | pass                                                                                        |
| Education Studio team/location/catalog/bulk path                                                               | read-only historical data; mutations fail closed and are no longer sold                     |
| Upgrade, immediate proration, period-end downgrade, cancellation and reactivation                              | pass                                                                                        |
| Feature denial and quota denial                                                                                | pass with stable reason codes and neutral copy                                              |
| Admin draft, preview, dependency validation, approval, publication and rollback                                | pass                                                                                        |
| Historical entitlement after a kill switch                                                                     | excluded by current readiness while immutable purchase/configuration history remains intact |

## F. Admin configurability

Admin can edit presentation, prices, tax, price dates, scope, trial policy,
transitions, entitlement values, feature type, availability, dependencies and
help text inside a versioned draft. Preview shows only positive operational
features and warns about suspended promises. A non-ready feature's availability
control is locked, and publication validation is authoritative server-side.

## G. Security verification

- Paid activation requires listing ownership and `listing.promote`.
- Backend quote and checkout remain authoritative; a draft cannot set promotion
  state.
- Entitlements are materialized only from immutable quote/configuration
  snapshots and only after confirmed payment.
- Promotion orders are idempotent and refunds/cancellation revoke active
  placements.
- Existing RLS, organization-role checks, private-document boundaries,
  audit logs and webhook signature checks remain in force.
- No new frontend access to Supabase, Stripe secrets or business tables was
  introduced.

## H. Performance verification

Readiness evaluation is linear over the small entitlement list of one product.
The normalized readiness index supports Admin/operational inspection by product
version. Listing promotion fulfillment is a bounded insert from one quote and
uses the existing unique source-order index. No unbounded catalog or listing
fetch was added. The backend computation benchmark completed 100,000 escrow
calculations in 8.07 ms and 100,000 market fallback resolutions in 40.28 ms,
inside the repository SLA. Backend and frontend production builds passed. All
28 migrations, including the readiness and promotion-fulfillment migration,
were also applied successfully to a disposable PostgreSQL 17 database with the
standard Supabase bootstrap schemas.

## I. Automated tests

Regression coverage includes:

- catalog readiness and product purchasability;
- validator rejection for incomplete features and missing dependencies;
- effective-entitlement suppression of legacy grants;
- quote rejection for suspended products;
- idempotent demo listing-promotion activation;
- fail-closed Auto/Immo/Education import and organization mutations;
- existing billing lifecycle, vertical publication, RLS, security, discovery,
  finance and API suites.

Final clean run:

- contracts: 59 tests passed;
- shared domain logic: 16 tests passed;
- backend unit, contract, integration, RLS and security: 336 tests passed;
- frontend unit and service tests: 575 tests passed;
- targeted Education and listing-action E2E: 14 tests passed across Chromium and
  WebKit.

That is 986 passing automated unit/contract/integration checks plus 14 passing
rendered E2E checks. Manual browser acceptance additionally covered the public
plan comparison, canonical listing boost choices, Admin suspension/readiness
states and the fail-closed Education organization workspace.

## J. Remaining external dependencies

- deployed Stripe secrets, product/price/coupon IDs and authenticated webhooks;
- object storage upload, antivirus scanning and import parser/worker queues;
- inventory/ATS/feed partner credentials, retry/DLQ operations and contractual
  availability;
- transactional email/SMS delivery for invitations and support SLAs;
- shared production organization invitation/location/branch mutation service;
- warehouse-backed reporting where a current vertical uses deterministic demo
  analytics;
- legal, tax, KYC/KYB, retention and market-launch approval.

These dependencies are explicit commercial gates. No unavailable dependency is
silently replaced by a production fallback.
