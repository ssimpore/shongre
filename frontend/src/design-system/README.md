# Shongre Design System

The Design System is frontend infrastructure. Product routes consume the same
visual, interaction, responsive, and accessibility contracts rather than
recreating controls or page geometry locally.

## Architecture

```text
packages/design-tokens/src/theme.ts
  -> generated tokens.css
  -> frontend/index.css (base behaviour and named utilities only)
  -> packages/ui (canonical cross-platform primitives)
  -> frontend thin adapters and web-only compositions
  -> marketplace patterns
  -> features and layouts
  -> routes
```

`packages/design-tokens` is the only authoritative token source. The frontend
imports its generated Tailwind adapter from `src/index.css`; the stylesheet may
define base browser behaviour and named interaction utilities, but it must not
introduce a competing visual scale.

`packages/ui` owns a concept whenever web and native can share its contract.
Files such as `Button.tsx`, `FormField.tsx`, `Modal.tsx`, and `StatePanel.tsx` in
this directory are intentionally thin web adapters: they re-export the shared
implementation or add frontend-only context such as localized copy. Product
features must never fork their visual implementation.

| Semantic role | Canonical owner | Frontend adapter responsibility |
| --- | --- | --- |
| Buttons and icon buttons | `packages/ui/src/primitives` | Re-export only |
| Inputs, selects, checkboxes, switches | `packages/ui/src/forms` | Re-export only |
| Modal and bottom/right drawer | `packages/ui/src/feedback/Modal.web.tsx` | Re-export only |
| Page error/not-found/restricted/offline state | `packages/ui/src/feedback/StatePanel.web.tsx` | Inject localized technical-detail label |
| Tokens, motion, elevation, breakpoints | `packages/design-tokens/src/theme.ts` | Consume generated CSS |

## Layers

- `packages/design-tokens/`: semantic color, typography, spacing, size, radius,
  elevation, breakpoint, motion, and stacking contracts.
- `packages/ui/`: generic cross-platform controls and structure—Button,
  IconButton, FormField, Modal/Drawer, StatePanel, Layout, Typography, and Card.
- `primitives/`: thin adapters plus web-only concepts such as Image, DataTable,
  and interaction helpers that have no shared package implementation yet.
- `components/`: shared product-neutral compositions—Breadcrumbs, feedback,
  Price/Rating, skeleton families, and Tabs.
- marketplace patterns: ListingCard/Rail, GlobalSearchBar, category filters,
  favorites, seller presentation, and result view controls. Their stable files
  currently live beside primitives, but the public barrel classifies them at a
  higher layer and no duplicate implementation exists.
- `app/layouts/`: route shells built from shared page containers and primitives.

Features should import through `src/design-system/index.ts` when using more than
one shared concept. Design System internals import direct files to avoid cycles.

## Variant rules

Visual differences use typed `variant`, `size`, `tone`, `density`, `orientation`,
or `state` props. `createVariants` is the dependency-free recipe utility.
`className` remains a layout escape hatch; it must not redefine the identity of
a primitive.

Create a new shared component only when it is reused, enforces accessibility or
responsive behavior, or represents a stable product pattern. Do not add wrappers
that merely rename a `div`.

## Tokens

- Colors describe roles (`bg-surface`, `text-muted`, `danger-surface`), not hues.
- Typography uses owned numeric steps for dense composition and semantic
  `display-*`, `heading-*`, `body-*`, `label-*`, `caption`, and `overline` roles.
- Spacing follows the owned 4px base; controls, icons, avatars, listing cards,
  and page containers have semantic size tokens.
- Elevation uses the warm `shadow-*` ramp plus `dropdown`, `overlay`, and
  `sticky`. There is no `shadow-card`; a card's elevation is a step on the ramp
  (`xs` at rest, `md` on hover). `overlay-scrim` is the one scrim behind small
  white text on a photo — media counters, gallery controls — and is deliberately
  dark in either theme, so it must not be written as a neutral-ramp shade.
- Media aspect ratios are named: `aspect-media` is the listing-card photo well,
  shared by the card and its loading skeleton so the two cannot drift.
- Stacking uses `z-raised`, `z-sticky`, `z-dropdown`, `z-popover`, `z-header`,
  `z-drawer`, `z-modal`, `z-toast`, and `z-tooltip`. Numeric z-index is forbidden.
- Responsive behavior follows the explicit `sm`, `md`, `lg`, `xl`, and `2xl`
  breakpoint contract. Container gutters are `px-4 sm:px-6 lg:px-8`.
- Motion uses `duration-fast`, `duration-normal`, or `duration-slow`; the global
  reduced-motion rule applies to every component.

## Accessibility requirements

- Use semantic elements first. Icon-only controls require an accessible name.
- Use FormField to connect labels, descriptions, validation, and errors.
- `Button`, `Select` and `DropdownMenu` require an accessible name in the type
  system. A `Select` named by an ancestor — a caller's wrapping `<label>`, or a
  `FormField` that injects the `id` — states that with `labelledByAncestor`
  rather than duplicating the visible text into `aria-label`.
- Listbox and menu surfaces owe the keyboard arrow keys, Home/End, Enter and an
  Escape that returns focus to the trigger. `DropdownMenu` implements that once;
  do not hand-roll a disclosure that only responds to Tab.
- Use shared Tabs, DropdownMenu, Modal/Drawer, and dialog behavior rather than
  recreating keyboard/focus logic in a feature.
- Interactive state cannot rely on color alone. Preserve focus-visible outlines.
- Controls must meet the 24px WCAG 2.2 AA target floor; primary touch controls
  use `control-touch` (44px).
- A shared `Switch` keeps its native checkbox stretched across the whole
  labelled row. Do not replace it with a 1px visually-hidden input: direct
  pointer activation then lands on the descriptive copy instead of the control.
- Loading placeholders are `aria-hidden`; the owning region announces loading.

## Responsive and density strategy

Start with the phone layout and enhance through owned breakpoints. Prefer one
responsive component tree. Dense operational surfaces may use compact controls;
consumer actions use touch or large controls. Wide operational data uses
DataTable's table-to-stacked-row behavior rather than page-level horizontal
overflow.

## Adding UI

1. Reuse a shared component.
2. Compose existing primitives.
3. If the concept is generic and recurring, add a typed primitive/component and
   representative test states.
4. Otherwise keep it feature-specific and build it from the public Design System.

Never start with a custom button, input, card, overlay, raw color, arbitrary
radius/shadow/type size, numeric duration, or numeric z-index.

## Enforcement

`npm run check:design-system` and `npm run lint` validate semantic colors,
declared token names, typography floors, raw hex utilities, arbitrary radii and
shadows, numeric stacking, numeric motion, and arbitrary icon stroke widths.

The declared-token check covers every namespace a project token can live in —
`--color-*`, `--spacing-*`, `--shadow-*`, `--radius-*`, `--container-*` — not
just colour. Tailwind emits nothing for a class whose token is undeclared, so
`shadow-card`, `bg-bg-page` and `h-control-compact` all shipped as inert
classes: real cards with no elevation, and hover transitions animating nothing.

It walks `packages/ui/src` and `packages/features/src` as well as `src`, because
`src/index.css` declares those trees as `@source` and Tailwind compiles them into
the same stylesheet. Keep the `ROOTS` list in step with the `@source` directives:
a violation in `Button.web.tsx` reaches every screen, one in a feature reaches a
single page.

Token parity and contrast are covered by unit tests.

`npm run check:control-metrics` additionally parses JSX controls and rejects
numeric control geometry (`h-8`, `h-10`, `h-11`, `h-12`, fixed 42px composer
controls, and local field radii). `npm run fix:control-metrics` performs the
safe AST-scoped rewrite without touching card, media or layout dimensions.

`UIComponents.tsx` was intentionally removed. Focused shared components now have
individual ownership and exports, preventing another catch-all from becoming a
second design system.
