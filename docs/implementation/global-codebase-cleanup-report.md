# Global codebase cleanup and production-readiness report

Date: 2026-08-23

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
