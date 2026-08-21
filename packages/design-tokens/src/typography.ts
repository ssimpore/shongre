import {
  themeFontFamilies,
  themeFontWeights,
  themeLetterSpacing,
  themeLineHeights,
  themeText,
  themeTextLineHeights,
} from "./theme";

export const typography = {
  fontFamilies: themeFontFamilies,
  fontSizes: themeText,
  fontWeights: themeFontWeights,
  lineHeights: themeLineHeights,
  textLineHeights: themeTextLineHeights,
  letterSpacing: themeLetterSpacing,
} as const;

export type Typography = typeof typography;
