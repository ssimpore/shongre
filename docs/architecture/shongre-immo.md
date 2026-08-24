# Shongre Immo — architecture

## Scope and reusable platform model

Shongre Immo is the versioned `real_estate` vertical inside the existing Shongre marketplace. It reuses accounts, profiles, markets, organizations, generic listing linkage, messaging, favorites, saved searches, notifications, moderation, verification, monetization, analytics, audit, storage, and administration. It is not a separate application.

The implementation also introduces reusable vertical commercial primitives: market activation, offers, prices, entitlement key/value records, add-ons, checkouts, and provider webhook events. Auto, Education, and future verticals can converge on these tables and contracts incrementally without changing their current runtime.

```text
React page
  → RealEstateServiceContract
    → DemoRealEstateService (current NEXT_PUBLIC_DATA_MODE=demo)
    → HttpRealEstateService (future API mode)
      → /api/v1/real-estate/*
        → RealEstateService
          → IRealEstateRepository
            → DemoRealEstateRepository or PostgresRealEstateRepository
              → PostgreSQL / Supabase + private object storage
```

The browser never imports backend code or contacts Supabase business tables. Current demo behavior is deterministic, asynchronous, and account-scoped.

## Versioned property model

`packages/contracts/src/schemas/real-estate.ts` owns schema version 1. A property carries one normalized record plus one or more eligible market codes. Important buyer filters are relational: transaction, property type, price in minor units, surface, rooms, bedrooms, furnished state, DPE, city, seller type, location point, and amenities. Sparse market-specific fields remain validated custom attributes.

The public projection structurally removes moderation data, plan ownership, internal risk signals, private documents, account/organization ownership IDs, creation metadata, and the nested exact address. The approximate public point and label are separate fields. Even a private record marked `exact` is rounded to at least street precision before it reaches a public response. The backend repeats this projection even when RLS already restricts the source row.

Private documents live in `real_estate_private_documents` with private storage keys. Only an owner, authorized agency member, or reviewer can request a short-lived signed URL. Public media uses a separate table and URL set.

## Market and taxonomy configuration

`vertical_market_activations` maps `real_estate` to the canonical backend category `real-estate` and its market-scoped sale/rental subcategories. The existing public taxonomy route remains `/categorie/immobilier` during the frontend taxonomy migration; this is a routing alias, not a second domain category. France configuration supplies locale, currency, timezone, retention, approximate-location radius, regulatory content version, feature flags, property types, dynamic attributes, and conditional rules. A breaking field change requires a schema version bump and adapter migration.

The seeded France types cover apartments, houses, land, parking/garages, commercial premises, offices, buildings, new developments, holiday rentals, rooms/shared accommodation, and other property. UI forms consume catalog metadata rather than one large category conditional.

## Discovery and buyer flow

Search supports project/transaction, type, text, market, city/radius intent, bounding box, price, surface, price per square metre, rooms, bedrooms, furnished, DPE, amenities, seller type, sort, and cursor-shaped pagination. PostgreSQL uses compound, GiST, GIN, DPE, and surface/room indexes. Ranking remains an adapter/backend concern. Programmatic marker fitting never changes the query; only deliberate map drag/zoom emits a viewport constraint, which avoids a feedback loop between privacy-rounded markers and private indexed points. An explicit city takes precedence over a stale map viewport.

The web route `/immo` uses URL parameters, a responsive filter sheet, an approximate Leaflet map, account-scoped favorites, and the existing saved-search store for alerts. `/immo/bien/:slug` owns its metadata and RealEstateListing structured data, exposes comparables without claiming a valuation, records recent views per account, and creates structured contact/visit/call/financing leads.

## Publication and trust

The focused ten-step flow covers project/type, location and markets, characteristics, finance, energy/regulatory data, content, public media/private documents, seller/verification context, privacy-safe preview, and offer/checkout/moderation submission. Drafts persist asynchronously through the service contract and local demo store. Payment or KYC secrets never enter draft state.

France publication validation is driven by admin-editable, versioned field rules: DPE/GES for applicable property types, coproperty lot data when relevant, risk-information status, and professional identity for professional sellers. The backend owns quotas, transitions, risk checks, and moderation submission. Risk signals include reused descriptions/media and suspicious price patterns; they are never exposed to ordinary clients.

Verification remains progressive. Public badges distinguish safe dimensions such as professional or phone verification; they never collapse trust into one boolean. Exact address disclosure is not part of the current public contract.

## Agency operations

Agencies support multiple branches and active members with owner/admin/manager/agent/support/analyst/billing roles. `/compte/immo` exposes properties, organization drafts, structured leads, private notes, assignments, reminders, visits, CSV/XML/API import requests, team/branch views, public profile, integration capabilities, subscription state, invoices, credits, and aggregated analytics. Draft ownership is organization-aware and independently membership-checked in both the service and RLS layers. Lead exports neutralize spreadsheet formulas and omit unreleased contact details. Import idempotency is unique per organization.

Professional information is stored separately from account identity. The France seed contains Agency Starter, Agency Growth, and Agency Network entitlements; UI behavior reads entitlements rather than plan-name checks.

## Offers, checkout, and Stripe

Owner Free, Owner Visibility, Agency Starter, Agency Growth, and Agency Network are data. Prices use integer minor units, currency, tax basis points, billing period, duration, trial, market, audience, and activation. Urgent, Remonter l’annonce, À la une, homepage/local spotlight, qualified-lead credits, and sponsored agency are separate add-ons and are never preselected.

Demo checkout is deterministic and explicitly labelled. Database/API mode can create hosted Stripe Checkout Sessions server-side using inline price data from the server catalog, an idempotency key, metadata, invoices, and signed raw-body webhooks. The provider event ledger makes replay a no-op. Secret keys remain backend-only. Mobile billing policy is outside this web implementation and requires a current review before mobile distribution.

## Public and protected routes

- `/immo`: public search and approximate map.
- `/immo/bien/:slug`: public, privacy-safe detail and structured lead form.
- `/deposer/immo`: seller publication journey.
- `/compte/immo`: protected professional workspace.
- `/admin/immo`: market/configuration/moderation/monetization overview.

## Analytics events and privacy

The migration and repository track listing creation, publication steps/completion, offer selection, checkout, lead creation/first response, visits, search/view/contact, workspace use, subscription, and add-on purchases. Admin metrics derive leads per listing, median response time, search-to-contact, 30-day agency retention, free-to-paid conversion, MRR, add-on revenue, cost per lead, and revenue per lead from those minimized events and paid checkouts. Events use market, optional property/organization, an anonymous session hash, minimized dimensions, and optional minor-unit value. Exact address, private documents, contact text, and internal risk signals are excluded.
