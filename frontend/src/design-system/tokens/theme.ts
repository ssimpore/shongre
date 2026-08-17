/**
 * Shongre Design System — canonical theme mirror.
 *
 * `src/index.css` (the Tailwind v4 `@theme` block) is the source of truth: it is
 * what actually generates the utility classes the UI is built from. This file
 * mirrors that block so TypeScript code (charts, canvas, inline styles, tests)
 * can read the same values without duplicating literals in components.
 *
 * `tokens.parity.test.ts` parses index.css and fails if the two ever drift, so
 * this stays a mirror rather than becoming a second, competing design system.
 *
 * To change a value: edit `src/index.css` first, then update this file.
 */

/** Brand, surface, border, text and semantic status colors. */
export const themeColors = {
  primary: '#C4431F',
  'primary-hover': '#AB3919',
  'primary-active': '#932F13',
  'primary-light': '#FFF3EF',
  'primary-border': '#FED7CC',
  'primary-on-dark': '#F0785A',

  'bg-base': '#FAF8F5',
  'bg-surface': '#FFFFFF',
  'bg-subtle': '#F4F1EA',
  'bg-muted': '#EAE6DD',

  'border-base': '#E8E4DC',
  'border-subtle': '#F0ECE4',
  'border-hover': '#D6D0C5',

  'text-main': '#1C1917',
  'text-secondary': '#57534E',
  'text-muted': '#78716C',
  'stone-900': '#1C1917',

  success: '#15803D',
  'success-surface': '#F0FDF4',
  'success-border': '#BBF7D0',
  warning: '#B45309',
  'warning-surface': '#FFFBEB',
  'warning-border': '#FDE68A',
  danger: '#B91C1C',
  'danger-surface': '#FEF2F2',
  'danger-border': '#FECACA',
  info: '#0369A1',
  'info-surface': '#F0F9FF',
  'info-border': '#BAE6FD',
} as const;

/**
 * Radius scale. Semantics, not decoration:
 * `xl` is the control radius, `2xl` the card radius, `3xl` the overlay radius.
 */
export const themeRadii = {
  xs: '0.125rem',
  sm: '0.25rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.625rem',
  '2xl': '0.875rem',
  '3xl': '1.125rem',
  pill: '9999px',
} as const;

/** Smallest type size allowed in the product — badges and dense metadata only. */
export const themeText = {
  micro: '0.6875rem',
} as const;

/** Shared control heights so a form row never mixes 36/38/40px controls. */
export const themeControlSizes = {
  'control-sm': '2rem',
  'control-md': '2.5rem',
  'control-lg': '3rem',
} as const;

/** Page shell widths. */
export const themeContainers = {
  content: '72rem',
  page: '80rem',
  workspace: '96rem',
} as const;

/** Motion vocabulary. */
export const themeMotion = {
  'ease-standard': 'cubic-bezier(0.4, 0, 0.2, 1)',
  'ease-out-soft': 'cubic-bezier(0.16, 1, 0.3, 1)',
  'duration-fast': '150ms',
  'duration-normal': '250ms',
  'duration-slow': '350ms',
} as const;

export const theme = {
  colors: themeColors,
  radii: themeRadii,
  text: themeText,
  controlSizes: themeControlSizes,
  containers: themeContainers,
  motion: themeMotion,
} as const;

export type Theme = typeof theme;
