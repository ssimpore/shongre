# Shongre Design System

The Design System is frontend infrastructure. Product routes consume the same
visual, interaction, responsive, and accessibility contracts rather than
recreating controls or page geometry locally.

## Architecture

```text
index.css @theme
  -> tokens/theme.ts (parity-checked programmatic mirror)
  -> primitives
  -> shared components
  -> marketplace patterns
  -> features and layouts
  -> routes
```

`src/index.css` is the rendered source of truth. `tokens/theme.ts` mirrors values
needed by TypeScript, charts, or inline geometry; `tokens.parity.test.ts` fails
if the two drift.

## Layers

- `tokens/`: semantic color, typography, spacing, size, radius, elevation,
  breakpoint, motion, and stacking contracts.
- `primitives/`: generic controls and structure—Button, IconButton, FormField,
  Modal/Drawer, Layout, Typography, Image, DataTable, and interaction helpers.
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
- Elevation uses the warm `shadow-*` ramp plus `dropdown`, `overlay`, and `sticky`.
- Stacking uses `z-raised`, `z-sticky`, `z-dropdown`, `z-popover`, `z-header`,
  `z-drawer`, `z-modal`, `z-toast`, and `z-tooltip`. Numeric z-index is forbidden.
- Responsive behavior follows the explicit `sm`, `md`, `lg`, `xl`, and `2xl`
  breakpoint contract. Container gutters are `px-4 sm:px-6 lg:px-8`.
- Motion uses `duration-fast`, `duration-normal`, or `duration-slow`; the global
  reduced-motion rule applies to every component.

## Accessibility requirements

- Use semantic elements first. Icon-only controls require an accessible name.
- Use FormField to connect labels, descriptions, validation, and errors.
- Use shared Tabs, DropdownMenu, Modal/Drawer, and dialog behavior rather than
  recreating keyboard/focus logic in a feature.
- Interactive state cannot rely on color alone. Preserve focus-visible outlines.
- Controls must meet the 24px WCAG 2.2 AA target floor; primary touch controls
  use `control-touch` (44px).
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
Token parity and contrast are covered by unit tests.

`npm run check:control-metrics` additionally parses JSX controls and rejects
numeric control geometry (`h-8`, `h-10`, `h-11`, `h-12`, fixed 42px composer
controls, and local field radii). `npm run fix:control-metrics` performs the
safe AST-scoped rewrite without touching card, media or layout dimensions.

`UIComponents.tsx` was intentionally removed. Focused shared components now have
individual ownership and exports, preventing another catch-all from becoming a
second design system.
