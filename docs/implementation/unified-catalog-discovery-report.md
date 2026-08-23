# Unified private and professional discovery — implementation report

## Gap analysis

The existing platform already had a single `listings` table, one taxonomy, shared cards/details, deterministic demo adapters, centralized commercial rules, minor-unit quotes, idempotent Stripe webhooks, RLS, professional workspaces and market-aware publication. The audit found these material gaps:

- Backend and demo “relevance” promoted `is_urgent`, `bumped_at` or `isBoosted` directly.
- Homepage featured retrieval included every Pro seller even without a visibility product.
- Search UI bypassed `SearchService` and called a demo repository directly.
- Listing ownership had only `seller_id`/`store_id`; team actors and organization ownership were not explicit.
- Professional publication authorization was evaluated as `individual` in the generic listing service.
- Promotion booleans lacked one durable source-of-truth record tied to paid, credited or administrative evidence.
- Paid bumps were not separated rigorously from genuine freshness.
- Seller diversity, cross-import duplicate suppression, sponsored relevance thresholds, stable insertion metadata and ranking explanations were absent from the generic catalog.
- Discovery configuration and privacy-safe composition analytics had no canonical tables.

## Implemented architecture

- Shared `runUnifiedDiscovery` pipeline: eligibility, neutral organic scoring, duplicate suppression, relevance-aware seller diversity, separately validated sponsored retrieval, controlled insertion and stable organic pagination.
- Backend `PublisherEntitlementsService`: effective publisher, organization/branch authorization, standard publication rights, quotas and typed reason codes.
- Canonical publisher, promotion, freshness, duplicate and presentation contracts.
- Versioned Postgres discovery configuration plus promotion policies, ownership audit, duplicate review queue, search events and impression evidence.
- Validated and audited administrator draft/publish endpoints reject weights that do not sum to one, duplicate placement positions, sponsored share above 40%, and configurations without organic results.
- Aggregated discovery dashboard data covers no-result rate, organic/sponsored composition, publisher-type distribution, duplicate suppression, diversity reranking and average latency without storing query text or personal content.
- Payment-order triggers activate only paid promotions and revoke failed, cancelled or refunded visibility.
- Demo search uses the same shared engine as the backend; the UI now reaches it through the service registry.
- Shared cards keep identical anatomy while rendering distinct `Pro`, `Vérifié`, `Urgent`, `Remonté`, `À la une` and `Sponsorisé` meanings.

## Ranking and promotion policy

Default weights are relevance 0.30, category 0.12, location 0.08, quality 0.16, freshness 0.12, trust 0.12, price plausibility 0.06 and personalization 0.04. Publisher type, organization size, subscription level, credits and spend are excluded. New sellers receive a neutral trust floor.

Default diversity allows at most two consecutive results and a 35% first-page share per publisher when sufficiently relevant alternatives exist. Sponsored positions default to 2, 7 and 13, with at most three per page, a 20% share, one per seller and a 0.25 minimum relevance. Promotions do not change the organic score or timestamps.

## Compatibility and external integrations

Legacy seller/store/boost columns and routes remain during rollout. Existing valid boost expirations become explicit audited migration grants. Stripe remains the production payment provider. Applying the migration and rebuilding production search documents require the configured Supabase environment; no production database was contacted during repository implementation.

## Verification evidence

The implementation was verified from the repository root on 2026-08-23:

- Backend: TypeScript lint/build passed; 26 files and 272 tests passed.
- Frontend: lint and optimized Next.js production build passed; 73 files and 493 tests passed.
- Contracts/shared features: typechecks passed; 35 tests passed. The mobile consumer also typechecked and passed its 5 tests against the extended shared card/publisher contract.
- Browser accessibility: 64 Chromium checks passed, including search, listing detail, admin, phone-width accessible names, focus order and drawer focus trapping.
- Browser responsiveness: 187 Chromium checks passed across 320, 375, 390, 430, 768, 787, 834, 1023, 1024, 1280 and 1440 pixel layouts.
- Boundary/security scan: zero frontend secret leaks or backend implementation imports.
- Backend computation benchmark: all existing SLA checks remained below 100 microseconds per operation.
- A disposable local PostgreSQL 17 database applied migrations `00001` through `00018`; the unified-discovery migration also reapplied cleanly, produced one active configuration, removed the course paid organic bonus, returned a zero-blocker dry run on the clean fixture, and exercised configuration activation/audit and metrics functions. The disposable database and roles were removed after verification.

The rendered search journey was also checked at 1280×900 and 390×844: the default catalog mixed private and professional inventory, every paid placement was labelled, the private-only URL filter removed professional results, and neither layout produced horizontal overflow or console errors. The administrator discovery panel was checked with an admin demo persona, including localized fields and its draft/publish controls.

## Production rollout boundary

This change deliberately does not contact or mutate production Supabase, Stripe, search, analytics or KYC systems. Production activation consists of backing up, running the documented dry-run, applying migration `00018`, reviewing ambiguous ownership/duplicate queues, deploying the backend and frontend together, rebuilding search documents if an external index is enabled, and watching the new privacy-safe discovery metrics. Legacy ownership and boost fields remain available for an application rollback; the append-only ownership/payment/impression evidence should not be dropped during an incident.
