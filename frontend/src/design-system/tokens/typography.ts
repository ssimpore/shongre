/**
 * Shongre Design System - Typography Tokens
 * Defines font families, sizes, weights, line heights, and presets adhering to strict hierarchy and readability.
 */

export const typography = {
  fonts: {
    display: "'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },

  // Font Sizes with exact rem values and pixel equivalents
  fontSizes: {
    '2xs': '0.625rem', // 10px
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',      // 16px (baseline body)
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',   // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem',  // 36px
    '5xl': '3rem',     // 48px
  },

  // Line Heights
  lineHeights: {
    none: '1',
    tight: '1.2',
    snug: '1.35',
    normal: '1.5',
    relaxed: '1.625',
    loose: '1.75',
  },

  // Font Weights
  fontWeights: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },

  // Letter Spacing
  letterSpacing: {
    tighter: '-0.035em',
    tight: '-0.015em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
  },

  // High-level typographic presets
  presets: {
    h1: {
      fontSize: '2.25rem',
      lineHeight: '1.2',
      fontWeight: '800',
      letterSpacing: '-0.03em',
    },
    h2: {
      fontSize: '1.5rem',
      lineHeight: '1.3',
      fontWeight: '700',
      letterSpacing: '-0.02em',
    },
    h3: {
      fontSize: '1.25rem',
      lineHeight: '1.35',
      fontWeight: '700',
      letterSpacing: '-0.015em',
    },
    h4: {
      fontSize: '1rem',
      lineHeight: '1.4',
      fontWeight: '600',
      letterSpacing: '-0.01em',
    },
    bodyLarge: {
      fontSize: '1.125rem',
      lineHeight: '1.6',
      fontWeight: '400',
    },
    body: {
      fontSize: '1rem',
      lineHeight: '1.6',
      fontWeight: '400',
    },
    bodySmall: {
      fontSize: '0.875rem',
      lineHeight: '1.5',
      fontWeight: '400',
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: '1.4',
      fontWeight: '500',
    },
    priceHero: {
      fontSize: '1.875rem',
      lineHeight: '1.1',
      fontWeight: '900',
      letterSpacing: '-0.03em',
    },
  },
} as const;

export type Typography = typeof typography;
