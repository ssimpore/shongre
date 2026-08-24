# Shongre Education — architecture

## Scope

Shongre Education is a versioned `tutoring` vertical inside the existing marketplace. It reuses accounts, markets, organizations, listings, messaging, notifications, moderation, reviews, subscriptions, analytics, audit, and admin. It adds normalized course concepts rather than encoding education data in generic listing JSON.

Phase 1 includes tutor discovery, tutor profiles, course offers, learner requests, relevance-first lead routing, tutor and organization workspaces, plans, add-ons, verification presentation, minor safeguards, and administration. Booking, payment, payout, packages, and recurring lessons are modeled but disabled for France.

## Runtime boundaries

```text
React page
  → CoursesServiceContract
    → DemoCoursesService (current NEXT_PUBLIC_DATA_MODE=demo)
    → HttpCoursesService (future API mode)
      → /api/v1/education/* (`/api/v1/courses/*` compatibility alias)
        → CoursesService
          → ICoursesRepository
            → DemoCoursesRepository or PostgresCoursesRepository
              → PostgreSQL / Supabase infrastructure
```

The frontend never imports backend implementation and never contacts Supabase business tables. Demo behavior is asynchronous and deterministic. Components contain no production API calls or authoritative eligibility rules.

The public catalog returns only active taxonomy and monetization records. The protected admin catalog deliberately includes inactive records, preserving reversibility when an operator disables and later re-enables a subject, plan, level, or add-on.

## Versioned vertical and generic listing link

The public contract carries:

- `vertical: "tutoring"`;
- `schemaVersion: 1`;
- market-aware subjects, levels, offers, profiles, requests, and settings.

Generic listings gain `vertical_type`, `vertical_entity_id`, and `vertical_schema_version`. A course offer can therefore participate in generic lifecycle, moderation, visibility, analytics, and indexing without duplicating the normalized course record.

## Core model

- `course_market_configs`: per-market locale, currency, timezone, age rules, lead rules, commission configuration, safety copy, and feature gates.
- `course_subjects`, `course_subject_levels`, `course_subject_allowed_levels`: hierarchical, market-scoped education taxonomy.
- `course_tutor_profiles` plus normalized subject, level, language, delivery-mode, service-area, availability, qualification, and private-evidence tables.
- `course_offers` plus normalized level, language, delivery-mode, and minor-unit pricing tables.
- `course_learner_requests`: private learner context and guardian consent.
- `course_leads` and `course_lead_credit_ledger`: routed demand, contact release, expiry, disputes, and credit restoration.
- `course_organizations` and `course_organization_members`: team roles and explicit permissions.
- Phase 2 tables for packages, bookings, sessions, payment events, refunds/payout state, and verified-interaction reviews.
- `course_analytics_events` and `course_audit_logs` for product analysis and privileged change history.

Money is always `{ amountMinor, currency }`. Time fields use explicit timestamp semantics. Public view models do not expose database rows.

## Search and lead routing

Tutor search supports market, free text, subject, level, objective, location/radius, delivery mode, price, availability, language, tutor type, verification, statistically meaningful rating, sort, and cursor pagination.

Default ranking is relevance-first. Subject, level, delivery compatibility, location, availability/capacity, and verified trust signals determine organic order. Paid placement is inserted later as an explicitly labeled sponsored result and never contributes to the organic score. The future database view supplies the same public shape while the backend remains authoritative.

Learner requests route to at most five suitable tutors. The service prevents duplicate leads, respects monthly lead entitlements, withholds contact details before acceptance, expires leads, and records invalid-lead disputes.

## Safety, minors, and privacy

- Every non-adult request requires a guardian name, relationship, and consent timestamp.
- Guardian/contact context is private and excluded from public search/profile payloads.
- Exact service coordinates and postal prefixes are stripped from public tutor payloads.
- Qualification evidence is stored separately with deny-by-default RLS. Public profiles show only a safe label and provenance: self-declared, private evidence submitted, provider verified, or Shongre verified.
- Public tutor and offer contracts structurally omit account IDs, internal workflow state, exact-area fields, and moderation reasons. Complete server models use owner/reviewer-only private payloads; public payloads cannot be used to reconstruct those fields.
- Email, phone, identity, qualifications, business, representative, payment, payout, bank/tax-style eligibility remain separate verification dimensions.
- Tax advantages are described as conditional and never guaranteed.
- Ratings display only after the market’s meaningful-review threshold and only originate from verified interactions.

## Organizations and authorization

An organization can have owners, admins, managers, tutors, lead coordinators, and billing members. Membership alone is not sufficient: each member carries explicit permissions and status. Backend routes enforce platform permission plus ownership/membership. RLS independently restricts profiles, requests, leads, qualifications, service areas, bookings, payments, and organization membership.

## Monetization

Plans expose entitlements rather than plan-name conditionals:

- active course and monthly lead limits;
- members and locations;
- visibility credits;
- featured/priority presentation;
- availability, media, video, analytics, lead management, booking, recurring package, bulk course, and central inbox capabilities.

France seeds Free, Tutor Pro, Tutor Premium, and School/Organization plans plus subject highlight, local visibility, profile bump, qualified-lead credit, and verification add-ons. Prices are configuration, never component constants.

## Phase 2 feature gates

France defaults to:

```text
bookingEnabled         false
paymentsEnabled        false
payoutsEnabled         false
packagesEnabled        false
recurringLessonsEnabled false
```

The API rejects booking when gates are off. Configuration rejects payments unless booking and payouts are also enabled. User and organization workspaces explain that regulated payment flows are unavailable rather than rendering non-functional checkout controls.

## Public and protected routes

- `/education`: public search.
- `/education/professeur/:slug`: public, privacy-safe tutor profile.
- `/education/demande`: authenticated guided learner request.
- `/deposer/education`: authenticated, focused tutor/organization onboarding.
- `/compte/education`: own tutor workspace.
- `/compte/education/organisation`: active organization member workspace.
- `/admin/education`: market-manager/admin configuration.

Legacy `/cours`, `/deposer/cours`, `/compte/cours`, and `/admin/cours` URLs are
permanent compatibility redirects and are not parallel vertical routes.

## Evolution

Adding a new market requires market, subjects/levels, plans/add-ons, legal wording, safety rules, tax rules, and explicit feature flags. Adding HTTP mode must not change page components. A new contract version should be additive where possible; breaking payload changes require a schema-version migration and mapping at the adapter boundary.
