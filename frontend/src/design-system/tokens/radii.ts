import { themeRadii } from './theme';

/** Semantic aliases over the one parity-checked radius scale. */
export const radii = {
  ...themeRadii,
  none: '0px',
  full: themeRadii.pill,
  button: themeRadii.control,
  input: themeRadii.control,
  modal: themeRadii.overlay,
  badge: themeRadii.pill,
  avatar: themeRadii.pill,
} as const;

/**
 * Calculates nested corner radius based on outer radius and container padding
 * Rule: Inner Radius = Math.max(0, Outer Radius - Padding)
 */
export function calculateNestedRadius(outerRadiusPx: number, paddingPx: number): number {
  return Math.max(0, outerRadiusPx - paddingPx);
}

export type Radii = typeof radii;
