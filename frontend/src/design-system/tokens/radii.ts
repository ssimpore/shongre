/**
 * Shongre Design System - Border Radius Tokens
 * Balanced border-radii designed to prevent "AI slop" bubbles while ensuring smooth modern curves.
 */

/**
 * Mirrors the `--radius-*` scale in `src/index.css`, which is what actually
 * generates the `rounded-*` utilities. Kept in step by `tokens.parity.test.ts`.
 */
export const radii = {
  none: '0px',
  xs: '0.125rem',   // 2px
  sm: '0.25rem',    // 4px
  md: '0.375rem',   // 6px  - chips, inline tags
  lg: '0.5rem',     // 8px  - small surfaces
  xl: '0.625rem',   // 10px - buttons, inputs, icon buttons
  '2xl': '0.875rem', // 14px - inner panels, media wells
  '3xl': '1.125rem', // 18px - large inner surfaces
  full: '9999px',   // Pill tags, avatar circles

  // Semantic mappings. `button`/`input` alias numbered steps; `card` and
  // `modal` are the two outer-shell radii and carry their own values, because
  // 20px and 28px are not steps on the numbered scale.
  button: '0.625rem', // = xl
  input: '0.625rem',  // = xl
  card: '1.25rem',    // = card shell
  modal: '1.75rem',   // = overlay shell
  badge: '9999px',    // pill
  avatar: '9999px',
} as const;

/**
 * Calculates nested corner radius based on outer radius and container padding
 * Rule: Inner Radius = Math.max(0, Outer Radius - Padding)
 */
export function calculateNestedRadius(outerRadiusPx: number, paddingPx: number): number {
  return Math.max(0, outerRadiusPx - paddingPx);
}

export type Radii = typeof radii;
