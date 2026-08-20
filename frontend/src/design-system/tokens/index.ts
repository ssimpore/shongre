/**
 * Shongre Design System Tokens
 * Comprehensive design tokens for colors, typography scales, spacing, border radii, shadows, and transitions.
 */

import { colors, type Colors } from './colors';
import { typography, type Typography } from './typography';
import { spacing, type Spacing } from './spacing';
import { radii, calculateNestedRadius, type Radii } from './radii';
import { shadows, transitions, type Shadows, type Transitions } from './shadows';
import {
  theme,
  themeBreakpoints,
  themeContainers,
  themeMotion,
  themeShadows,
  themeSpacing,
  themeZIndex,
  type Theme,
} from './theme';

export {
  colors,
  typography,
  spacing,
  radii,
  shadows,
  transitions,
  calculateNestedRadius,
  theme,
  themeBreakpoints as breakpoints,
  themeContainers as containers,
  themeMotion as motion,
  themeShadows as elevation,
  themeSpacing as sizes,
  themeZIndex as zIndex,
};
export type { Colors, Typography, Spacing, Radii, Shadows, Transitions, Theme };

export const tokens = {
  /**
   * The parity-checked mirror of the `@theme` block in `src/index.css`.
   * Prefer this over the broader palettes below when you need a value that the
   * rendered UI is guaranteed to be using.
   */
  theme,
  colors,
  typography,
  spacing,
  radii,
  shadows,
  transitions,
} as const;

// Backward-compatible alias
export const TOKENS = tokens;

export default tokens;
