# @shongre/design-tokens

This package is Shongre's only authoritative visual-token source. Change
`src/theme.ts`, run `make tokens-build`, and validate with `make tokens-check`.

- Web consumes the generated Tailwind v4 adapter at `@shongre/design-tokens/tokens.css`.
- Expo consumes the numeric adapter at `@shongre/design-tokens/native`.
- Platform applications must not declare competing color, typography, spacing,
  radius, elevation, motion, opacity, breakpoint, or stacking scales.
