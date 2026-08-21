/**
 * Canonical Shongre design-token values.
 *
 * Web CSS and native numeric adapters are generated from these exports. App
 * packages may consume the generated adapters, but must never redefine these
 * values locally.
 */

/** Brand, surface, border, text and semantic status colors. */
export const themeColors = {
  primary: "#C4431F",
  "primary-hover": "#AB3919",
  "primary-active": "#932F13",
  "primary-light": "#FFF3EF",
  "primary-border": "#FED7CC",
  "primary-on-dark": "#F0785A",

  "bg-base": "#FAF8F5",
  "bg-surface": "#FFFFFF",
  "bg-subtle": "#F4F1EA",
  "bg-muted": "#EAE6DD",

  "border-base": "#E8E4DC",
  "border-subtle": "#F0ECE4",
  "border-hover": "#D6D0C5",

  "text-main": "#1C1917",
  "text-secondary": "#57534E",
  "text-muted": "#78716C",
  "text-disabled": "#A8A29E",
  "text-inverse": "#FFFFFF",
  focus: "#C4431F",
  overlay: "rgb(28 25 23 / 0.6)",
  scrollbar: "#D6D3CD",
  "scrollbar-hover": "#A8A29E",
  "stone-50": "#FAFAF9",
  "stone-100": "#F5F5F4",
  "stone-200": "#E7E5E4",
  "stone-300": "#D6D3D1",
  "stone-400": "#A8A29E",
  "stone-500": "#736C66",
  "stone-600": "#57534E",
  "stone-700": "#44403C",
  "stone-800": "#292524",
  "stone-900": "#1C1917",
  "stone-950": "#0C0A09",
  white: "#FFFFFF",
  black: "#000000",

  success: "#15803D",
  "success-surface": "#F0FDF4",
  "success-border": "#BBF7D0",
  warning: "#B45309",
  "warning-surface": "#FFFBEB",
  "warning-border": "#FDE68A",
  danger: "#B91C1C",
  "danger-hover": "#991B1B",
  "danger-active": "#7F1D1D",
  "danger-surface": "#FEF2F2",
  "danger-border": "#FECACA",
  info: "#0369A1",
  "info-surface": "#F0F9FF",
  "info-border": "#BAE6FD",

  "category-vehicles": "#C4431F",
  "category-real-estate": "#0284C7",
  "category-jobs": "#059669",
  "category-multimedia": "#6366F1",
  "category-home-garden": "#D97706",
  "category-fashion": "#DB2777",
  "category-leisure": "#8B5CF6",
  "category-services": "#0D9488",
  "category-tech": "#4F46E5",
  "category-baby": "#EC4899",
  "category-pets": "#EAB308",
  "category-sport": "#EA580C",
  "category-trades": "#DC2626",
  "category-agriculture": "#65A30D",
  "category-neutral": "#57534E",
  "category-neutral-soft": "#78716C",
} as const;

/**
 * Radius scale. Semantics, not decoration:
 * `xl` is the control radius. `card` and `overlay` are the two outer-shell
 * radii — they are named rather than numbered because the shell is a role, and
 * neither 20px nor 28px sits on the numbered scale.
 */
export const themeRadii = {
  xs: "0.125rem",
  sm: "0.25rem",
  md: "0.375rem",
  lg: "0.5rem",
  xl: "0.625rem",
  control: "0.625rem",
  "2xl": "0.875rem",
  "3xl": "1.125rem",
  card: "1.25rem",
  overlay: "1.75rem",
  pill: "9999px",
} as const;

/**
 * Complete owned type scale. Semantic steps are consumed by the Text/Heading
 * primitives; numeric steps preserve the compact marketplace composition.
 */
export const themeText = {
  "card-title": "0.9375rem",
  hero: "2.75rem",
  micro: "0.6875rem",
  xs: "0.75rem",
  sm: "0.875rem",
  base: "1rem",
  lg: "1.125rem",
  xl: "1.25rem",
  "2xl": "1.5rem",
  "3xl": "1.875rem",
  "4xl": "2.25rem",
  "5xl": "3rem",
  "display-lg": "clamp(2.5rem, 5vw, 3.5rem)",
  "display-md": "clamp(2rem, 4vw, 2.75rem)",
  "display-sm": "clamp(1.75rem, 3vw, 2.25rem)",
  "heading-xl": "2.25rem",
  "heading-lg": "1.875rem",
  "heading-md": "1.5rem",
  "heading-sm": "1.25rem",
  "heading-xs": "1rem",
  "body-lg": "1.125rem",
  "body-md": "1rem",
  "body-sm": "0.875rem",
  "label-md": "0.875rem",
  "label-sm": "0.75rem",
  caption: "0.75rem",
  overline: "0.6875rem",
} as const;

export const themeTextLineHeights = {
  "card-title": "1.4",
  hero: "1.08",
  micro: "1.35",
  xs: "1rem",
  sm: "1.25rem",
  base: "1.5rem",
  lg: "1.75rem",
  xl: "1.75rem",
  "2xl": "2rem",
  "3xl": "2.25rem",
  "4xl": "2.5rem",
  "5xl": "1",
  "display-lg": "1.04",
  "display-md": "1.08",
  "display-sm": "1.12",
  "heading-xl": "1.15",
  "heading-lg": "1.2",
  "heading-md": "1.25",
  "heading-sm": "1.3",
  "heading-xs": "1.4",
  "body-lg": "1.625",
  "body-md": "1.5",
  "body-sm": "1.5",
  "label-md": "1.25",
  "label-sm": "1.25",
  caption: "1.4",
  overline: "1.35",
} as const;

export const themeFontFamilies = {
  display:
    "ui-serif, 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, 'Times New Roman', serif",
  sans: "var(--font-inter), 'Inter Variable', Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
} as const;

export const themeFontWeights = {
  normal: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
  extrabold: "800",
  black: "900",
} as const;

export const themeLineHeights = {
  none: "1",
  tight: "1.2",
  snug: "1.35",
  normal: "1.5",
  relaxed: "1.625",
  loose: "1.75",
} as const;

export const themeLetterSpacing = {
  tighter: "-0.035em",
  tight: "-0.015em",
  normal: "0",
  wide: "0.025em",
  wider: "0.05em",
  code: "0.5em",
} as const;

/** Owned 4px spacing base plus semantic component dimensions. */
export const themeSpacing = {
  base: "0.25rem",
  "control-sm": "2rem",
  "control-md": "2.5rem",
  "control-lg": "3rem",
  "control-fab": "3.25rem",
  "control-touch": "2.75rem",
  "control-indicator": "1.125rem",
  "control-target": "1.5rem",
  "select-chevron-size": "0.25rem",
  "select-chevron-offset": "0.75rem",
  /* Fixed width of a card in a horizontal rail. Compact on purpose: a rail is
     scrolled, so showing more inventory per screen is the point. */
  "listing-card": "11.75rem",
  /* Minimum column for the `auto-fill` listing *grids*, which is a different
     problem: at the rail width a 1280px window produced six 188px columns and
     every card truncated its category, city, seller and condition — 27 clipped
     fields on one screen. 15rem gives four to five columns, which is what the
     grid already looked like with the filter sidebar open. */
  "listing-grid-min": "15rem",
  "collection-card": "9.6875rem",
  "collection-card-wide": "11.875rem",
  "recent-search-card": "17rem",
  "recent-search-card-wide": "19rem",
  "recent-search-card-min": "6.5rem",
  "icon-xs": "0.75rem",
  "icon-sm": "0.875rem",
  "icon-md": "1rem",
  "icon-lg": "1.25rem",
  "icon-nav": "1.375rem",
  "icon-xl": "1.5rem",
  "avatar-sm": "1.75rem",
  "avatar-md": "2.5rem",
  "avatar-lg": "3rem",
  "avatar-xl": "4rem",
  "avatar-2xl": "8rem",
} as const;

/** Semantic 4px spacing scale shared by CSS utilities and React Native. */
export const themeSpaceScale = {
  none: "0rem",
  xs: "0.25rem",
  sm: "0.5rem",
  md: "0.75rem",
  lg: "1rem",
  xl: "1.5rem",
  "2xl": "2rem",
  "3xl": "3rem",
  "4xl": "4rem",
} as const;

/** Shared control heights so a form row never mixes 36/38/40px controls. */
export const themeControlSizes = {
  "control-sm": themeSpacing["control-sm"],
  "control-md": themeSpacing["control-md"],
  "control-lg": themeSpacing["control-lg"],
  "control-touch": themeSpacing["control-touch"],
} as const;

/** Page shell widths. */
export const themeContainers = {
  task: "56rem",
  content: "72rem",
  page: "80rem",
  workspace: "96rem",
} as const;

export const themeBreakpoints = {
  sm: "40rem",
  md: "48rem",
  lg: "64rem",
  xl: "80rem",
  "2xl": "96rem",
} as const;

export const themeShadows = {
  "2xs": "0 1px rgb(28 25 23 / 0.04)",
  xs: "0 1px 2px rgb(28 25 23 / 0.05)",
  sm: "0 1px 3px rgb(28 25 23 / 0.08), 0 1px 2px -1px rgb(28 25 23 / 0.05)",
  md: "0 6px 14px -5px rgb(28 25 23 / 0.12), 0 2px 5px -2px rgb(28 25 23 / 0.06)",
  lg: "0 12px 28px -8px rgb(28 25 23 / 0.16), 0 4px 8px -4px rgb(28 25 23 / 0.08)",
  dropdown:
    "0 14px 32px -8px rgb(28 25 23 / 0.18), 0 6px 12px -6px rgb(28 25 23 / 0.1)",
  overlay: "0 28px 56px -16px rgb(28 25 23 / 0.3)",
  sticky: "0 -4px 20px -10px rgb(28 25 23 / 0.1)",
} as const;

/** Stacking values are consumed through semantic @utility classes in index.css. */
export const themeZIndex = {
  base: 0,
  raised: 10,
  sticky: 20,
  dropdown: 30,
  popover: 35,
  header: 40,
  drawer: 45,
  modal: 50,
  toast: 60,
  tooltip: 70,
} as const;

/** Motion vocabulary. */
export const themeMotion = {
  "ease-standard": "cubic-bezier(0.4, 0, 0.2, 1)",
  "ease-out-soft": "cubic-bezier(0.16, 1, 0.3, 1)",
  "duration-fast": "150ms",
  "duration-normal": "250ms",
  "duration-slow": "350ms",
} as const;

export const themeOpacity = {
  disabled: 0.45,
  pressed: 0.78,
  muted: 0.7,
  scrim: 0.6,
} as const;

export const themeBorders = {
  hairline: "1px",
  strong: "2px",
} as const;

export const themeInteraction = {
  focusRingWidth: "2px",
  focusRingOffset: "2px",
  pressScale: 0.95,
  minimumTouchTarget: themeSpacing["control-touch"],
} as const;

export const theme = {
  colors: themeColors,
  radii: themeRadii,
  text: themeText,
  textLineHeights: themeTextLineHeights,
  fonts: themeFontFamilies,
  fontWeights: themeFontWeights,
  lineHeights: themeLineHeights,
  letterSpacing: themeLetterSpacing,
  spacing: themeSpacing,
  space: themeSpaceScale,
  controlSizes: themeControlSizes,
  containers: themeContainers,
  breakpoints: themeBreakpoints,
  shadows: themeShadows,
  motion: themeMotion,
  zIndex: themeZIndex,
  opacity: themeOpacity,
  borders: themeBorders,
  interaction: themeInteraction,
} as const;

export type Theme = typeof theme;
