/** Complete owned typography system for programmatic consumers. */
import {
  themeFontFamilies,
  themeFontWeights,
  themeLetterSpacing,
  themeLineHeights,
  themeText,
} from './theme';

export const typography = {
  fonts: themeFontFamilies,
  fontSizes: themeText,
  fontWeights: themeFontWeights,
  lineHeights: themeLineHeights,
  letterSpacing: themeLetterSpacing,
} as const;

export type Typography = typeof typography;
