# Shongre Cours — implementation report

## Delivered

The tutoring vertical is implemented incrementally in the existing React/TypeScript, modular Node, and Supabase/PostgreSQL architecture. No Django stack or parallel application was introduced.

### Shared contracts

`packages/contracts/src/schemas/courses.ts` defines versioned Zod contracts for feature flags, market configuration, plans, add-ons, subjects, levels, profiles, verification dimensions, qualifications, availability, offers, search, learner requests, guardians, leads, organizations, workspaces, bookings, packages, and sessions.

### Backend

- `CoursesService` owns profile/offer authorization, quota enforcement, minor validation, request routing, contact release, organization membership checks, admin configuration, and Phase 2 gates.
- Demo and PostgreSQL repositories implement one interface.
- `/api/v1/courses/*` exposes public discovery, protected learner/tutor/organization actions, Phase 2 booking rejection, and protected administration.
- The RBAC matrix includes nine course permissions and assigns them by platform role.
- Migration `00011_courses_vertical.sql` adds the normalized schema, indexes, constraints, RLS, privacy-safe search view, review enforcement, audit, and Phase 2 tables.
- `seed/courses.sql` creates the France catalog, 15 subjects, levels, four plans, and add-ons with regulated feature flags off.
- Generated database types include the generic listing vertical reference and core Cours tables.

### Frontend

- Public search has URL-backed filters, cursor-shaped results, responsive desktop/mobile filters, compare state, account-scoped saved tutors, loading/empty/error states, and a guided-request CTA.
- Tutor profiles distinguish verified, pending, private-evidence, and self-declared qualifications; exact location and private evidence are absent.
- The guided request captures goals, schedule, mode, area, budget, start date, context, age band, and guardian consent.
- Tutor onboarding adapts between individual and organization, saves only a non-sensitive local draft, and publishes through the service contract.
- Tutor workspace covers profile completion, moderation, offers, availability, leads, analytics, plan/credits, verification, qualifications, conditional tax wording, and Phase 2 state.
- Organization workspace covers team roles/permissions, locations, centralized leads, plan capacity, verification, and Phase 2 state.
- Admin Cours covers metrics, taxonomy status, plan entitlements, add-ons, request/lead settings, commission configuration, safety, and feature gates.
- The protected admin catalog includes inactive subjects, levels, plans, and add-ons so an operator can disable and later re-enable the same record; the public catalog exposes active records only.
- Navigation, account workspace, admin navigation, footer, page metadata, and canonical routes are integrated.

### Verification performed

- Shared contracts TypeScript check.
- Backend and frontend TypeScript checks.
- Design-token, semantic control metric, and i18n-regression checks.
- Backend Cours unit tests for feature flags, minors, normalized money, duplicate-safe lead routing, contact release, ownership, organization membership, admin configuration, and subject mutation.
- Frontend demo-adapter tests for determinism, rating thresholds, account-scoped saves, minor safeguards, Phase 2 gates, and lead acceptance.
- Migration chain executed in order on a disposable PostgreSQL database.
- France seed executed and verified: 15 subjects, four plans, `payments_enabled = false`.
- Full backend suite: 14 files and 131 tests passed, including integration, repository contracts, RLS, public-payload privacy, and boundary security.
- Full frontend suite: 62 files and 412 tests passed.
- Focused Cours E2E suite passed in Chromium and WebKit: URL-backed search, comparison, WCAG blocking-impact scan, mobile filter dialog, profile privacy/SEO, and guardian draft privacy.
- Backend and frontend production builds passed; the frontend/backend boundary scan reported zero leaks or invalid imports.
- Manual browser validation covered `/cours`, tutor profile, learner request, tutor onboarding, tutor workspace, and admin at desktop and phone widths. No horizontal overflow or browser warnings/errors remained.

## Explicit launch posture

Phase 1 is the intended current runtime. The demo frontend is independent of the backend and starts without Supabase or Stripe. The HTTP adapter and backend are ready for controlled integration, but API mode is not selected by default.

Phase 2 storage and contracts are preparatory. No real payment is initiated; booking deliberately fails while the market gate is off. The mandatory launch checklist is in `docs/operations/shongre-cours-phase-2.md`.

## Follow-up before production traffic

- Run RLS policies against a Supabase test project with real JWT roles, not only static policy and local PostgreSQL migration checks.
- Connect generic tutor favorites to a typed vertical favorite target before enabling API-mode saved tutors.
- Replace illustrative admin analytics with warehouse-backed aggregates.
- Complete translation extraction for new course copy as part of the broader repository i18n migration.
- Perform content/legal review for each new market before enabling its vertical configuration.
