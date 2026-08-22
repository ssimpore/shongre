# Shongre Auto — architecture

## Scope

Shongre Auto is the versioned `automotive` vertical inside the existing Shongre marketplace. It reuses accounts, generic listings, markets, organizations, messaging, favorites, moderation, reviews, notifications, monetization, analytics, audit, and administration. It does not introduce a second application or a Django service into the TypeScript modular monolith.

The France configuration includes cars, motorcycles and scooters, utilities, trucks, motorhomes and caravans, agricultural vehicles, construction vehicles, parts, and other vehicles. Boats are modeled but disabled until the market flag and operational rules are approved.

## Runtime boundary

```text
React page
  → AutoServiceContract
    → DemoAutoService (current NEXT_PUBLIC_DATA_MODE=demo)
    → HttpAutoService (future API mode)
      → /api/v1/auto/*
        → AutoService
          → IAutoRepository
            → DemoAutoRepository or PostgresAutoRepository
              → PostgreSQL / Supabase infrastructure
```

The browser does not import backend code or contact Supabase business tables. Current demo behavior is deterministic and asynchronous. The same page components can move to HTTP mode through the service registry.

## Versioned contracts and ownership

`packages/contracts/src/schemas/auto.ts` is the public boundary. Every vehicle carries `vertical: "automotive"` and `schemaVersion: 1`. Important search fields are normalized in PostgreSQL; optional equipment and market-defined attributes use validated structured values.

A private vehicle belongs to exactly one private seller or one dealer organization. Dealer locations require a dealer organization. Public parsing structurally removes owner IDs, dealer internals, stock reference, masked/hash identifiers, registration hash, moderation state/reason, private documents, fraud signals, plan IDs, and creation metadata.

VIN and registration values are normalized and SHA-256 hashed server-side for lookup. Only a short masked VIN may be retained. Full VIN, registration, identity evidence, and document storage paths are rejected from the normal draft payload. Unique partial indexes protect active VIN and registration hashes.

## Search and discovery

Search supports vehicle type, cascading make/model, body, price, year, mileage, fuel, transmission, power, EV battery/range, seller type, city/radius intent, warranty, financing presentation, dynamic attributes, text, sort, and cursor-shaped pagination. PostgreSQL indexes cover the normalized buyer filters, full-text document, equipment, and dynamic attributes. Only `published` plus `approved` rows enter the public API result.

The responsive frontend uses URL parameters as the search source of truth. Comparison accepts two to four vehicles. Saved alerts use the existing saved-search service and carry the Auto criteria. Price-position data appears only when the service returns a sufficient sample and always includes a non-guarantee disclaimer.

## Publication and media

The focused 11-step flow covers type, identity, technical fields, history, document readiness, price/location, media, preview, offer, payment gate, and moderation submission. Non-sensitive state autosaves. VIN and registration stay in transient component state, are cleared after the duplicate check, and never enter local storage or the normal draft payload.

Media validation goes through `AutoServiceContract.uploadDraftMedia`; the current demo adapter returns deterministic assets after type and size checks. Media order, primary-photo selection, and removal are draft state. HTTP mode reserves `/auto/drafts/:draftId/media` for the future signed-upload adapter; it must use private staging, malware scanning, EXIF stripping, plate/face guidance, ownership checks, and promotion to the public media pipeline before API mode is enabled.

## Dealer operations

Dealer organizations support multiple active members and locations. Membership is independently enforced by the backend and RLS. The workspace covers stock, leads, appointments, imports, team, sites, promotions, subscription/invoices, profile, analytics, API, and logs.

Plans expose entitlements rather than plan-name conditionals: stock, media, members, sites, included visibility credits, import formats, lead routing/reminders, storefront, video/360, analytics, API, centralized billing, branch permissions, stock transfers, custom plans, SLA, and support. Stock transfers are normalized, organization-scoped, location-to-location records protected by dealer-manager RLS. CSV/XML/API import requests create durable asynchronous jobs. Client idempotency keys are namespaced and hashed; retries return the original job. Imported rows are never parsed in the HTTP request.

## Trust, leads, and fraud

France document readiness models registration certificate, technical inspection, administrative-status/HistoVec evidence, transfer documents, maintenance invoices, and warranty. Public presentation differentiates missing, private upload, pending review, verified, rejected, and expired. A seller declaration never becomes a verified badge by itself.

Structured leads cover questions, callbacks, viewing/test-drive requests, non-binding price proposals, purchase, trade-in, and information requests for finance, insurance, warranty, inspection, or delivery. They capture source, consent time, marketing choice, status, assignment, reminder, spam assessment, actions, and appointments. Repeated same-vehicle/same-email requests enter review; off-platform and high-risk payment phrases are blocked into a neutral spam workflow. Internal risk signals cover duplicate identity, duplicate media fingerprints, reused descriptions, inconsistent mileage, price outliers, identity/document mismatch, rapid republication, contact abuse, and suspected account takeover; none is public.

## Monetization and provider events

Plans and add-ons use integer minor-unit money, currency, tax basis points, market, optional vehicle-type scope, duration/trial configuration, activation, and entitlements. France seeds Private Seller Free, Vente Sérénité, Dealer Starter, Dealer Growth, Dealer Network, visibility/qualified-lead/sponsored-dealer add-ons, and inactive provider-dependent referral add-ons.

Paid offers and secure sale are disabled. The admin service refuses activation until server prices, checkout, signed webhooks, refunds, and operations exist. Stripe signatures are verified over the raw body before Auto processing. Automotive provider event IDs are stored uniquely, payloads are hashed, and replayed events are no-ops. Recognized checkout/failure/expiry/refund events can update an existing add-on purchase, but they do not make an unconfigured provider available.

Finance, insurance, inspection, warranty, delivery, and trade-in referrals are modeled as consent/audit records with independent market flags. Referral routing remains blocked even if a flag is accidentally changed until a real provider, legal basis, approved copy, and operational control are configured.

## Public and protected routes

- `/auto`: public search.
- `/auto/vehicule/:slug`: public privacy-safe detail.
- `/auto/comparer`: public two-to-four comparison.
- `/deposer/auto`: authenticated private-seller publication.
- `/compte/auto`: protected dealer workspace.
- `/admin/auto`: market-manager/admin configuration.

## Market evolution

Each market supplies locale, currency, timezone, type availability, required/filter fields, catalog, document rules, plans, add-ons, tax rates, safety copy, and explicit feature flags. Breaking vehicle payload changes require a new schema version plus migration and adapter mapping. Commercial rules never move into React components.
