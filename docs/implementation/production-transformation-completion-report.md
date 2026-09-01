# Shongre production transformation completion report

> Historical implementation report (2026-08-25). The current release decision,
> inventory, validation state, and blockers are maintained in the
> [production capability matrix](../architecture/production-capability-matrix.md).
> As of 2026-09-01, hosted staging and production Web require API mode with mock
> storage disabled; earlier demo-only production statements in this report are
> superseded.

Completion date: 2026-08-25  
Scope: repository-achievable implementation from the principal architecture
brief. Live-provider, legal and deployed-environment evidence is explicitly
release-gated rather than simulated.

The detailed before/after classification is maintained in the
[production capability matrix](../architecture/production-capability-matrix.md).

## 1. Initial architecture discovered

Shongre is a TypeScript npm-workspace modular monolith: Next.js/React Web,
Node API and worker, Expo mobile, shared contract/UI/domain packages, and
PostgreSQL/Supabase infrastructure. This was retained as the canonical
architecture; no Django or microservice rewrite was justified.

## 2. Major problems found

The audit found missing privileged MFA, support operations and canonical
feature flags; non-atomic offer transitions; notification delivery without a
durable channel outbox; moderation without one appealable case aggregate;
several API-mode vertical adapter dead ends; duplicated report mutation; and
production claims that could not be supported without provider/deployment
evidence.

## 3. Duplications removed

Support uses one service/repository/domain. MFA uses the canonical auth service
and session store. Report enforcement now has one writer through moderation
cases. Frontend notification, moderation, support and feature-flag screens use
the service registry rather than page-owned fake operations.

## 4. Legacy systems removed

The obsolete MFA modal, legacy support repository and alternate
`AdminRepository.resolveReport` mutation were removed. Database aliases and
applied legacy columns were retained only where safe removal requires rollout
and consumer evidence.

## 5. Existing systems improved

The work strengthened request-scoped authorization, deterministic demo
identity, vertical draft persistence, account-scoped favorites, navigation and
design-token gates, notification preference parity, OpenAPI response coverage,
and staff integration fixtures that now exercise MFA-verified sessions.

## 6. Missing systems implemented

Canonical TOTP MFA, support ticket operations, evaluated feature flags,
race-safe marketplace negotiation, a durable multi-channel notification
outbox, moderation cases/appeals, account appeal UI, operator appeal review,
and missing Auto/Immo/Employment/Education/bulk HTTP adapters were implemented.

## 7. Architecture changes and why

All additions follow the existing dependency direction:

```text
page -> typed service contract -> demo or HTTP adapter -> /api/v1
     -> application/domain service -> repository/provider -> PostgreSQL
```

Transactional state transitions live in PostgreSQL functions where concurrent
writers must serialize. External delivery remains behind fail-closed provider
interfaces. Demo adapters remain deterministic and asynchronous without being
production fallbacks.

## 8. Database migrations

Seven ordered, forward migrations were added:

- `00045_support_operations.sql`;
- `00046_feature_flag_control_plane.sql`;
- `00047_privileged_mfa.sql`;
- `00048_vertical_drafts_and_favorites.sql`;
- `00049_marketplace_offer_negotiation.sql`;
- `00050_notification_delivery_outbox.sql`;
- `00051_moderation_cases_and_appeals.sql`.

All 51 migration files pass ordering/content and RLS migration tests. This host
does not provide Docker or the Supabase CLI, so migrations 45–51 were not
applied to a disposable live PostgreSQL here; the CI clean-reset job remains
the required execution proof before release.

## 9. API and OpenAPI changes

The canonical contract now contains 309 router operations plus three
operational endpoints (312 total). It includes MFA enrollment/challenge/session
step-up, support, feature flags, offer counter/withdraw, notification
preferences, user moderation cases/appeals, and operator case/appeal routes.
The generated TypeScript client, runtime manifest, endpoint inventory, lint,
breaking-change policy and router divergence check pass.

## 10. UI and design-system changes

Dedicated support, feature-flag, staff security, account appeal and operator
appeal-review surfaces use existing Shongre primitives. New layouts consume
named grid tokens; form limits consume shared contract constraints. The token,
semantic-status, control-metric, navigation and cross-platform propagation
gates pass across 120 registered routes and 244 static destinations.

## 11. Security improvements

Staff capabilities require a session with accepted TOTP/recovery proof. MFA
secrets are encrypted, backup codes are hashed and one-use, TOTP counters reject
replay, challenges are bounded, and security events are audited. Offers and
appeals enforce affected-party/participant roles and independent review.
Notification destinations and links are server controlled. Secret and frontend
boundary scans pass.

## 12. Monetization implementation

Existing versioned pricing, plans, entitlements, quotas, promotions and
commissions remain authoritative. Offer money uses minor units and the listing
currency. No paid option is silently selected and no demo provider is presented
as a real payment.

## 13. Finance implementation

The immutable ledger, commission, revenue, payout and reconciliation systems
remain canonical and tested. Live Stripe/Connect/Identity certification,
dispute drills and period-close evidence are release requirements, not facts
that can be created in source.

## 14. Professional features

Professional workspaces retain organization permissions, subscriptions,
entitlements, stores, teams, CRM/leads and finance. Generic bulk listing import
now has an HTTP adapter. Production feed synchronization and a complete generic
invitation/seat lifecycle remain explicit partial capabilities.

## 15. Vertical features

Auto, Immo, Emploi and Education preserve their specialized product semantics.
The API client now supports vertical draft lifecycle; Employment has a typed
structured draft; Auto and Education favorites are account scoped; Education
learner/tutor workflows are adapter backed. Live feeds, valuation/financing and
provider-backed booking/payment evidence remain gated.

## 16. Compliance implementation

Consent remains opt-in and future tracking must pass the consent gate. The
existing privacy, export/deletion, retention, tax/DAC7/KYB and audit foundations
remain intact. Moderation decisions now have sanitized affected-party views and
time-bounded appeals. Legal applicability and operating procedures still need
qualified approval.

## 17. Tests added

New unit and RLS/migration coverage exercises MFA, support, flags, offer
authorization/concurrency/withdrawal, notification retry/dead-letter/receipts,
and moderation appeal authorization, independent review and state restoration.
The final non-E2E run passes 1,196 tests across Web, backend, mobile, contracts,
shared UI/features and design-token packages.

## 18. Documentation updated

The initial capability audit is preserved and followed by an 80-row closure
matrix with exact release gates. This report records the requested twenty-part
handoff. Existing authentication, monetization, OpenAPI, vertical, incident,
backup and release documents remain the canonical domain/runbook references.

## 19. Production validation results

Passed locally:

- formatting, lint and all TypeScript workspaces;
- OpenAPI lint/generation/inventory/router consistency;
- 51-file migration ordering/content checks and migration/RLS suites;
- infrastructure template validation, boundary scan and tracked-secret scan;
- canonical token generation, semantic/control guards and navigation checks;
- Web and backend production builds plus mobile type checking;
- 1,196 non-E2E automated tests.

The final Chromium/WebKit browser validation used one worker to avoid hiding
resource pressure behind parallelism. The broad 745-check matrix produced 700
passes, 38 intentional capability skips and seven failures. Four failures were
WebKit navigation timeouts that passed immediately in isolation. Two were the
same stale Support-persona destination assertion after the new canonical
`/admin/support` workspace was introduced. The last exposed a WebKit automation
race when focus expansion and synthetic fill were combined; the journey now
waits for the visible expanded-search state before entering text. All seven
failed cases then passed on their affected engines.

The five new notification-preference, moderation-appeal, Support, feature-flag
and staff-MFA routes were added to the shared accessibility/responsive route
inventory. Their focused cross-engine matrix passed 31 checks with four
intentional skips for internal console pages that do not render the marketplace
bottom navigation. A separate live Chromium review covered eight representative
mobile/desktop pages with no console errors, horizontal overflow, duplicate main
landmarks, duplicate H1s, or duplicate description/canonical tags. Firefox
remains configured for Linux CI because the bundled browser cannot launch under
the host macOS 27 sandbox.

The local production-configuration check intentionally fails with absent live
secrets/providers. That proves the gate is fail closed; it is not a release
approval.

## 20. Remaining non-blocking recommendations and release gates

The remaining product refinements are the complete cross-vertical analytics
catalogue/collector, a shared safe-cache policy, seller/price watch
subscriptions, referrals/campaign orchestration, generic Pro invitation/seat
lifecycle, full mobile parity, metric lineage, segmented sitemap scaling and
performance budgets.

Release remains blocked on provider certification, live migration execution,
Stripe and finance reconciliation evidence, deployed backup/restore and
observability evidence, legal/operations approval, upload malware scanning,
API-mode staging journeys and any additional locale catalogue intended for
launch. The capability matrix gives the exact reason for every partial or
release-gated row.
