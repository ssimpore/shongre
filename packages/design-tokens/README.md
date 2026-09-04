# @shongre/design-tokens

This package is Shongre's only authoritative visual-token source. Change
`src/theme.ts`, run `make tokens-build`, and validate with `make tokens-check`.

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
