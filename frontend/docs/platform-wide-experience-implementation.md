# Shongre platform-wide experience implementation

Status: implementation complete and product verification passed on 28 August
2026. The repository-wide release gate remains conditional on the two
environment items recorded below.

This document records the assessment, changes, and acceptance evidence for the
platform-wide simplification and consistency pass. It covers the 160 registered
routes and 238 statically referenced destinations in the current frontend. The
working application remained the baseline: existing flows were consolidated
and strengthened rather than replaced.

## Outcome

Shongre now has one responsive application shell, one semantic design-token
source, one set of shared interaction primitives, deterministic service-backed
demo behavior, market-aware formatting, centralized public metadata, and
explicit clearance for the raised mobile publication control.

The main experience problems found at the start of the pass were:

- equivalent statuses used raw color families and looked different by page;
- many feature modules owned ad hoc dimensions, type sizes, radii, shadows,
  progress widths, z-indexes, and motion durations;
- publication flows constructed persistence records, payment state, employer
  identities, taxonomy mappings, or default business values in React pages;
- browser storage was read during initial render, causing server/client markup
  disagreement and, for returning visitors, an empty main landmark;
- specialized publication drafts were page-owned and could be lost or leak
  between demo accounts;
- messaging and pinned actions did not consistently clear the raised mobile
  publication button;
- SEO tags were written by more than one owner and dynamic routes were only
  client rendered;
- market, money, time, pagination, query policy, discovery weights, and admin
  monetization values had multiple local sources;
- browser dialogs and non-deterministic IDs made testing and recovery uneven;
- the locale selector exposed English even though most product copy remained
  French, producing a partially translated interface.

The implementation resolves those issues without connecting the frontend to a
production API or Supabase business data.

## 28 August Facturation and regression delta

Market impact classification: `MULTI_MARKET_SHARED`. The changes preserve the
existing market, locale, currency, timezone, and organization contracts. They
add no live frontend API dependency: Facturation still runs through the same
typed service boundary and deterministic demo adapter as the rest of the
frontend.

The route inventory is generated from the router itself instead of being
maintained as a second list:

```bash
node frontend/scripts/check-navigation-integrity.mjs --print-routes
```

It currently reports 160 registered routes and verifies 238 statically
referenced destinations. The representative E2E matrix includes Facturation's
public landing page, activation, onboarding, and protected workspace alongside
public marketplace, Prospects, account, seller, professional, staff, and admin
surfaces.

| Priority | Finding | Resolution and regression evidence |
| -------- | ------- | ---------------------------------- |
| P0 | A fast Prospects result could be erased when its own URL update committed. | The controller now distinguishes an internal URL synchronization from an external query change. Discovery, import, evidence, empty-state, and mobile cancellation tests cover the lifecycle. |
| P0 | The Facturation demo singleton could expose one fixture organization's legal entity and customers to another persona. | Demo invoicing state is now keyed by the active organization/account. Legal entities, parties, invoices, documents, number counters, and idempotency records are isolated; a unit test switches tenants and proves the data boundary. |
| P0 | Employment search actions overflowed the 320-pixel viewport because a hidden utility conflicted with the dropdown root's display class. | The desktop dropdown is now contained by a responsive wrapper. Profession, sector, location, and results routes have explicit 320-pixel coverage. |
| P1 | Facturation's dense invoice table used a low-contrast muted header color. | The header uses the semantic secondary-text token. The product-only workspace passes an Axe WCAG 2.2 AA critical/serious scan. |
| P1 | The demo persona menu announced 17 personas while the registry contained 19, and translated numeric prefixes were duplicated. | Count and prefixes now derive from the canonical persona registry. The browser test asserts 19 unique, sequentially numbered choices. |
| P1 | Facturation's independent-product claims were not represented by one end-to-end customer-portfolio suite. | `facturation.spec.ts` covers footer discovery, a complete Facturation-only journey, existing-customer activation, Prospects-only denial, multi-product access, and accessibility. |
| P2 | Permission-filtered admin metrics retained empty grid columns and left the dashboard visually underused. | Grid density now derives from the metrics and operational panels the role may see. The browser regression checks the resulting two-column geometry. |
| P2 | The analytics event-ID fallback used `Math.random`. | The fallback is a deterministic module sequence combined with time; source gates now find no uncontrolled random business/demo behavior. |

Facturation remains one Shongre product rather than a parallel application. A
Facturation-only customer sees the dedicated product shell and relevant shared
account, organization, team, settings, and subscription capabilities without
Marketplace or Prospects navigation. An existing organization activates it as
an add-on and reuses the same identity and business facts. Frontend visibility,
route policy, service entitlements, backend authorization, and RLS share the
same product boundary; the complete architecture and six supported portfolio
configurations are recorded in `docs/architecture/invoicing.md`.

## 27 August verification delta

Market impact classification: `MULTI_MARKET_SHARED`. No schema, market policy,
currency, locale, or country-routing behavior changed; localized copy continues
to resolve through the existing market/location and i18n providers.

The follow-up audit inventoried 282 frontend TSX files, including 57 local
design-system files, 191 feature files, and 24 shared UI renderer files. The
rendered regression matrix covers 62 representative public, account, seller,
professional, staff, and admin routes at 11 widths from 320 to 1440 pixels;
navigation and metadata integrity continue to cover every registered route.

Four ownership gaps were corrected at their shared source:

- whole-page error, missing, restricted, and offline presentation moved from a
  frontend-only implementation into `packages/ui`; the frontend file is now a
  thin localization adapter, so 34 existing render sites inherit one renderer;
- `Drawer position="right"` now renders a full-height side sheet instead of
  silently using the bottom-sheet recipe; the CRM evidence surface no longer
  overrides the drawer width locally;
- consent preferences now compose the canonical `Switch`, semantic surface
  tokens, and modal spacing instead of owning a second checkbox/switch style;
- the shared switch's native checkbox spans its full labelled row. This keeps
  the real input, focus behavior, and 44-pixel target aligned and prevents
  descriptive text from intercepting direct pointer activation.

The affected CRM evidence surface also moved its remaining fixed French copy
into the market-aware translation catalogue and now uses semantic color,
surface, radius, and text tokens. It is registered as a migrated i18n surface,
so hardcoded copy cannot silently return.

## Priorities and implemented global improvements

| Priority | Improvement                                    | Implemented result                                                                                                                                                                                         |
| -------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0       | Preserve rendered content during hydration     | Consent, data mode, market, locale, media queries, and saved state now start from deterministic server-safe values and restore after mount.                                                                |
| P0       | Protect mobile actions from navigation overlap | `--mobile-nav-h`, `--mobile-nav-fab-rise`, and `--mobile-nav-total-h` now drive the navigation, page clearance, messaging composer, pinned actions, and toast stack.                                       |
| P0       | Remove business logic from feature components  | Auto, real-estate, employment, education, payments, verification, messaging, bulk import, analytics, and draft behavior now pass through typed services and deterministic demo adapters.                   |
| P0       | Enforce design-system ownership                | The token audit rejects arbitrary utilities, inline styles, literal form bounds, unmanaged colors, type, elevation, radii, motion, opacity, stacking, and component dimensions.                            |
| P1       | Make equivalent controls equivalent            | Shared progress, confirmation, prompt, dropdown, filter, search, listing, feedback, sheet/modal, and responsive region primitives replace local patterns.                                                  |
| P1       | Normalize regional behavior                    | Market definitions own locale, currency, country, timezone, price bounds, location defaults, and formatting. Money remains minor-unit based.                                                               |
| P1       | Stabilize public discovery and metadata        | One metadata hook/service owns title, description, canonical, robots, Open Graph, and structured data. Query strings collapse to the intended canonical. Dynamic routes now render meaningful server HTML. |
| P1       | Make demo scenarios reproducible               | Runtime IDs, payments, verification, moderation, draft IDs, search, promotions, and role/account state are deterministic.                                                                                  |
| P2       | Consolidate admin configuration                | Discovery scoring, trending policy, monetization, commissions, offers, limits, and market rules use shared schemas and admin constraints across backend, demo adapter, and UI.                             |
| P2       | Prevent false localization claims              | Only `fr-FR` is shipped. The selector cannot activate English until the measurable catalogue migration is complete.                                                                                        |

## Page and flow implementation matrix

The route-level review is grouped by product journey because pages in a journey
share shell, service, state, and component behavior. Every registered route is
covered by one of these groups.

| Surface                                                 | Before                                                                                                                              | Implemented                                                                                                                                                                                                                               |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Homepage and collections                                | Repeated rail dimensions, local ranking presentation, and recent-search state tied to the first client render.                      | Shared listing rails/cards, token dimensions, adapter-owned ranking, hydration-safe recent searches, concise responsive hierarchy, and one metadata owner.                                                                                |
| Search, category, map, and filters                      | Market assumptions, local pagination limits, duplicated filter controls, and desktop-first filter density.                          | URL-backed search state, market configuration, shared query/pagination policy, responsive filter rail/sheet patterns, semantic chips, scalable cursors, and no horizontal overflow.                                                       |
| Listing, vehicle, property, job, and tutor detail       | Vertical pages repeated status, money, trust, media, and action treatments.                                                         | Shared money/time formatting, semantic badges/notices, normalized cards and seller trust presentation, accessible media controls, and vertical service view models.                                                                       |
| Authentication and registration                         | Local password/phone bounds, browser storage calls, native browser prompts, and repeated verification timing.                       | Shared auth constraints, typed auth adapter, deterministic MFA/verification, centralized storage, accessible shared fields/modals, safe return handling, and account-aware continuation.                                                  |
| Consent and legal                                       | Cookie management could be confused with policy content; consent restoration could change hydration output.                         | First-layer accept/refuse parity, no dismiss path, preference reopening without re-consent, version/lifetime enforcement, footer opens the real preference panel, and server-safe restoration.                                            |
| General listing publication                             | UI-owned defaults and repeated limits interrupted draft recovery.                                                                   | Taxonomy/service driven publication, account-scoped adapter persistence, shared constraints, deterministic continuation, market-aware commercial policy, and draft preservation through expected interruptions.                           |
| Auto publication                                        | Page-generated draft IDs and direct local persistence.                                                                              | `AutoService.getOrCreateDraft`, deterministic account-scoped IDs, service save/duplicate/submit, neutral contract state, and backend-ready adapter boundary.                                                                              |
| Real-estate publication                                 | Page-owned Lyon/coordinate/offer/seller defaults, nested DTO assembly, and payment persistence.                                     | Adapter-created market-aware draft, service serialization, draft-contained checkout state, account isolation, and service-owned submission cleanup.                                                                                       |
| Employment publication                                  | React assembled employer identities, taxonomy IDs, salary minor units, screening DTOs, offer defaults, and completion records.      | Typed publication command; adapter owns employer policy, taxonomy mapping, money conversion, question DTOs, completion, deterministic persistence, checkout, and submission. Named step and validation constraints replace page literals. |
| Education learner and tutor flows                       | Page localStorage and onboarding construction mixed presentation with publication policy.                                           | Courses adapter owns learner/tutor drafts, persona/account scope, organization/plan/verification defaults, offers, availability, and publication. Guardian-sensitive values remain memory-only.                                           |
| Favorites and saved searches                            | State could outlive the signed-in account; guest data could remain after merge; initialization was hydration-sensitive.             | Per-account buckets, guest union-and-clear on sign-in, account-change reload, optimistic rollback, service-owned notification settings, and post-mount restoration.                                                                       |
| Messaging                                               | Composer and list layouts could be covered by navigation; page-owned timing/state patterns were inconsistent.                       | Service-backed deterministic messages, shared conversation states, mobile list/detail ergonomics, composer clearance from total navigation height, retry/error/blocked states, and accessible controls.                                   |
| Notifications and feedback                              | Multiple durations and notification behaviors.                                                                                      | One notification service/provider, centralized unread/read operations, token-backed toast timing, deep links, preferences, and consistent live-region feedback.                                                                           |
| Purchases, reservations, orders, and payments           | Component-level price/scenario assumptions and native confirmations.                                                                | Typed order/payment contracts, deterministic scenario adapters, shared confirmation/prompt UI, minor-unit money, explicit pending/failure/action/refund states, and no claim of a real demo payment.                                      |
| Individual workspace                                    | Dense pages reused Pro assumptions and inconsistent actions.                                                                        | Role-relevant navigation, shared listing/action patterns, account-scoped favorites/drafts, normalized finance/promotions/reviews/verification states, and responsive density.                                                             |
| Professional workspace                                  | Team, store, billing, bulk import, and analytics had local limits and progress rendering.                                           | Entitlement-driven visibility, service analytics and bulk import, shared progress component, typed workspace contracts, minor-unit billing, and reusable modal/table states.                                                              |
| Shongre Facturation                                     | Product flows existed, but browser acceptance did not prove independent purchase, product-only onboarding, tenant isolation, or all supported portfolio combinations. | Dedicated landing, activation, onboarding, and workspace routes; organization-scoped demo records; product-aware navigation; entitlement-enforced access; complete customer, invoice, document, team, settings, and subscription journeys; six-portfolio contract and browser coverage. |
| Admin, moderation, finance, support, and Trust & Safety | Raw palettes, scattered numeric policies, large tables without consistent responsive treatment, and duplicated configuration logic. | Semantic states, shared table/mobile-card patterns, named constraints, schema-backed monetization/discovery/commission policy, permission-aware navigation, deterministic audit records, and consistent restricted/empty/error states.    |
| Header, footer, and navigation                          | Search/navigation treatments diverged by viewport and the raised mobile control painted outside reserved space.                     | Compact shared header search, useful compact footer, one market/locale source, responsive account actions, safe-area-aware mobile nav, and measured raised-button clearance.                                                              |
| Loading, empty, error, success, and restricted states   | Pages improvised copy, spacing, illustration size, and retry actions.                                                               | Shared skeleton/state/notice/feedback patterns with semantic headings, live feedback, consistent retry actions, and token-owned sizing.                                                                                                   |

## Component, CSS, and token consistency audit

### Canonical ownership

- `packages/design-tokens/src/theme.ts` owns brand and neutral colors, semantic
  statuses, typography, spacing, control dimensions, icon sizes, radii,
  elevation, stacking, opacity, breakpoints, and component offsets.
- `packages/design-tokens/src/motion.ts` owns motion durations and easing.
- generated CSS is the only theme input consumed by the web application;
  feature CSS contains no literal color, pixel, rem, viewport, or duration
  values.
- neutral `stone-*`, `white`, and `black` utilities are intentionally present
  in the generated Shongre palette. They are canonical tokens, not unmanaged
  Tailwind defaults. Status meaning never relies on those neutrals.

### Automated inventory result

The design-system gate reports zero findings for:

- arbitrary type, line-height, tracking, font, color, radius, shadow, z-index,
  duration, stroke, opacity, dimension, or other bracket utilities;
- inline `style={{ ... }}` declarations;
- raw success, warning, danger, and information palette substitutions where a
  semantic status token exists;
- token utility names with no declaration in the canonical theme;
- literal `min`, `max`, `minLength`, `maxLength`, or `step` form policy inside
  a component;
- non-normalized control heights and radii.

The status migration replaced the earlier 1,230 raw status-palette uses with
semantic success/warning/danger/info tokens. Named shared additions include
navigation clearance, listing card widths, search/dropdown dimensions,
messaging panes and composer, map/layout sizes, progress scale, hero/card type,
control targets, and motion durations.

### Shared component consolidation

| Repeated pattern               | Canonical implementation                                                    |
| ------------------------------ | --------------------------------------------------------------------------- |
| Actions and links              | `Button` (button/router/external-link modes), `IconButton`                  |
| Form controls and feedback     | `FormField`, `Input`, `Select`, `Textarea`, `Checkbox`, `Switch`            |
| Status and guidance            | `Badge`, `Notice`, shared `StatePanel`, `Skeleton`, toast/live region       |
| Overlays                       | shared `Modal`/bottom-right `Drawer`, `ConfirmModal`, `PromptModal`         |
| Navigation and disclosure      | `Tabs`, `DropdownMenu`, `ScrollableRegion`, dialog behavior                 |
| Marketplace content            | `ListingCard`, `ListingGrid`, `ListingRail`, seller/card primitives         |
| Search and filtering           | `GlobalSearchBar`, `FilterChip`, `CategoryFilterRail`, `PriceRangeSlider`   |
| Progress and asynchronous work | `ProgressBar`, shared loading/empty/error states                            |

No new page-specific primitive was introduced where one of these patterns
could be composed or extended.

## Hardcoded value inventory and replacements

| Former hardcoded class/value                                              | Replacement source                                                               |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| raw red/rose/green/emerald/blue/sky status shades                         | `danger`, `success`, `info`, their surface/border/hover/active tokens            |
| arbitrary text sizes and tracking                                         | canonical type and tracking scales, including `micro`, `card-title`, and `hero`  |
| arbitrary radii and shadows                                               | semantic `control`, `card`, `overlay`, `pill`, dropdown/overlay/sticky elevation |
| numeric z-index and durations                                             | named stacking and `fast`/`normal`/`slow` motion tokens                          |
| inline progress widths                                                    | `ProgressBar` with the shared progress scale                                     |
| mobile-nav and pinned-action offsets                                      | the three mobile navigation clearance tokens                                     |
| page query limits and retries                                             | `pagination.config.ts` and `query.config.ts`                                     |
| local market/country/currency strings                                     | market definitions and `MarketLocationProvider`                                  |
| floating-point price presentation                                         | `{ amountMinor, currency }` plus `Intl` formatters                               |
| relative time millisecond arithmetic in changed business flows            | shared time conversion utilities                                                 |
| random demo IDs                                                           | deterministic ID utilities and adapter sequences                                 |
| direct component storage                                                  | `storageService` or a typed demo adapter                                         |
| auth, publication, course, auto, property, and employment bounds/defaults | shared contract constraints and service policies                                 |
| discovery/trending weights                                                | named discovery and trend policy contracts                                       |
| monetization offers, prices, commission, entitlement limits               | versioned monetization catalogue and admin schemas                               |

Browser persistence is owned by explicit gateways: `storage.service.ts` for
structured application state, `data-mode.service.ts` for the isolated data-mode
preference, and the consent-gated analytics attribution/identity modules for
their narrow records. Feature pages, layouts, and design-system components have
no direct local/session storage access.

## Responsive findings and evidence

Rendered inspections covered 320, 375, 390, 430, 768, 1024, 1280, and 1440
pixels or wider on representative public, account, messaging, publication, and
admin routes.

Results:

- no horizontal document overflow at any tested width;
- mobile headers and bottom navigation remain compact and safe-area aware;
- desktop filter sidebars become reachable mobile filter controls;
- dense tables have responsive card/scroll treatments rather than scaled-down
  desktop columns;
- messaging, sticky publication actions, checkout controls, and toast content
  clear the mobile navigation's painted overhang;
- the mobile raised publication disc begins one pixel below the measured pinned
  action boundary in the acceptance test (no overlap or swallowed tap);
- images retain alternatives and responsive containers;
- every inspected page has one main landmark and one H1;
- specialized publication flows render at 390, 430, 768, and 1024 pixels with
  no overflow, missing alternatives, or unlabeled buttons.

## Accessibility findings and implementation

- semantic landmarks and heading ownership are present in the application
  shell and route content;
- a keyboard skip link remains visually collapsed until focused;
- every icon-only control has an accessible name;
- shared focus-visible treatment and focus restoration are used for menus and
  overlays;
- dialogs/sheets use the appropriate modal behavior; the consent banner is a
  region by design and cannot be dismissed without a choice;
- form labels, hints, errors, required state, and live feedback are connected by
  the shared form primitives;
- optional consent starts false and future trackers must pass `hasConsent`;
- status is communicated with text/icon semantics as well as color;
- motion uses tokens and respects `prefers-reduced-motion`;
- coarse-pointer controls reach the shared touch floor; compact native radio
  and checkbox glyphs remain inside a larger label/control hit area;
- the automated WCAG suite targets WCAG 2.2 AA and runs separately from the
  bottom-navigation paint-overlap test.

## Important before to implemented changes

- Returning visitor with stored consent: server banner plus client removal could
  delete the wrong React node -> deterministic initial consent followed by an
  after-mount restore; main content remains intact.
- Mobile messaging composer: cleared only the navigation box -> clears the bar
  plus the raised publication disc through one shared total-height token.
- Employment salary: page multiplied display strings and constructed DTOs ->
  adapter converts minor units and applies catalogue currency.
- Auto/property/employment/course drafts: page localStorage and random IDs ->
  account-scoped deterministic service drafts.
- Admin status colors: multiple raw palettes -> one semantic status language.
- Page metadata: components appended duplicate tags -> one hook updates the
  canonical tags already present in the document.
- Dynamic public route: client-only main content -> meaningful server-rendered
  route output with browser hydration preserved.
- Language switcher: exposed a mostly French English mode -> only the complete
  French locale ships; the migration gate measures when English can return.

## Implementation phases

All three phases were executed in this pass.

### Quick wins — complete

- normalized control sizes, semantic statuses, icons, focus, and feedback;
- removed arbitrary/inline visual values and browser dialogs;
- corrected footer cookie management and mobile navigation clearance;
- centralized money, locale, pagination, query, and motion helpers.

### Foundations — complete

- expanded canonical tokens and automated drift gates;
- consolidated service contracts and deterministic adapters;
- made saved/account state hydration safe;
- centralized SEO and enabled route-aware server rendering;
- moved specialized drafts and authoritative mapping out of UI components.

### Larger refinements — complete for the current demo scope

- harmonized vertical publication/workspace flows;
- schema-backed discovery, trending, monetization, and commission admin;
- responsive public, workspace, messaging, checkout, and admin surfaces;
- platform-wide route, token, contract, unit, build, browser, and accessibility
  acceptance coverage.

## Acceptance criteria

The implementation is accepted when all of the following stay true:

1. `make tokens-check` reports no design-system or control-metric violations.
2. `make contracts-check` passes versioned contract and admin-policy tests.
3. `make ui-check` passes shared UI, frontend, mobile, production build, and
   Expo checks.
4. `make cross-platform-check` passes the repository-wide quality matrix.
5. all 160 registered routes and 238 static destinations pass navigation
   integrity.
6. browser checks at 320, 375, 390, 430, 768, 1024, 1280, and 1440+ show no
   horizontal overflow or obstructed pinned actions.
7. representative public, account, specialized publication, messaging, and
   admin routes expose one main landmark, one H1, one description, and one
   canonical, with no missing image alternatives or unnamed buttons.
8. the WCAG 2.2 AA and bottom-navigation clearance E2E suites pass.
9. the frontend starts and functions in `NEXT_PUBLIC_DATA_MODE=demo` with no
   backend, Supabase, Stripe, or identity provider running.
10. the source scan finds no `Math.random`, browser alert/confirm/prompt, or
    direct feature/layout/design-system storage access.

Current environment note: the shared packages, generated tokens, frontend
typecheck/build, and mobile TypeScript stages of `make ui-check` pass. The root
target then stops in Expo Doctor because 12 installed Expo/React Native packages
are one patch behind the versions required by SDK 57. That dependency-alignment
task predates this Web UI pass and is recorded as an environment blocker rather
than hidden as a frontend visual failure.

The final 27 August isolated production run executed 850 browser checks across
Chromium and WebKit. Phase one passed 743 checks with 50 intentional hosted or
internal-shell capability skips; phase two passed all 57 serial multi-route,
17-persona, design-token, typography, and responsive-matrix checks. There were
zero browser failures. The frontend unit suite passes 655 tests across 99 files,
the shared UI suite passes 8 focused primitive tests, and the contracts package
passes 109 tests across 15 files. The production build completed before the
browser matrix, and the route/navigation gate verified all 132 registered routes
and 263 static destinations.

## 28 August verification and release recommendation

The post-change static and unit gates are green:

- `make frontend-lint`: passed, including 160 registered routes and 238 static
  destinations;
- `make frontend-test`: 112 files and 736 tests passed;
- `make contracts-check`: 17 files and 121 tests passed;
- `make tokens-check`: passed across 624 source files;
- frontend typecheck, production build, shared UI checks, and mobile TypeScript
  checks passed;
- the i18n audit passed its migrated-surface regression budget and reports the
  current 3,468-string/203-file French migration backlog.

The production E2E inventory contains 902 Chromium/WebKit checks. Its first
complete run passed 825 checks with 66 intentional capability/host skips and
reported 11 failures. Six were reproducible product assertions and were fixed:
Facturation contrast and accessible-name defects, Prospects drawer focus
restoration, and a WebKit width assertion that did not clamp negative spare
space. The other five were page-navigation starvation after many WebKit
contexts on this host.

Post-fix evidence is intentionally separated from those first-pass totals:

- all six Facturation product-boundary scenarios pass in Chromium and WebKit;
- the affected 280-check regression group passed 276 checks; the four remaining
  WebKit navigation timeouts moved to unrelated routes, and each exact route
  passed when rerun in a fresh browser process;
- a serial 57-check pass exposed four stale expectations after the persona and
  listing-metadata corrections; both corrected tests pass in Chromium and
  WebKit;
- the complete 19-persona switcher oracle and the listing metadata overflow
  audit pass in both engines;
- no reproducible product assertion remains failing.

Firefox is not counted as a product failure on this macOS 27 host: Playwright's
`plugin-container` is denied by the host sandbox before application code runs.
The responsive matrix still covers 320, 375, 390, 430, 768, 1024, 1280, and
1440+ in Chromium/WebKit.

The final in-app Browser review used the browser's native 1280×720 viewport at
DPR 2. The homepage and admin dashboard rendered without console warnings or
errors. Accepted concepts and final captures are retained in
`frontend/docs/visual-audit/`:

- `homepage-concept.png` and `homepage-final.jpg`;
- `admin-dashboard-concept.png` and `admin-dashboard-final.jpg`.

Visual fidelity is confirmed for the compact two-tier marketplace header, warm
neutral canvas, editorial serif hero, terracotta brand/actions, real listing
carousel, dark admin chrome, compact governance navigation, two-card metric
grid, and full-width audit queue. The homepage keeps the accepted above-fold
message verbatim: “Trouvez la perle rare, sans tracas.” followed by the payment,
handover, and seller-status trust copy. Intentional deviations are limited to
the live demo/persona diagnostic bar, the in-app Browser's narrower crop, the
rotating real demo listing, and code-native responsive spacing. No fabricated
dashboard metric or duplicate implementation was introduced.

Release recommendation: **GO for the frontend demo/product scope and the
independent Facturation capability. CONDITIONAL NO-GO for an unqualified
repository-wide green release tag** until (1) the 12 Expo/React Native packages
are aligned to the SDK 57 patch set and (2) the long-run WebKit host is given
enough process capacity or the matrix is sharded. These are release-infrastructure
conditions, not open product defects.

## Explicit exceptions and confirmation

The following are intentional and verified, not unresolved hardcoding:

- the skip link is measured as 1 by 1 pixel while unfocused so it is visually
  hidden; it expands on keyboard focus and is not a touch action;
- native checkbox/radio glyphs may measure 18 pixels, while their associated
  label or shared wrapper provides the interactive target;
- neutral palette utility names are generated by Shongre's canonical token
  package; they are not literal CSS values in a page;
- `CategoryIcon` sets one scoped `--category-accent` custom property from
  taxonomy data. A finite utility cannot represent an administrator-configured
  accent; the stylesheet still owns foreground/background derivation, opacity,
  dimensions, and motion, and the value is validated by the taxonomy contract;
- realistic prices, dates, places, statuses, and identities remain in demo
  fixtures/adapters, where deterministic scenario data belongs;
- only French is currently declared shipped. The i18n audit records 3,468
  French strings in 203 files that must enter the message catalogue before an
  additional locale can be exposed. This does not create a partially translated
  production mode.

Within UI components, the automated gate confirms that no visual value or
business-critical bound/default remains as an arbitrary or inline literal.
Visual values resolve through canonical token utilities or shared components;
business values resolve through contracts, configuration, services, or
adapter-owned deterministic data.
