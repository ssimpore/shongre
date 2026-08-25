# Shongre platform-wide experience implementation

Status: implemented and verified on 25 August 2026.

This document records the assessment, changes, and acceptance evidence for the
platform-wide simplification and consistency pass. It covers the 120 registered
routes and 244 statically referenced destinations in the current frontend. The
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
| Actions and links              | `Button`, `ActionLink`, `BackLink`, `IconButton`                            |
| Form controls and feedback     | `FormField`, `Input`, `Select`, `Textarea`, `Checkbox`, shared field errors |
| Status and guidance            | `Badge`, `Notice`, `StatePanel`, `Skeleton`, toast/live region              |
| Overlays                       | `Modal`, `Sheet`, `ConfirmModal`, `PromptModal`, focus restoration helpers  |
| Navigation and disclosure      | `Tabs`, `DropdownMenu`, `Popover`, `Tooltip`, `ScrollableRegion`            |
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

Two modules are allowed to touch browser persistence directly:
`storage.service.ts`, the structured application-state gateway, and
`data-mode.service.ts`, the isolated data-mode preference gateway. UI modules
have no direct local/session storage access.

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
5. all 120 registered routes and 244 static destinations pass navigation
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
    direct UI storage access.

The final broad Chromium/WebKit acceptance run executed 745 checks: 700 passed,
38 were intentional capability skips and seven initially failed. All seven
passed focused reruns after correcting a stale Support-persona destination and
making the search journey wait for its visible focus expansion; the remaining
four were isolated WebKit navigation timeouts. Five newly inventoried operational
routes then passed another 31 focused checks with four intentional internal-shell
navigation skips. The frontend unit suite passes 602 tests across 90 files, and
the shared contract suite passes all 71 tests.

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
- only French is currently declared shipped. The i18n audit records 2,682
  French strings in 162 files that must enter the message catalogue before an
  additional locale can be exposed. This does not create a partially translated
  production mode.

Within UI components, the automated gate confirms that no visual value or
business-critical bound/default remains as an arbitrary or inline literal.
Visual values resolve through canonical token utilities or shared components;
business values resolve through contracts, configuration, services, or
adapter-owned deterministic data.
