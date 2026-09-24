# Cross-platform UI architecture

Shongre has one product-system dependency graph:

```text
design-tokens       contracts
      │              │
      ├──────┐  ┌────┤
      ▼      ▼  ▼    ▼
     brand  shared   ui
                    │
              features
                 │
        ┌────────┴────────┐
        ▼                 ▼
frontend/ Next.js     mobile/ Expo
        │                 │
       Web          iOS + Android
```

Dependency direction is enforced by `scripts/check-cross-platform-ui.mjs`.
Shared packages never import application folders; backend may consume
`@shongre/contracts` but never UI packages.

## Sources of truth

- `packages/design-tokens/src/theme.ts` owns colour, typography, spacing,
  radius, sizing, border, opacity, motion, breakpoint, shadow, and z-index
  values. Its build creates the Web CSS adapter; `src/native.ts` creates numeric
  React Native adapters.
- The active brand kit owns the sole Shongre Orange swatch. The internal typed
  `src/brand-orange.ts` recipe derives all orange interaction and presentation
  roles; applications can import only the semantic results, never a second
  orange ramp or derivation helper.
- `brand/shongre/brand.config.json` selects the approved, checksummed identity
  masters through its sole `activeVersion` field.
  `make brand-sync` publishes only the curated Web, Expo, and document-runtime
  subset; `packages/brand` exposes identity metadata plus generated Web and
  document registries without becoming a second asset source.
- `packages/ui` owns reusable primitives. `.web.tsx` and `.native.tsx` files
  preserve a common public concept while using semantic HTML or React Native
  primitives as appropriate. Native `Button` forwards explicit accessibility
  roles and state while retaining authoritative disabled/loading state, so real
  radio and toggle consumers do not have to bypass the primitive. Native form
  fields are announced as disabled only when `editable={false}` is explicit.
  Standard buttons use the header's 40px `control-md` minimum on Web and the
  existing coarse-pointer token floor raises it to 44px. `compact` keeps the
  same height with denser typography; `sm` is 32px for desktop toolbars and
  tables, rising to 44px on touch. Native buttons use a 44px minimum at every
  density. Buttons grow only when their labels need more room, including font
  scaling, and standard actions have no oversized marketing variant. Inputs
  alongside a button, such as newsletter signup, use its control metric.
- `packages/features` owns reusable feature presentation and interaction rules.
  Listing cards are the first migrated vertical slice. Their shared projection
  carries category, optional brand, semantic price state, seller type/rating,
  market-resolved promotion and media facts; Web injects routing and the
  canonical favourite control while native injects its platform interaction.
  The shared promotion presenter distinguishes featured/spotlight, search boost,
  urgent, and price-reduction badges. A current, same-market paid placement and
  a valid same-currency reduction can coexist; badge stacks reserve room for
  the favourite control and announce every label. Placement expiry removes only
  the paid badge. Price reductions never qualify a listing for sponsored hero
  priority or boosted map markers, and listing details reuse the same meanings.
  Expo resolves favourite membership once in `FavoritesProvider`, scoped by
  authenticated account and market; cards only consume that cache, guest
  actions open login, and the favourites screen filters one market listing load
  instead of fetching every card individually.
- `packages/contracts` owns runtime Zod DTO schemas by domain.
- `packages/shared` owns framework-free formatting, presentation, and validation.

There are no token sources under `frontend/` or `mobile/`. Tailwind imports the
generated package CSS. Expo screens import the native token adapter directly.

## Platform boundaries

Shared does not mean identical rendering. The following remain platform-owned:

| Shared concept     | Web adapter                             | Native adapter                   |
| ------------------ | --------------------------------------- | -------------------------------- |
| navigation intent  | React Router/Next route bridge          | Expo Router                      |
| text and landmarks | semantic HTML                           | React Native accessibility roles |
| modal surface      | portal/dialog behaviour                 | React Native `Modal`/sheet       |
| images             | responsive Web image wrapper            | React Native `Image`             |
| focus/hover        | keyboard focus and pointer states       | press feedback                   |
| SEO                | Next metadata, robots, sitemap, JSON-LD | not applicable                   |
| native chrome      | not applicable                          | bottom tabs and safe areas       |

No WebView is used. iOS and Android share `mobile/app` and `mobile/src`; there
are no separate business UI trees or platform forks.

The native client is API-only. Its screens use generated-contract service
adapters under `mobile/src/features`; they do not load local taxonomy or listing
fixtures and do not infer authoritative search results from rendered card text.
Publication loads the market-scoped taxonomy tree and resolved publication
schema through `/api/v1`, while search sends query, canonical category scope,
and price bounds to the backend. Supabase remains behind the Shongre backend;
changing the environment's Supabase project does not change mobile UI code.

## Next.js rendering boundary

The App Router owns the server document shell, the single optimized Nunito Sans
Variable loader, route metadata, canonical URLs, robots, sitemap, manifest,
loading, and error states. `frontend/app/layout.tsx` exposes the `next/font`
result as `--font-nunito-sans`; the generated design-token adapter owns
`--font-family-sans` and maps Tailwind's `font-sans` to it. Components inherit
the family and never load or declare an application font independently. The
loading boundary may prioritize its visible compact brand mark, while error and
not-found boundary artwork stays lazy: Next serializes those hidden boundaries
with successful route responses, so priority there creates unused image
preloads on every normal page. The existing mature marketplace router remains
mounted behind one client boundary during the incremental migration. This
preserves all routes and allows route metadata
to be server-rendered now without rewriting the product. New SEO-critical route
content should move to server components incrementally; do not widen the client
boundary.

## Page and screen audit

Every route registered in `frontend/src/app/router/index.tsx` was included in
the source audit: public catalogue/search/listing/profile/store routes,
authentication, publication, legal/help/newsletter, member workspace,
professional workspace, and all admin/CRM routes. Their common foundational
primitives now delegate to `@shongre/ui`; listing-card consumers delegate to
`@shongre/features`. Web-only composites such as desktop header, search
autocomplete, data tables, responsive galleries, SEO metadata, and admin grids
remain local because their structure and interaction are Web-specific.

Web and native listing cards share category/brand, title, price and seller rating,
capabilities, location/date, and public seller identity. Vertical cards place
capability icons with accessible labels at the bottom-left of the media and
photo counts at the bottom-right, keeping the body compact. Horizontal cards
retain labeled capabilities in the body. Vertical cards place the canonical
verification icon beside the seller name when verified;
professional status and a single rating share the divided seller row below the
name. When public seller identity is absent, explicit professional status stays
beside the price. Vertical titles and prices use the shared `card-title` and
`card-price` typography; prices use the existing brand-orange semantic role.
Horizontal cards retain their price-row seller summary. The hero retains
its compact price-first layout. Media geometry, card widths, typography, spacing
and colors come from the shared design tokens. Long titles and financial values
may grow without clipping; rails align only their own cards. Discovery rails
place navigation beside their heading and retain touch scrolling on phones.
Vertical cards without a photo use a compact neutral media well on Web and
native, with extra space for media badges when present. Cards with media
keep the standard 210-pixel well. The shared card owns this decision, so search
and discovery surfaces stay consistent.
Web result grids use the shared `ListingGrid`; token-sized card tracks pack from
the inline start with the shared gap instead of centering or distributing sparse
results across the available row. Search and vertical result pages pair that
grid with the shared `Container` `listingResults` width so every responsive
desktop band ends on a complete card track. Its gutter and width thresholds are
based on the space that each complete row requires, not named device
breakpoints, so overlay-scrollbar and classic-scrollbar platforms select the
same card count at standard window sizes. Homepage sections retain the wider
`results` container because their mixed-content rails and editorial surfaces are
not a quantized search-result grid.
Web marketplace result controls use one adaptive filter architecture:
`SearchResultsToolbar` owns the category-aware desktop quick-filter rail,
while `FilterPanel` supplies one responsive right-side drawer across desktop,
tablet, and mobile. A quick-filter opens that same drawer at its relevant
domain section, so routes never duplicate filter forms between breakpoints and
keep their existing URL-backed search state and service contracts.
Horizontal cards retain their larger type and richer decision information.
Online-payment capabilities use the shared `payment` semantic icon, mapped to
the credit-card glyph on Web and native. The existing localized payment label
and explicit backend availability check remain unchanged; the generic `shield`
icon stays available for security semantics, not payment-card presentation.

The Web header rail and mobile category menu consume the market-scoped taxonomy
header configuration. Its category selection and `links` (typed
`category_overview` / `promotions` destinations) share ordering, activation,
revision checks, and the protected admin editor. Localized link labels live in
`taxonomy_header_links`, not UI message catalogues. No additional entries are
appended on missing or failed API configuration. The existing category-only SQL
operation remains the atomic inner operation of
`replace_taxonomy_header_navigation`; omitted `links` preserve stored links for
existing API clients, while an explicit empty array removes them.

Every Expo route was audited: home, search, publication, message list and thread,
account overview, alerts, favourites, billing, delivery, digital purchases,
digital selling, notification preferences, login, listing detail, settings, and
account deletion. They use package tokens directly; Button, FormField,
StatePanel, icons, typography, cards, layout, modal/sheet, skeleton, and listing
presentation come from shared packages. Bottom tabs, safe-area screen
composition, native permissions, secure storage, confirmation alerts, and deep
linking remain mobile-specific.

## One-edit propagation proof

`make tokens-check` builds CSS from the canonical token file and verifies every
exported semantic colour reaches generated Web CSS exactly, while the typed
semantic adapter feeds the common iOS/Android source and build-time platform
configuration. It also rejects raw Tailwind palettes, literal colour syntax,
local CSS colour declarations, raw palette APIs, stale generated CSS, and
contrast regressions. Official flag and provider artwork colours are typed,
non-themeable registries from the same source. `make cross-platform-check`
extends the proof through shared package tests, Next compilation, Expo
type-checking/Doctor, and configured iOS and Android compatibility checks.
For Shongre Orange specifically, the token gate checks every semantic binding,
mutates the canonical input in memory to prove propagation, and the brand gate
performs pixel-level comparisons of opaque logo/icon artwork while excluding
antialiased edge blends.

The Web product currently declares `color-scheme: light`. Deliberately dark
cards, overlays, navigation and media scrims use explicit `surface-inverse-*`,
`text-inverse-*`, and `border-inverse-*` roles. A future dark theme must map the
same semantic contract and add browser coverage; it must not reintroduce raw
neutral ramps or component-level overrides.

Run after changing a shared visual or contract:

```bash
make tokens-check
make ui-check
make cross-platform-check
```
