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
- `packages/brand/src/logos/mark.svg` owns the mark. `npm run assets -w
@shongre/brand` generates Web and Expo icon adapters.
- `packages/ui` owns reusable primitives. `.web.tsx` and `.native.tsx` files
  preserve a common public concept while using semantic HTML or React Native
  primitives as appropriate.
- `packages/features` owns reusable feature presentation and interaction rules.
  Listing cards are the first migrated vertical slice.
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

## Next.js rendering boundary

The App Router owns the server document shell, the single optimized Nunito Sans
Variable loader, route metadata, canonical URLs, robots, sitemap, manifest,
loading, and error states. `frontend/app/layout.tsx` exposes the `next/font`
result as `--font-nunito-sans`; the generated design-token adapter owns
`--font-family-sans` and maps Tailwind's `font-sans` to it. Components inherit
the family and never load or declare an application font independently. The
existing mature marketplace router is mounted behind one client boundary during
the incremental migration. This preserves all routes and allows route metadata
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

Every Expo screen was audited: home, search, publish, messages, account, login,
listing detail, settings, and account deletion. They use package tokens
directly; Button, FormField, StatePanel, icons, typography, cards, layout,
modal/sheet, skeleton, and listing presentation come from shared packages.
Bottom tabs, safe-area screen composition, native permissions, secure storage,
and deep linking remain mobile-specific.

## One-edit propagation proof

`make tokens-check` builds CSS from the canonical token file and verifies the
same primary value reaches generated Web CSS and the native adapter consumed by
the common iOS/Android source. The test is read-only and needs no temporary
source mutation. `make cross-platform-check` extends the proof through shared
package tests, Next compilation, Expo type-checking/Doctor, and configured iOS
and Android compatibility checks.

Run after changing a shared visual or contract:

```bash
make tokens-check
make ui-check
make cross-platform-check
```
