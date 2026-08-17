/**
 * Shongre Design System - Elevation & Shadow Tokens
 * Subtle, warm shadows avoiding unrealistic glowing glassmorphism.
 */

export const shadows = {
  none: 'none',
  xs: '0 1px 2px 0 rgba(28, 25, 23, 0.04)',
  sm: '0 1px 3px 0 rgba(28, 25, 23, 0.06), 0 1px 2px -1px rgba(28, 25, 23, 0.04)',
  card: '0 1px 3px 0 rgba(28, 25, 23, 0.05), 0 1px 2px -1px rgba(28, 25, 23, 0.05)',
  cardHover: '0 8px 20px -4px rgba(28, 25, 23, 0.08), 0 4px 6px -2px rgba(28, 25, 23, 0.03)',
  dropdown: '0 10px 25px -5px rgba(28, 25, 23, 0.1), 0 8px 10px -6px rgba(28, 25, 23, 0.06)',
  modal: '0 25px 50px -12px rgba(28, 25, 23, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(28, 25, 23, 0.05)',
} as const;

export const transitions = {
  fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
  normal: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '350ms cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

export type Shadows = typeof shadows;
export type Transitions = typeof transitions;
