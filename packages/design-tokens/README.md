# @shongre/design-tokens

This package is Shongre's only authoritative visual-token source. Change
`src/theme.ts`, run `make tokens-build`, and validate with `make tokens-check`.

- Web consumes the generated Tailwind v4 adapter at `@shongre/design-tokens/tokens.css`.
- The Web adapter exposes `--font-family-sans` as the single application-family
  token and maps Tailwind `font-sans` to it; the Next.js root supplies its
  `--font-nunito-sans` value.
- Expo consumes the numeric adapter at `@shongre/design-tokens/native`.
- Platform applications must not declare competing color, typography, spacing,
  radius, elevation, motion, opacity, breakpoint, or stacking scales.
