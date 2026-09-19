# @shongre/design-tokens

This package is Shongre's only application design-token system. Official palette
values are generated from the active kit's `08_Design_Tokens/brand-tokens.json`;
change those values only through a new approved kit version and
`npm run brand:activate -- vX.Y.Z`. Add or refine non-brand semantic roles in
`src/theme.ts`, run `make tokens-build`, and validate with `make tokens-check`.

`src/theme.ts` keeps raw colour primitives private and exports only typed
semantic roles. Consumers describe intent (`text-muted`, `surface-inverse`,
`rating-fill`, `staff-surface`) and must never use Tailwind hue ramps, literal
HEX/RGB/HSL/OKLCH values, `white`/`black`, local CSS colour variables, or a raw
palette adapter. Official country flags and external-provider marks are the
only non-themeable colour exception; their typed registries are also derived
from `src/theme.ts` so they do not become a second source.

Shongre Orange is defined once as the generated canonical `brandPalette.orange`.
The private `src/brand-orange.ts` recipe accepts only that swatch. Solid primary,
hover, active, fill, emphasis, inverse accents, and approved orange-category
roles stay identical to the logo. Subtle surfaces, borders, disabled fills,
and shadows vary only its alpha. Filled controls use the logo-white `on-primary`
foreground, exposed natively as `colors.action.onPrimary`; labels on subtle
orange surfaces use the main text foreground. Inverse and danger
controls retain their own foregrounds. Consumers cannot import the recipe or
override an orange shade. The mutation proof in `make tokens-check` changes the
canonical input in memory and verifies every orange role still has exactly
that RGB value, with optional alpha.

Contrast assertions test the exact logo-white/orange pairing. They must not
substitute another foreground or darken the canonical orange. On inverse
surfaces where the canonical swatch is not readable, components use the
existing inverse text or border roles instead of creating a lighter orange.

- Web consumes the generated Tailwind v4 adapter at `@shongre/design-tokens/tokens.css`.
- The Web adapter exposes `--font-family-sans` as the single application-family
  token and maps Tailwind `font-sans` to it; the Next.js root supplies its
  `--font-nunito-sans` value.
- Expo consumes the numeric adapter at `@shongre/design-tokens/native`.
- Native borders, icon strokes, aspect ratios, component bounds, percentages,
  and typography metrics must also come through that adapter; `StyleSheet`
  literals are rejected by the cross-platform UI check.
- Platform applications must not declare competing color, typography, spacing,
  radius, elevation, motion, opacity, breakpoint, or stacking scales.
- `make tokens-check` regenerates and verifies every exported colour, rejects
  palette/literal/named-orange escape hatches across Web and native code, runs
  contrast assertions, and proves the orange derivation graph. CI executes this
  target before the complete repository gate.
