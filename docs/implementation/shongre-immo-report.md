# Shongre Immo — implementation report

## Delivered

- Reusable vertical activation, offer, entitlement, add-on, checkout, and provider-event contracts and PostgreSQL tables.
- Versioned real-estate contracts for market config, taxonomy-driven fields, private/public properties, search, drafts, structured leads, appointments, imports, agency workspace, and admin.
- France migration, PostGIS/search indexes, deny-by-default RLS, private document boundaries, agency roles, analytics events, commercial catalog, and deterministic seed data.
- Complete demo and HTTP service adapters plus backend domain service, demo/PostgreSQL repositories, authorization, quota/regulatory/risk rules, signed private document access, server checkout, and idempotent webhook processing.
- Public search/map, privacy-safe property detail, account-scoped generic favorites, alerts/recent/comparables, ten-step publication, organization drafts, CRM notes/reminders/privacy-safe export, agency subscription/invoice/profile/integration views, and domain-oriented admin.
- Admin-editable plan price/quota/duration/trial/tax, add-ons, market feature flags, property-type activation, and versioned country/transaction field requirements.
- Actual minimized funnel, lead, response, visit, retention, MRR, add-on, cost/revenue-per-lead, and search-to-contact event aggregation.
- Local generated real-estate imagery, canonical metadata/structured data, responsive filter patterns, semantic controls, and explicit demo payment copy.
- Contract, demo-adapter, backend domain, security/privacy, quota, import, checkout, and E2E coverage.

## Runtime posture

The frontend remains standalone in deterministic demo mode and works with the backend stopped. No browser call to Supabase, Stripe, KYC, or production APIs was added. The PostgreSQL and HTTP path is implemented for controlled staging, but enabling it remains subject to `docs/operations/shongre-immo-launch.md`.

Import preview/job records are not a completed ingestion product: storage,
parser and worker fulfillment remain absent. CSV/XML/API entitlements and the
corresponding add-ons are therefore commercially suspended and fail closed.

## Architectural decisions

- The repository’s existing backend is a TypeScript modular monolith, so Immo extends that runtime instead of introducing a parallel Django/DRF application and a second authorization/business-logic stack.
- `real_estate_properties` owns normalized searchable fields while database triggers atomically maintain its generic `listings` projection and media linkage. Existing generic favorites, search and listing cards therefore remain compatible.
- Country rules, offers, prices and entitlements are data; UI pages use versioned contracts and adapters rather than France/plan conditionals.
- Public property projection, private-document authorization, organization membership, quotas, moderation and payment state are enforced server-side even though demo adapters reproduce the same contracts.

## Verification

```bash
npm run typecheck --workspace=@shongre/contracts
npm run test --workspace=@shongre/contracts
npm run lint --workspace=backend
npm run test:unit --workspace=backend
npm run lint --workspace=frontend
npm run test --workspace=frontend
npm run build --workspace=backend
npm run build --workspace=frontend
```

Immo browser coverage:

```bash
set -a && source .env && source scripts/env.sh && set +a
npm run test:e2e --workspace=frontend -- immo.spec.ts --project=chromium --project=webkit
```

Validated locally on 2026-08-22:

- Contracts: 15/15 package tests passed, including 5 Immo schema tests; typecheck passed (the package intentionally has no separate build script).
- Backend: 219/219 tests passed, including Immo unit, API integration, payment webhook, RLS and permission coverage; typecheck, production build and boundary scan passed.
- Frontend: 436/436 unit/contract tests passed; type/design/control checks and the Next.js production build passed.
- E2E: 10/10 Immo journeys passed on Chromium and WebKit, including mobile overflow and blocking WCAG 2.2 AA checks.
- In-app browser: desktop search/map, city recentering, detail metadata/privacy, favorite synchronization, 390×844 publisher/filter sheet, agency billing/profile, and admin configuration rendered with no relevant console warnings/errors.

## Remaining external work

No browser-to-backend connection or live provider was enabled. Live launch still depends on migrated staging type generation, Stripe credentials and portal/invoice operations, geocoder/map licensing, private-file scanning/retention, import workers/API credential operations, KYC/KYB providers, and France legal/privacy/Trust & Safety approvals. These are external integrations and launch gates, not demo fallbacks hidden inside components.
