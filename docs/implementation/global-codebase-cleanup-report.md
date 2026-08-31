# Global codebase cleanup and production-readiness report

Date: 2026-08-31 (follow-up; the 2026-08-23 baseline is retained below)

## 2026-08-31 follow-up audit and implementation

This follow-up re-audited the current monorepo rather than assuming the earlier
cleanup still described it. The review covered tracked source, manifests and
lockfiles, framework entry points, dynamic imports, generated contracts,
OpenAPI routing, all 84 ordered migrations, Make targets, Docker/runtime
references, environment profiles, tests, ignored build output, documentation,
and the current Git history used to distinguish disconnected code from
intentional compatibility code.

### Priority audit

#### Critical

No unresolved critical defect was found in the audited repository. The secret,
authorization, RLS, migration-order, OpenAPI, market-isolation, and production
build gates are green. This is not a claim that the demo-first product is ready
for live traffic; the release blockers under **High** still fail closed.

#### High

| Finding                                                                                                                     | Evidence and impact                                                                                                                                                                                                                      | Status                                                                                                                                                                                                                                                                              |
| --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production split-application origins were hardcoded in Web source and could silently diverge from deployment configuration. | `frontend/src/platform/applications/application-registry.ts` contained live defaults; local runtime configuration also embedded fixed fallback ports. A deployment could appear valid while routing users to the wrong application host. | Resolved in source. Production now requires four explicit, distinct HTTPS origins. Deployment must still inject `SHONGRE_MARKETPLACE_ORIGIN`, `SHONGRE_SOLUTIONS_ORIGIN`, `SHONGRE_PROSPECTS_ORIGIN`, and `SHONGRE_FACTURATION_ORIGIN`; no production values were invented locally. |
| Same-origin split-application fallbacks were understood by client links but rejected by server route policy.                | `/solutions/facturation`, `/solutions/prospects`, and `/solutions/marketplace` returned server 404s in the isolated production browser build. A first routing fix also exposed an SSR/client basename mismatch in the browser console.   | Resolved through one typed fallback resolver in `application-registry.ts`, used by the proxy and server application context. Server memory routing and browser routing now receive the same full path and basename.                                                                 |
| Canonical category pages copied their route slug into a redundant query parameter after hydration.                          | `SearchPage.tsx` changed `/categorie/:categorySlug` into `/categorie/:categorySlug?category=…` from an effect. Besides producing two sources of truth, the replacement could race a listing click and was reproduced under WebKit.       | Resolved. The route parameter remains the canonical category input; clearing or changing category leaves the pretty route explicitly, and resumable recent-search URLs add the category only when needed.                                                                           |
| Employment result wrappers overlaid the global footer and intercepted links.                                                | Live geometry showed each `.h-full` `JobCard` wrapper becoming 1,684px tall inside a vertical results section; subsequent 200px cards overflowed into the footer. Axe reported serious WCAG 2.2 target-size/obscuration failures.        | Resolved by removing the redundant wrapper height. The canonical listing card retains ownership of list/grid sizing. Targeted and exhaustive isolated Chromium/WebKit checks pass.                                                                                                  |
| Live marketplace integrations remain intentionally incomplete.                                                              | Client policy still defaults to deterministic demo adapters; KYC, registry, selected AI/payment operations, delivery infrastructure, and deployed recovery evidence are not production-certified.                                        | Release-blocking by design. Keep fail-closed behavior and complete vendor/staging certification before launch.                                                                                                                                                                      |

#### Medium

| Finding                                                                          | Evidence and impact                                                                                                                                                                                                                                                        | Recommendation                                                                                                                                                                                   |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Critical production boundaries have uneven coverage.                             | Measured coverage is 52.51% statements / 47.75% branches for Web, 46.20% / 65.47% for backend, and 54.97% / 40.62% for mobile. Frontend HTTP/auth paths and backend durable workers, storage, provider delivery, and some repositories are materially below the aggregate. | Add failure-path, retry, idempotency, and authorization tests at those boundaries before setting ratcheting thresholds.                                                                          |
| Localization migration remains incomplete.                                       | The checker reports 2,593 user-visible literals across 179 files. French has 3,265 catalog entries; English has 2,534, leaving 731 tracked missing keys (77.61% coverage). Only French is shipped.                                                                         | Continue a declining literal/debt budget; do not add English to `SHIPPED_LOCALES` until UI and domain-data coverage gates pass.                                                                  |
| A few modules concentrate too much responsibility.                               | `backend/src/api/v1/router.ts` is about 5,480 lines; several repositories exceed 3,000 lines; `AdminMonetizationPage` and `PublishWizard` are about 2,700 lines each.                                                                                                      | Extract cohesive route families/controllers and page sections behind existing domain/service contracts, one consumer set at a time. Do not introduce a second router or state system.            |
| Browser output is sizeable and needs route-level evidence before optimization.   | The production build emitted 233 JavaScript chunks, about 9.4MB raw in aggregate, with seven chunks over 250KB and one about 877KB. Aggregate output is not the same as per-route transfer.                                                                                | Capture route-level loaded bytes, LCP/INP/CLS, and chunk attribution before changing code splitting or memoization. Prioritize taxonomy/admin surfaces only if measurements confirm impact.      |
| Coverage execution was not environment-isolated.                                 | The root `test-coverage` recipe skipped `scripts/env.sh`, causing otherwise healthy tests to fail under ambient configuration.                                                                                                                                             | Resolved; all three workspaces now run coverage with `SHONGRE_ENV=test`.                                                                                                                         |
| A 320px account overview could overflow horizontally.                            | The two forced hero-action columns were each about 123px while the longer CTA needed about 164px, producing a measured 328px document.                                                                                                                                     | Resolved in `AccountOverviewPage.tsx` by stacking the actions at the narrow breakpoint and retaining the horizontal layout from `sm` upward.                                                     |
| Real 404 responses used one generic recovery message for every public resource.  | The proxy returned the correct 404/noindex status but an absent listing, vehicle, property, job, teacher, seller, or collection all appeared as “Page introuvable”.                                                                                                        | Resolved with resource-specific, static presentations and recovery links while preserving the response status, robots header, and route-policy boundary.                                         |
| A long-lived WebKit process stopped creating contexts after roughly 32 contexts. | The failure was cumulative and disappeared for the same routes when run in a fresh process; individual route, persona, and design-token checks were deterministic. This could make an exhaustive run hang despite healthy application behavior.                            | Resolved in the canonical E2E launcher by recycling non-Blink engines through bounded shards while preserving the full selected test set. Serial multi-route audits use separate bounded shards. |

#### Low

| Finding                                                       | Evidence and impact                                                                                                                                                                                                                                                                                                                                                                                     | Recommendation                                                                                                                                                                                                          |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Residual textual duplication is low but not zero.             | The source-focused `jscpd` pass found 25 clone pairs / 931 duplicate lines across 284,516 lines (0.33%). The final whole-repository pass, which also includes immutable migrations, contracts, tests, and documentation, found 71 / 2,327 across 419,490 lines (0.55%). Candidates cluster in demo/production projections, employment/CRM mapping, marketing workers, migrations, and a few page pairs. | Consolidate only where semantics and change cadence are truly shared. Never rewrite applied migrations to remove textual duplication; contract-compatible demo/HTTP projections may intentionally repeat mapping shape. |
| The frontend type graph had one barrel cycle.                 | `types/index.ts` and `types/auth.types.ts` formed the sole frontend cycle; backend and mobile had none.                                                                                                                                                                                                                                                                                                 | Resolved by keeping `AuthResult` beside the public `UserProfile` projection in the barrel without a reverse import.                                                                                                     |
| Full native iOS build validation is unavailable on this host. | Expo Doctor passes 21/21, but `xcode-select` points at Command Line Tools and the `iphoneos` SDK is absent.                                                                                                                                                                                                                                                                                             | Run the existing iOS preflight/build on a host with full Xcode. This is an external validation gap, not a code workaround target.                                                                                       |

### Target architecture and consolidation plan

The recommended target remains the architecture already established by the
repository, strengthened rather than replaced:

```text
Web / Expo component
        ↓
controller or hook
        ↓
Promise-based service contract
        ↓
deterministic demo adapter | generated-contract HTTP adapter
        ↓
backend domain service
        ↓
typed repository / durable worker / provider gateway
```

- Keep `backend/openapi/openapi.json` as the only wire-contract source and the
  modular monolith as the only authoritative business-logic runtime.
- Keep market, environment, origin, URL, account/capability, taxonomy,
  entitlement, and provider decisions behind their existing typed registries.
- Keep `packages/design-tokens`, `packages/ui`, and `packages/features` as the
  visual and listing-card sources of truth; page code should compose them.
- Route all split applications through `application-registry.ts`; proxy,
  server rendering, metadata, and client navigation must consume the same
  resolution result.
- Split oversized modules only along existing domain/application seams.
  Repository queries should remain close to the owning domain, and route
  extraction must not create a second endpoint registry.
- Add measurement before performance abstraction: route transfer, Web Vitals,
  query plans, and queue timings determine whether code splitting, caching,
  memoization, or indexes are justified.

### Dependency- and risk-ordered implementation plan

1. **Repository invariants and safety gates — complete.** Re-ran environment,
   boundary, OpenAPI, migration, secret, hostname, token, navigation, taxonomy,
   format, lint, type, test, and build checks before deleting code.
2. **Proven dead code and manifest cleanup — complete.** Removed only files
   with no static, dynamic, convention, build, deployment, or historical
   consumer; synchronized `package-lock.json` with `npm install`.
3. **Typed runtime configuration and routing — complete.** Removed production
   origin defaults, added fail-closed validation and tests, derived local
   origins from configured host/port, and unified same-origin fallback routing.
4. **UI/accessibility regression repair — complete.** Corrected employment
   list-card geometry, the narrow account CTA layout, resource-specific 404
   recovery, canonical category navigation, and browser readiness around SSR
   hydration and intentional server 404 documents.
5. **Critical-boundary coverage — next.** Prioritize auth transport, HTTP
   adapters, payment/provider failure modes, durable jobs, storage quarantine,
   and repository concurrency; introduce ratchets only after the first focused
   tranche.
6. **Measured modularization and performance — next.** Extract the largest
   router/repository/page responsibilities incrementally and optimize only
   where route/query measurements show a user or operating-cost benefit.
7. **Staging integration and release evidence — required before production.**
   Inject real split origins, certify providers/webhooks/queues, validate
   backups/restores and observability, and run native store builds on capable
   hosts.

### Implemented follow-up improvements

Confirmed dead files removed:

- `frontend/scripts/fix-i18n-hooks.mjs`;
- `frontend/scripts/prune-unused-imports.mjs`;
- `frontend/scripts/prune-unused-locals.mjs`;
- `frontend/src/domains/crm/crm.capabilities.ts`;
- `frontend/src/features/transactions/components/LeaveReviewModal.tsx`;
- `frontend/src/features/transactions/components/SellerPayoutModal.tsx`;
- `frontend/src/security/components/RequireRole.tsx`.

Manifest cleanup and corrections:

- removed root direct `uuid` while preserving the transitive Xcode override;
- removed frontend direct `@shongre/brand`, `canvas-confetti`, and
  `@types/canvas-confetti`;
- removed backend `tsc-alias`;
- added the root's real direct `tsx` dependency and frontend's real direct
  `server-only` and `zod` dependencies;
- removed 30 packages from the synchronized lockfile; `npm audit` reports zero
  vulnerabilities.

Retained after convention/runtime verification:

- the Supabase `stripe-webhook` edge-function entry point;
- Docker runtime validation and release/mobile/Make-invoked scripts;
- Sentry CLI, backend `esbuild`, Expo Doctor, and the Inter font file-path
  dependency;
- all 84 applied migrations, generated OpenAPI/database artifacts, deterministic
  demo adapters, and compatibility paths with active consumers.

Other completed changes:

- fixed the only type-cycle and parallelized lazy service-registry test loading;
- corrected i18n tests so 100% coverage applies only to shipped locales while a
  non-growing 731-key English debt budget remains explicit;
- hardened the hostname scanner to include untracked runtime source and ignore
  deleted tracked paths, with a temporary-Git-repository regression test;
- removed hardcoded live origins, fixed localhost fallback literals, and made
  production split origins fail closed;
- corrected the root coverage environment;
- fixed same-origin split-application SSR, metadata, proxy, basename, and
  client routing through one registry resolver;
- kept category landing URLs canonical and made category clear/change behavior
  explicit instead of synchronizing route state through a post-hydration
  effect;
- added contextual 404 headings and recovery actions for each public resource
  family while retaining genuine HTTP 404 and noindex behavior. The proxy's
  direct-navigation guard and Next's not-found UI consume one shared,
  token-backed presentation source so the first response is correct before
  React streaming begins;
- changed demo persona application switches to full application-aware
  navigation so switching among Marketplace, Prospects, and Facturation
  remounts the correct split application locally and crosses origins in
  production;
- removed the 320px account overview overflow by stacking long hero actions at
  the narrow breakpoint;
- fixed the employment result/footer overlap without duplicating card layout;
- kept listing-card location metadata readable instead of truncating it by a
  few pixels at the canonical compact width, synchronized stale browser
  assertions with the current card/grid/list tokens, and removed the confirmed
  unused base `listing-card-list-image` token while retaining its used
  breakpoint variants;
- introduced no parallel visual-token family: the direct 404 response and all
  changed controls consume the existing semantic color, type, spacing, size,
  radius, border, elevation, focus, and motion sources;
- hardened browser checks against smooth-scroll timing, unavailable animation
  frames, active transitions, delayed media layout, and pre-hydration
  interaction; serialized stateful Prospects/admin sweeps; split the exhaustive
  typography audit into seven bounded route groups; and recycled WebKit through
  bounded regular and serial shards;
- normalized 104 previously unformatted tracked files through the canonical
  formatter. These are mechanical changes and are kept distinct from the
  functional edits above.

### Follow-up validation snapshot

- `make check`: passed, including all package/application unit suites (850
  frontend tests), 451 OpenAPI operations (446 business routes and five
  operational routes), 84 ordered migrations, 208/208 publishable taxonomy
  leaves, route/destination coverage, 1,673-file secret scanning, the 917-file
  runtime-hostname policy, and frontend/backend production builds.
- `make test-coverage`: passed after repairing environment isolation.
- `make test-critical`: passed (316 backend, 95 frontend, 25 shared tests).
- `npm audit --audit-level=high`: zero vulnerabilities.
- Knip was rerun under the canonical test profile. Its remaining file findings
  are Make/Expo/Supabase/framework entry points, and its dependency findings are
  exercised by asset paths or build/release commands; retained exports include
  generated contracts, package public APIs, fixtures, and dynamic registries.
  No item was removed from this convention-heavy output without an independent
  consumer and runtime check.
- `jscpd` completed with 0.33% source-focused duplication and 0.55% when
  immutable migrations, tests, and documentation are included. No applied
  migration or intentionally separate demo/HTTP boundary was rewritten merely
  to reduce the metric.
- `make cross-platform-check`: all repository code/token/package/Expo checks
  passed; only the external full-Xcode/iphoneos preflight is unavailable.
- `make test-e2e`: passed against a fresh isolated production build. Chromium
  regular tests passed 1,063 with 90 intentional route-matrix skips; Chromium
  serial audits passed 52/52. Forty recycled WebKit regular shards passed 532
  with the same 90 intentional skips, and three WebKit serial shards passed
  41/41. In total, 1,688 browser assertions passed with zero failure. Firefox
  remains skipped on this macOS 27 host because of its upstream sandbox
  incompatibility; hosted Cloudflare smoke cases remain skipped because no
  deployed validation URL was supplied.

The sections below retain the 2026-08-23 implementation history. Counts and
risks in this follow-up section supersede older point-in-time counts where they
differ.

## 1. Initial baseline

The repository is a TypeScript monorepo, not a Django application. Its active
boundaries are a Next.js/React web frontend, a Node/TypeScript modular-monolith
backend, an Expo mobile client, shared packages, and migration-driven Supabase
PostgreSQL infrastructure.

The initial inventory contained 579 frontend files, 185 backend files, 109
mobile files, 111 shared-package files, 4 infrastructure files, 15 root scripts,
and 21 root documentation files in the audited scopes. The working tree already
contained 58 discovery-related user changes; all were preserved.

The initial navigation graph contained 109 routes and 236 static destinations.
The taxonomy checker covered all 45 publishable leaves, 61 nodes, 109 dynamic
attributes, and 22 demo listings. The canonical repository gate was blocked by
a design-token false positive on official third-party SVG brand colors. There
was no CI workflow, format checking reported 129 files, and dependency audit
reported 11 moderate Expo toolchain advisories with no high or critical finding.

## 2. Audit findings

The highest-impact findings were:

- any syntactically valid four-digit handover code could release order escrow;
- live provider modes could fabricate successful AI, KYC, registry, or payment
  behavior;
- PostgreSQL repositories could silently fall back to demo data after a database
  failure;
- the migration command did not provide a production-grade ordered ledger and
  transaction path;
- the seed command only loaded and described SQL without applying it;
- the real-estate projection trigger was incompatible with the unified publisher
  columns and its slug upsert could create orphan generic listings;
- favorite toggles and active-order creation were race-prone;
- listing lifecycle and order lifecycle could diverge;
- drafts were not durable in database mode;
- many foreign-key access paths had no guaranteed supporting index;
- sensitive business and personal values appeared in logs;
- frontend error handling could expose raw exception text;
- duplicate provider, monetization, generated-type, and port-management
  implementations remained present;
- direct unused dependencies and compiler-proven unused symbols were not
  continuously enforced.

## 3. Removed files and code

The following superseded files were removed after reference, registration,
build, and test searches showed no retained consumer:

| Removed path                                                                  | Evidence and canonical replacement                                                                            |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `backend/generated/database.types.ts`                                         | Obsolete compatibility output; the canonical generated contract is `backend/src/generated/database.types.ts`. |
| `backend/scripts/maintenance/free-port.js`                                    | Unused backend duplicate; root `scripts/free-port.sh` remains the guarded canonical implementation.           |
| `backend/src/infrastructure/database/repositories/monetization.repository.ts` | No production consumer; retained compatibility models now live beside the canonical monetization service.     |
| `backend/src/integrations/ai/gemini-client.ts`                                | Parallel fake Gemini implementation; behavior is centralized behind `AIProvider`.                             |
| `backend/src/integrations/kyc/kyc-provider.ts`                                | Parallel KYC implementation; behavior is centralized behind `KYCProvider`.                                    |

Sixteen compiler-proven unused imports and the remaining compiler-proven unused
locals were removed. Unused exports such as the global employment repository
singleton were removed. `noUnusedLocals` is now enforced in the frontend,
backend, mobile client, and every shared TypeScript package.

## 4. Removed dependencies

The following direct dependencies were proven unused and removed:

- root `concurrently`;
- backend `@google/genai`;
- backend `zod`;
- frontend direct `axe-core` (the Playwright adapter retains its required
  transitive dependency);
- feature-package `zod`.

Coverage runtimes were added for the three testable application workspaces.
The final audit still contains 11 moderate advisories in Expo's CLI/config/Xcode
toolchain and contains zero high or critical advisories. The suggested audit fix
is an invalid major downgrade, so it was not applied.

## 5. Consolidated duplicate implementations

- AI, KYC, registry, and payment behavior now resolves through one provider
  container with explicit demo/live modes.
- Monetization compatibility reads now sit beside the canonical monetization
  domain service instead of a second mutable repository.
- Database scripts share one credential-safe `psql` launcher.
- Database types have one canonical output file and one real Supabase generator.
- Demo payment identifiers use one deterministic identifier utility.
- Frontend diagnostic reporting uses one telemetry boundary; production no longer
  scatters console output.
- Database repository failures use one neutral, structured error boundary.
- Unread-message counting, conversation read state, and favorite toggling use
  canonical database functions instead of repeated in-memory/query sequences.

## 6. Retained legacy code

| Retained code                                          | Reason                                                                                                                                      |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Applied migrations `00001` through `00017`             | Historical installation compatibility; no applied migration was rewritten or deleted.                                                       |
| Legacy seller/store/boost columns                      | Migration `00018` intentionally uses expand/backfill compatibility while consumers transition to unified publisher and promotion contracts. |
| Frontend HTTP adapters                                 | Future public-contract implementation; current runtime remains demo-only as required by repository policy.                                  |
| Specialized Auto, Immo, Employment, and Courses models | Active vertical-specific behavior that cannot be safely flattened into generic listing data.                                                |
| Demo adapters and deterministic personas               | Required standalone frontend architecture and test infrastructure.                                                                          |
| Official social-login SVG brand colors                 | Vendor-required marks; narrowly allowlisted in the checker rather than incorrectly retokenized.                                             |

## 7. Fixed business-logic defects

- Handover confirmation loads the order, checks its stored PIN with a
  timing-safe comparison, and rejects arbitrary four-digit values.
- Production order IDs and handover PINs use cryptographic randomness; demo
  transaction and payment outcomes remain deterministic.
- Messaging requires a distinct counterpart. Unavailable listings keep valid
  conversation history while disabling offers and pickup scheduling.
- Secure purchase now enforces stock and seller-verification capabilities.
- Demo MFA and phone verification accept only the documented deterministic code,
  rather than any six digits.
- One active order per listing is enforced at the source of truth.
- Listing state synchronizes with reservation, cancellation, and sale outcomes.
- Database-mode listing drafts are durable.
- Admin and workspace statistics now query actual data rather than returning
  production-shaped demo constants.
- Real-estate projections populate unified private/professional publisher fields,
  preserve the correct standard publication offer, and reuse the same generic
  listing during slug upserts.
- Database-mode repositories fail closed instead of returning demo or empty
  results after operational failures.

## 8. Database migrations and data corrections

- `00018_unified_catalog_discovery.sql` establishes the unified catalog,
  publisher identity, fair discovery configuration, and explicit placement
  model while retaining compatibility columns.
- `00019_order_integrity_and_handover.sql` adds the active-order uniqueness rule,
  handover constraints, lifecycle synchronization, durable drafts, read-state
  RPCs, and an advisory-lock-protected favorite toggle.
- `00020_foreign_key_indexes.sql` creates stable indexes for every current
  unindexed public foreign key.
- `00021_real_estate_publisher_compatibility.sql` aligns Immo projections with
  unified publishers and serializes slug upserts to prevent orphan listings.

The migration runner now validates ordered, unique, non-empty SQL; uses the
Supabase-compatible migration ledger; applies each migration transactionally;
and stops on the first error. The seed runner now genuinely executes its
idempotent SQL in one transaction instead of only checking connectivity.

A disposable PostgreSQL 17 database proved all 21 migrations, two consecutive
seed runs, and a second zero-change migration run. It finished with 21 ledger
rows, 6 markets, 81 categories, 15 course subjects, 10 vehicle types, 11 property
types, one property, one matching generic Immo listing, zero missing foreign-key
indexes, and zero public tables without RLS. No user or production data was
changed; each disposable database was deleted after verification.

## 9. Security improvements

- Escrow release no longer accepts an arbitrary PIN.
- Live provider modes fail with a neutral `503` when an integration is not
  configured; none silently returns a demo success.
- Production environment validation requires explicit origins, database/service
  credentials, and provider configuration.
- Repository failures no longer leak SQL/provider details or cross into demo
  data.
- Logs no longer include handover PINs, SIRETs, IBAN fragments, internal risk
  scores, transaction amounts, or dispute text.
- Frontend error boundaries show neutral user-safe content and send diagnostics
  through a centralized telemetry interface.
- Favorite toggling and active-order creation are atomic under concurrency.
- New security-definer RPCs revoke public/anonymous/authenticated execution and
  grant only the server role.
- Existing redirect, OAuth-state, password, session, webhook-signature, boundary,
  RLS, and role tests remain green.

## 10. Performance improvements

- Every public foreign key now has a matching leading-column index.
- Unread counts execute as a bounded aggregate RPC instead of loading message
  collections.
- Admin/workspace aggregates execute in PostgreSQL rather than synthesizing or
  scanning demo collections.
- Atomic favorite toggling removes a read-then-write round trip and closes its
  race window.
- Search/discovery retains cursor-shaped contracts, duplicate suppression,
  publisher diversity, bounded sponsored insertion, and configurable ranking.
- Frontend production builds retain route-level loading, responsive image source
  ladders, optimized font loading, and token-backed stable card dimensions.
- The backend benchmark completed 100,000 escrow calculations in 45.93 ms and
  100,000 market-fallback resolutions in 225.63 ms, within its configured
  computation SLA.

## 11. Accessibility and responsive improvements

The retained design system continues to provide named icon controls, keyboard
focus, dialog behavior, touch metrics, reduced-motion tokens, responsive filter
surfaces, safe-area navigation clearance, and consistent semantic states. The
full browser suite checks axe critical/serious rules, control names, keyboard
focus, focus trapping, horizontal overflow, navigation overhang, responsive
media, and representative layouts from 320px through desktop breakpoints.

The static cross-platform checker audited 497 source files. Expo Doctor passed
21/21 checks; iOS SDK/deployment checks passed 3/3 and Android SDK checks passed
4/4.

## 12. Updated documentation

- Backend setup, data modes, provider safety, migration, seed, generated-type,
  and boundary behavior were rewritten in `backend/README.md`.
- E2E environment instructions now use the current `NEXT_PUBLIC_*` contract.
- Taxonomy and Courses documentation was corrected where it contradicted actual
  publication eligibility or monetization.
- CI, Node runtime, and release-gate behavior are now explicit.
- Unified discovery documentation and the earlier implementation report remain
  aligned with migration `00018`.

## 13. Commands executed

Representative canonical commands executed during the cleanup:

```text
make format
make format-check
make check
make cross-platform-check
make test-coverage
make frontend-test-e2e
npm run db:migrate --workspace=backend
npm run db:seed --workspace=backend
npm run test:rls --workspace=backend
npm run benchmark --workspace=backend
npm audit --json
```

Additional focused type checks and regression suites were run after each
security, repository, provider, transaction, and migration change.

## 14. Build results

- Frontend Next.js 16 production build: passed.
- Backend TypeScript build and alias resolution: passed.
- Mobile TypeScript and Expo Doctor: passed.
- Shared brand, contracts, design tokens, UI, feature, and shared packages:
  passed.
- Environment, Supabase template, infrastructure, design-token, navigation,
  taxonomy, and frontend/backend boundary checks: passed.

## 15. Test results

The final canonical `make check` test target passed 828 assertions across frontend,
backend, mobile, contracts, brand, shared, UI, feature, and token packages. The
new RLS/migration suite passes 34 assertions. Coverage execution also passes:

| Workspace                   | Statements | Branches | Functions |  Lines |
| --------------------------- | ---------: | -------: | --------: | -----: |
| Frontend                    |     47.43% |   45.70% |    41.09% | 48.63% |
| Backend                     |     47.62% |   65.84% |    50.53% | 47.62% |
| Mobile instrumented modules |       100% |   76.47% |      100% |   100% |

## 16. Migration results

- Validation-only mode: 21 ordered files, passed.
- Clean PostgreSQL application: 21 applied, 0 failed.
- Repeat migration: 0 applied, 21 already current.
- Seed application: passed twice consecutively in one transaction per run.
- Foreign-key index audit: 0 missing.
- Public-table RLS audit: 0 missing.
- Canonical generated database contract includes the new table and RPCs.

## 17. End-to-end journey results

The main Chromium/WebKit sweep executed 701 cases: 651 passed immediately and 36
were intentionally skipped for routes/layouts where the asserted surface does
not apply. It exposed 14 failures: ten stale fixture/URL expectations after the
deterministic catalogue and canonical `query` parameter changed, plus four
WebKit navigation timeouts caused by `networkidle`/browser resource exhaustion.
The fixture inputs and assertions were updated, the affected navigation waits
were narrowed where safe, and a 32-case Chromium/WebKit regression rerun covering
every failed case and its siblings passed 32/32.

The resulting browser evidence covers public browsing, authentication return
paths, private/pro publication surfaces, Auto, Immo, Employment, Courses,
search/filter/map/empty states, messaging, favorites, transactions, consent,
admin/CRM, keyboard focus, axe rules, responsive media, mobile navigation
clearance, and horizontal-overflow matrices.

Firefox is included in Linux CI. The local macOS 27 Playwright Firefox runtime
is skipped because its upstream sandbox fails before a browser connection can
be created; Chromium and WebKit provide the local browser evidence.

## 18. Remaining external integrations

The following are deliberately not represented as production-complete:

- the frontend remains in deterministic demo mode and is forbidden by current
  repository policy from contacting the real backend;
- live KYC and business-registry providers are not implemented and fail closed;
- live Gemini/AI behavior is not implemented and fails closed;
- Stripe requires real keys, webhook delivery, Connect/Identity decisions, and
  deployment validation; unsupported live balance behavior fails closed;
- a production telemetry/log drain, email/SMS/push delivery, object storage, and
  worker/queue deployment still require environment-specific integration;
- generated Supabase types should be regenerated in the deployment environment
  with the Supabase CLI after applying migrations.

## 19. Remaining risks

| Severity                | Risk                                                                                                                      | Required next action                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| High / release-blocking | The web runtime is intentionally demo-only and therefore cannot persist real marketplace actions.                         | Explicitly authorize the backend-connection phase, implement/test HTTP adapters, auth transport, and staging contract tests.           |
| High / release-blocking | KYC, registry, AI, and parts of payment operations have no production provider.                                           | Select vendors, implement signed/idempotent adapters, complete compliance review, and run sandbox/staging certification.               |
| Medium                  | 2,094 user-visible strings in 131 files remain outside the completed bilingual migration.                                 | Continue the measured i18n migration and add a declining CI budget.                                                                    |
| Medium                  | Frontend/backend overall statement coverage is approximately 47%.                                                         | Raise coverage first around payment, auth transport, workers, HTTP adapters, repositories, and failure paths; then enforce thresholds. |
| Medium                  | Expo's toolchain carries 11 moderate transitive advisories.                                                               | Track Expo's upstream fixed release; do not accept the audit-suggested major downgrade.                                                |
| Medium                  | Production telemetry, queue, mail, push, storage, backup, and recovery have not been validated in a deployed environment. | Provision staging infrastructure and exercise failure/recovery runbooks.                                                               |
| Low                     | Firefox cannot launch locally on macOS 27 with the current Playwright runtime.                                            | Keep Firefox in Linux CI and remove the documented exception after the upstream sandbox fix.                                           |

No known critical or high-severity dependency vulnerability remains. The release
blockers above are product integration gaps, not accepted production behavior.

## 20. Production-readiness conclusion

The repository is substantially simpler, safer, deterministic, migration-safe,
and better guarded than the baseline. Its canonical static checks, unit and
integration suites, production builds, cross-platform checks, migration apply,
idempotent seeds, and local browser suite are green.

Shongre as a complete live marketplace is **not yet production-ready**. Current
repository policy intentionally keeps the frontend disconnected, and several
external providers and operational services remain fail-closed placeholders.
Those release blockers must be implemented and certified in staging before a
production launch. The codebase is ready for that integration phase without
silently simulating production success.
