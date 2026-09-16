import { brandPalette } from "./brand.generated.js";
import { deriveShongreOrangeTokens, mixHex } from "#brand-orange";

/**
 * Canonical Shongre design-token values.
 *
 * Web CSS and native numeric adapters are generated from these exports. App
 * packages may consume the generated adapters, but must never redefine these
 * values locally.
 */

/**
 * Private colour primitives. These values exist only so semantic roles can
 * preserve the established visual language without exposing hue/shade ramps to
 * application code. `themeColors` below is the only public Web/native colour
 * contract.
 */
const colorPrimitives = {
  neutral50: "#FAFAF9",
  neutral100: "#F5F5F4",
  neutral200: "#E7E5E4",
  neutral300: "#D6D3D1",
  neutral400: "#A8A29E",
  neutral500: "#736C66",
  neutral600: "#57534E",
  neutral700: "#44403C",
  neutral800: "#292524",
  neutral950: "#0C0A09",
  black: "#000000",
  transparent: "transparent",
  amber50: "oklch(98.7% 0.022 95.277)",
  amber400: "oklch(82.8% 0.189 84.429)",
  amber500: "oklch(76.9% 0.188 70.08)",
  amber600: "oklch(66.6% 0.179 58.318)",
  amber700: "oklch(55.5% 0.163 48.998)",
  amber900: "oklch(41.4% 0.112 45.904)",
  amber950: "oklch(27.9% 0.077 45.635)",
  blue200: "oklch(88.2% 0.059 254.128)",
  blue400: "oklch(70.7% 0.165 254.624)",
  cyan50: "oklch(98.4% 0.019 200.873)",
  cyan200: "oklch(91.7% 0.08 205.041)",
  cyan500: "oklch(71.5% 0.143 215.221)",
  cyan700: "oklch(52% 0.105 223.128)",
  emerald50: "oklch(97.9% 0.021 166.113)",
  emerald100: "oklch(95% 0.052 163.051)",
  emerald200: "oklch(90.5% 0.093 164.15)",
  emerald300: "oklch(84.5% 0.143 164.978)",
  emerald400: "oklch(76.5% 0.177 163.223)",
  emerald700: "oklch(50.8% 0.118 165.612)",
  emerald900: "oklch(37.8% 0.077 168.94)",
  emerald950: "oklch(26.2% 0.051 172.552)",
  fuchsia50: "oklch(97.7% 0.017 320.058)",
  fuchsia100: "oklch(95.2% 0.037 318.852)",
  fuchsia200: "oklch(90.3% 0.076 319.62)",
  fuchsia300: "oklch(83.3% 0.145 321.434)",
  fuchsia600: "oklch(59.1% 0.293 322.896)",
  fuchsia700: "oklch(51.8% 0.253 323.949)",
  fuchsia900: "oklch(40.1% 0.17 325.612)",
  indigo50: "oklch(96.2% 0.018 272.314)",
  indigo100: "oklch(93% 0.034 272.788)",
  indigo200: "oklch(87% 0.065 274.039)",
  indigo300: "oklch(78.5% 0.115 274.713)",
  indigo500: "oklch(58.5% 0.233 277.117)",
  indigo600: "oklch(51.1% 0.262 276.966)",
  indigo700: "oklch(45.7% 0.24 277.023)",
  indigo900: "oklch(35.9% 0.144 278.697)",
  lime50: "oklch(98.6% 0.031 120.757)",
  lime200: "oklch(93.8% 0.127 124.321)",
  lime500: "oklch(76.8% 0.233 130.85)",
  lime700: "oklch(53.2% 0.157 131.589)",
  pink50: "oklch(97.1% 0.014 343.198)",
  pink200: "oklch(89.9% 0.061 343.231)",
  pink600: "oklch(59.2% 0.249 0.584)",
  pink700: "oklch(52.5% 0.223 3.958)",
  purple50: "oklch(97.7% 0.014 308.299)",
  purple100: "oklch(94.6% 0.033 307.174)",
  purple200: "oklch(90.2% 0.063 306.703)",
  purple400: "oklch(71.4% 0.203 305.504)",
  purple600: "oklch(55.8% 0.288 302.321)",
  purple700: "oklch(49.6% 0.265 301.924)",
  purple800: "oklch(43.8% 0.218 303.724)",
  purple950: "oklch(29.1% 0.149 302.717)",
  red200: "oklch(88.5% 0.062 18.334)",
  red300: "oklch(80.8% 0.114 19.571)",
  red400: "oklch(70.4% 0.191 22.216)",
  red700: "oklch(50.5% 0.213 27.518)",
  red900: "oklch(39.6% 0.141 25.723)",
  red950: "oklch(25.8% 0.092 26.042)",
  rose100: "oklch(94.1% 0.03 12.58)",
  rose300: "oklch(81% 0.117 11.638)",
  rose400: "oklch(71.2% 0.194 13.428)",
  rose700: "oklch(51.4% 0.222 16.935)",
  rose800: "oklch(45.5% 0.188 13.697)",
  rose900: "oklch(41% 0.159 10.272)",
  rose950: "oklch(27.1% 0.105 12.094)",
  sky400: "oklch(74.6% 0.16 232.661)",
  teal50: "oklch(98.4% 0.014 180.72)",
  teal100: "oklch(95.3% 0.051 180.801)",
  teal200: "oklch(91% 0.096 180.426)",
  teal300: "oklch(85.5% 0.138 181.071)",
  teal700: "oklch(51.1% 0.096 186.391)",
  teal800: "oklch(43.7% 0.078 188.216)",
  teal900: "oklch(38.6% 0.063 188.416)",
  violet50: "oklch(96.9% 0.016 293.756)",
  violet100: "oklch(94.3% 0.029 294.588)",
  violet200: "oklch(89.4% 0.057 293.283)",
  violet300: "oklch(81.1% 0.111 293.571)",
  violet600: "oklch(54.1% 0.281 293.009)",
  violet700: "oklch(49.1% 0.27 292.581)",
  violet800: "oklch(43.2% 0.232 292.759)",
  violet900: "oklch(38% 0.189 293.745)",
  violet950: "oklch(28.3% 0.141 291.089)",
  yellow400: "oklch(85.2% 0.199 91.936)",
  yellow500: "oklch(79.5% 0.184 86.047)",
} as const;

const themeBrandOrange = deriveShongreOrangeTokens(brandPalette.orange);

// Dark chrome shares the official ink, with distinct layers and control states.
const inversePalette = {
  muted: mixHex(brandPalette.ink, brandPalette.white, 0.16),
  hover: mixHex(brandPalette.ink, brandPalette.white, 0.08),
  deep: mixHex(brandPalette.ink, colorPrimitives.black, 0.45),
  border: mixHex(brandPalette.ink, brandPalette.white, 0.36),
  textBright: mixHex(brandPalette.ink, brandPalette.white, 0.98),
  textSoft: mixHex(brandPalette.ink, brandPalette.white, 0.95),
  textFaint: mixHex(brandPalette.ink, brandPalette.white, 0.9),
  textMuted: mixHex(brandPalette.ink, brandPalette.white, 0.8),
  textSubtle: mixHex(brandPalette.ink, brandPalette.white, 0.65),
} as const;

/** Brand, surface, border, text and semantic status colours. */
export const themeColors = {
  "brand-primary": themeBrandOrange.canonical,
  "brand-ink": brandPalette.ink,
  "brand-background": brandPalette.white,
  "brand-surface-subtle": brandPalette.mist,

  /*
   * Solid controls and orange-on-light text draw from the readable ramp, not
   * the canonical swatch. The logo is an image asset and `brand-primary` below
   * keeps the exact swatch, so nothing about the mark changes — but the
   * canonical orange is 2.95:1 against white in both directions, which made
   * every primary CTA and every card price fail WCAG AA. Orange on *dark*
   * grounds is the opposite problem and keeps the canonical swatch via
   * `primary-on-dark`, where it already measures ~6:1.
   */
  primary: themeBrandOrange.interactive,
  "on-primary": brandPalette.white,
  "primary-hover": themeBrandOrange.hover,
  "primary-active": themeBrandOrange.active,
  "primary-disabled": themeBrandOrange.disabled,
  "primary-disabled-border": themeBrandOrange.disabledBorder,
  /* Subtle surfaces retain the canonical orange with token-owned alpha. */
  "primary-light": themeBrandOrange.light,
  "primary-surface-faint": themeBrandOrange.surfaceFaint,
  "primary-surface-soft": themeBrandOrange.surfaceSoft,
  "primary-surface": themeBrandOrange.surface,
  "primary-surface-selected": themeBrandOrange.surfaceSelected,
  "primary-surface-strong": themeBrandOrange.surfaceStrong,
  "primary-border": themeBrandOrange.border,
  "primary-border-soft": themeBrandOrange.borderSoft,
  "primary-border-strong": themeBrandOrange.borderStrong,
  "primary-ring": themeBrandOrange.ring,
  "primary-ring-strong": themeBrandOrange.ringStrong,
  "primary-shadow": themeBrandOrange.shadow,
  "primary-shadow-strong": themeBrandOrange.shadowStrong,
  "primary-overlay": themeBrandOrange.overlay,
  "primary-on-dark": themeBrandOrange.onDark,
  "primary-on-dark-ring": themeBrandOrange.onDarkRing,
  "primary-on-dark-border": themeBrandOrange.onDarkBorder,

  "bg-base": brandPalette.white,
  "bg-surface": brandPalette.white,
  "bg-subtle": brandPalette.mist,
  "bg-muted": "#EEF1F5",
  "surface-soft": colorPrimitives.neutral50,
  "surface-muted": colorPrimitives.neutral100,
  "surface-disabled": colorPrimitives.neutral200,
  "surface-selected": colorPrimitives.neutral300,
  "surface-strong": colorPrimitives.neutral400,
  "surface-neutral": colorPrimitives.neutral500,
  "surface-inverse-muted": inversePalette.muted,
  "surface-inverse-hover": inversePalette.hover,
  "surface-inverse": brandPalette.ink,
  "surface-inverse-deep": inversePalette.deep,
  "surface-overlay-deep": colorPrimitives.black,

  "border-base": brandPalette.border,
  "border-subtle": "#E8EBF0",
  "border-hover": "#B9C0CC",
  "border-soft": colorPrimitives.neutral100,
  "border-disabled": colorPrimitives.neutral200,
  "border-prominent": colorPrimitives.neutral300,
  "border-strong": colorPrimitives.neutral400,
  "border-neutral": colorPrimitives.neutral500,
  "border-inverse-muted": inversePalette.border,
  "border-inverse-subtle": inversePalette.muted,
  "border-inverse": inversePalette.hover,
  "border-inverse-strong": brandPalette.ink,
  "border-on-inverse": brandPalette.white,

  "text-main": brandPalette.ink,
  "text-secondary": "#3E485A",
  /* Muted body copy has to clear WCAG AA (4.5:1) on every surface token it can
     sit on, not just `bg-surface`. The previous #78716C reached 4.79:1 on white
     but only 4.25:1 on `bg-subtle` and 4.10:1 on `bg-muted`, so every muted
     caption, table header and breadcrumb on a tinted panel was a failure — the
     audit found them on the property detail, teacher profile, course table,
     admin market and CRM prospecting surfaces. This value clears 4.5:1 against
     `bg-surface`, `bg-base`, `bg-subtle` and `bg-muted` alike; the contrast
     assertion in `check-design-tokens.mjs` keeps it that way. */
  "text-muted": brandPalette.muted,
  "text-disabled": "#8A93A3",
  "text-tertiary": colorPrimitives.neutral500,
  "text-supporting": colorPrimitives.neutral600,
  "text-emphasis": colorPrimitives.neutral700,
  "text-strong": colorPrimitives.neutral800,
  "text-deep": colorPrimitives.neutral950,
  "text-inverse": brandPalette.white,
  "text-inverse-bright": inversePalette.textBright,
  "text-inverse-soft": inversePalette.textSoft,
  "text-inverse-faint": inversePalette.textFaint,
  "text-inverse-muted": inversePalette.textMuted,
  "text-inverse-subtle": inversePalette.textSubtle,
  focus: themeBrandOrange.interactive,
  overlay: "rgb(28 25 23 / 0.6)",
  /* The scrim behind small white text sitting directly on a photo — media
     counters, carousel controls, gallery pills. Denser than `overlay` (the
     modal backdrop) because it has to carry 11px type at any photo brightness.
     Named rather than written as `bg-stone-900/70` at each call site: those
     surfaces are deliberately dark in *either* theme, so they must not follow
     the neutral ramp when a dark theme inverts it. Ten different ad-hoc values
     were in use for this one role before it had a name. */
  "overlay-scrim": "rgb(28 25 23 / 0.7)",
  scrollbar: "#D6D3CD",
  "scrollbar-hover": "#A8A29E",
  transparent: colorPrimitives.transparent,

  /* Accent identities. These names communicate product meaning and are safe
     for components; no public token exposes a Tailwind hue or shade. */
  "rating-surface": colorPrimitives.amber50,
  "rating-fill": colorPrimitives.amber400,
  "rating-strong": colorPrimitives.amber500,
  "rating-emphasis": colorPrimitives.amber600,
  "rating-border": colorPrimitives.amber700,
  "rating-inverse": colorPrimitives.amber900,
  "rating-inverse-deep": colorPrimitives.amber950,
  "communication-surface": colorPrimitives.cyan50,
  "communication-border": colorPrimitives.cyan200,
  "communication-fill": colorPrimitives.cyan500,
  communication: colorPrimitives.cyan700,
  "campaign-surface": colorPrimitives.fuchsia50,
  "campaign-surface-strong": colorPrimitives.fuchsia100,
  "campaign-border": colorPrimitives.fuchsia200,
  "campaign-border-strong": colorPrimitives.fuchsia300,
  campaign: colorPrimitives.fuchsia600,
  "campaign-strong": colorPrimitives.fuchsia700,
  "campaign-emphasis": colorPrimitives.fuchsia900,
  "insight-surface": colorPrimitives.indigo50,
  "insight-surface-strong": colorPrimitives.indigo100,
  "insight-border": colorPrimitives.indigo200,
  "insight-border-strong": colorPrimitives.indigo300,
  "insight-highlight": colorPrimitives.indigo500,
  insight: colorPrimitives.indigo600,
  "insight-strong": colorPrimitives.indigo700,
  "insight-emphasis": colorPrimitives.indigo900,
  "sustainability-surface": colorPrimitives.lime50,
  "sustainability-border": colorPrimitives.lime200,
  "sustainability-fill": colorPrimitives.lime500,
  sustainability: colorPrimitives.lime700,
  "community-surface": colorPrimitives.pink50,
  "community-border": colorPrimitives.pink200,
  community: colorPrimitives.pink600,
  "community-strong": colorPrimitives.pink700,
  "automation-surface": colorPrimitives.purple50,
  "automation-surface-strong": colorPrimitives.purple100,
  "automation-border": colorPrimitives.purple200,
  "automation-border-strong": colorPrimitives.purple400,
  "automation-on-inverse": colorPrimitives.purple400,
  automation: colorPrimitives.purple600,
  "automation-strong": colorPrimitives.purple700,
  "automation-emphasis": colorPrimitives.purple800,
  "automation-inverse-deep": colorPrimitives.purple950,
  "connection-surface": colorPrimitives.teal50,
  "connection-surface-strong": colorPrimitives.teal100,
  "connection-border": colorPrimitives.teal200,
  "connection-border-strong": colorPrimitives.teal300,
  connection: colorPrimitives.teal700,
  "connection-strong": colorPrimitives.teal800,
  "connection-emphasis": colorPrimitives.teal900,
  "staff-surface": colorPrimitives.violet50,
  "staff-surface-strong": colorPrimitives.violet100,
  "staff-border-subtle": colorPrimitives.violet100,
  "staff-border": colorPrimitives.violet200,
  "staff-border-strong": colorPrimitives.violet300,
  "staff-on-inverse": colorPrimitives.violet300,
  staff: colorPrimitives.violet600,
  "staff-strong": colorPrimitives.violet700,
  "staff-emphasis": colorPrimitives.violet800,
  "staff-inverse": colorPrimitives.violet900,
  "staff-inverse-deep": colorPrimitives.violet950,

  success: "#15803D",
  "success-surface": "#F0FDF4",
  "success-border": "#BBF7D0",
  "success-surface-highlight": colorPrimitives.emerald200,
  "success-on-inverse-soft": colorPrimitives.emerald50,
  "success-on-inverse": colorPrimitives.emerald100,
  "success-on-inverse-muted": colorPrimitives.emerald200,
  "success-on-inverse-strong": colorPrimitives.emerald300,
  "success-on-inverse-vivid": colorPrimitives.emerald400,
  "success-strong": colorPrimitives.emerald700,
  "success-inverse": colorPrimitives.emerald900,
  "success-inverse-deep": colorPrimitives.emerald950,
  warning: "#B45309",
  "warning-hover": "#92400E",
  "warning-active": "#78350F",
  "warning-surface": "#FFFBEB",
  "warning-border": "#FDE68A",
  danger: "#B91C1C",
  "danger-hover": "#991B1B",
  "danger-active": "#7F1D1D",
  "danger-surface": "#FEF2F2",
  "danger-border": "#FECACA",
  "danger-on-inverse-muted": colorPrimitives.red200,
  "danger-on-inverse-strong": colorPrimitives.red300,
  "danger-on-inverse-vivid": colorPrimitives.red400,
  "danger-border-strong": colorPrimitives.red700,
  "danger-inverse": colorPrimitives.red900,
  "danger-inverse-deep": colorPrimitives.red950,
  "critical-surface": colorPrimitives.rose100,
  "critical-on-inverse": colorPrimitives.rose100,
  "critical-on-inverse-strong": colorPrimitives.rose300,
  "critical-on-inverse-vivid": colorPrimitives.rose400,
  critical: colorPrimitives.rose700,
  "critical-border": colorPrimitives.rose700,
  "critical-border-strong": colorPrimitives.rose800,
  "critical-inverse": colorPrimitives.rose900,
  "critical-inverse-deep": colorPrimitives.rose950,
  info: "#0369A1",
  "info-surface": "#F0F9FF",
  "info-border": "#BAE6FD",
  "info-surface-highlight": colorPrimitives.blue200,
  "info-highlight": colorPrimitives.blue400,
  "info-on-inverse": colorPrimitives.sky400,

  "primary-on-inverse-soft": themeBrandOrange.onInverseSoft,
  "primary-on-inverse-muted": themeBrandOrange.onInverseMuted,
  "primary-fill": themeBrandOrange.fill,
  "primary-emphasis": themeBrandOrange.emphasis,
  "rating-fill-bright": colorPrimitives.yellow400,
  "rating-strong-bright": colorPrimitives.yellow500,

  "category-vehicles": themeBrandOrange.interactive,
  "category-real-estate": "#0284C7",
  "category-jobs": "#059669",
  "category-multimedia": "#6366F1",
  "category-home-garden": themeBrandOrange.canonical,
  "category-fashion": "#DB2777",
  "category-leisure": "#8B5CF6",
  "category-services": "#0D9488",
  "category-tech": "#4F46E5",
  "category-baby": "#EC4899",
  "category-pets": "#EAB308",
  "category-sport": themeBrandOrange.fill,
  "category-trades": "#DC2626",
  "category-agriculture": "#65A30D",
  "category-neutral": "#57534E",
  "category-neutral-soft": "#78716C",
} as const;

export type ThemeColorToken = keyof typeof themeColors;

/**
 * Official artwork colours are typed exceptions, not themeable UI tokens.
 * They live in this canonical source so flags and provider marks do not create
 * independent literal palettes elsewhere in the repository.
 */
export const themeOfficialCountryFlagColors = {
  france: { blue: "#0055A4", white: brandPalette.white, red: "#EF4135" },
  belgium: { black: "#2D2926", yellow: "#FFCD00", red: "#C8102E" },
  germany: { black: colorPrimitives.black, red: "#DD0000", yellow: "#FFCE00" },
  spain: { red: "#AA151B", yellow: "#F1BF00" },
  unitedKingdom: { blue: "#012169", white: brandPalette.white, red: "#C8102E" },
  italy: { green: "#009246", white: brandPalette.white, red: "#CE2B37" },
  netherlands: { red: "#AE1C28", white: brandPalette.white, blue: "#21468B" },
  switzerland: { red: "#D52B1E", white: brandPalette.white },
  luxembourg: { red: "#EF3340", white: brandPalette.white, blue: "#00A3E0" },
  senegal: { green: "#00853F", yellow: "#FDEF42", red: "#E31B23" },
  burkinaFaso: { red: "#EF2B2D", green: "#009E49", yellow: "#FCD116" },
} as const;

export const themeOfficialProviderColors = {
  google: {
    blue: "#4285F4",
    green: "#34A853",
    yellow: "#FBBC05",
    red: "#EA4335",
  },
  facebook: { blue: "#1877F2", white: brandPalette.white },
} as const;

/**
 * Radius scale. Semantics, not decoration:
 * `xl` is the control radius. `listing-card`, `card`, and `overlay` are
 * outer-shell radii named for their semantic roles rather than their size.
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
  "listing-card": "0.625rem",
  card: "1.25rem",
  overlay: "1.75rem",
  pill: "9999px",
} as const;

/**
 * Complete owned type scale. Semantic steps are consumed by the Text/Heading
 * primitives; numeric steps preserve the compact marketplace composition.
 */
export const themeText = {
  "card-title": "1rem",
  "card-price": "1.5rem",
  hero: "clamp(2.25rem, 3.75vw, 3rem)",
  "home-hero-wide": "4rem",
  micro: "0.75rem",
  xs: "0.8125rem",
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
  "card-price": "1.25",
  hero: "1.06",
  "home-hero-wide": "1.02",
  micro: "1rem",
  xs: "1.125rem",
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
  sans: "var(--font-nunito-sans, 'Nunito Sans'), Helvetica, Arial, sans-serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
} as const;

export const themeFontWeights = {
  normal: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
  extrabold: "800",
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
  "surface-lift": "0.125rem",
  "control-sm": "2rem",
  /* Favorite controls keep this painted size on touch surfaces; their hit area
     expands independently to control-touch. */
  "control-favorite": "2rem",
  "control-md": "2.5rem",
  "control-lg": "3rem",
  "control-fab": "3.25rem",
  "control-touch": "2.75rem",
  "control-indicator": "1.125rem",
  "control-target": "1.5rem",
  /* Approved signature sizes. Icon and wordmark remain separate artwork, but
     their paired display sizes are governed together for every shell. */
  "brand-logo-compact": "7.5rem",
  "brand-logo-standard": "10rem",
  "brand-signature-icon-compact": "2.25rem",
  "brand-signature-wordmark-compact": "6rem",
  "brand-signature-icon-standard": "2.75rem",
  "brand-signature-wordmark-standard": "7.5rem",
  "brand-signature-icon-prominent": "6rem",
  "brand-signature-wordmark-prominent": "18rem",
  /* Compact persistent environment chrome shared by every application shell. */
  "environment-toolbar-height": "3.5rem",
  "select-chevron-size": "0.25rem",
  "select-chevron-offset": "0.75rem",
  /* The canonical vertical marketplace card is 220 x 420 CSS pixels. Mobile
     keeps that footprint when space allows and scales down only below it. */
  "listing-card": "13.75rem",
  "listing-card-mobile-max": "13.75rem",
  "listing-card-grid-min": "13.75rem",
  /* A media-led crop preserves the reference hierarchy while leaving a fixed
     body for category, price, title, seller trust and category-specific facts. */
  "listing-card-height": "26.25rem",
  "listing-card-media-height": "13.125rem",
  "listing-card-showcase-height": "26.25rem",
  /* Horizontal result cards share one footprint. The image steps up with the
     available viewport so list mode remains useful on desktop without
     squeezing the copy column on phones. */
  "listing-card-list-height": "12.5rem",
  "listing-card-list-image-sm": "9rem",
  "listing-card-list-image-md": "11rem",
  "listing-card-list-image-lg": "13rem",
  /* The homepage feature rail is intentionally taller than a search-result
     row. A fixed token prevents its intrinsic grid height from changing as
     category-specific decision fields and seller metadata rotate. */
  "listing-card-hero-height": "18.5rem",
  "listing-card-hero-height-wide": "27.5rem",
  "listing-card-hero-image": "19rem",
  "listing-card-hero-wide": "53rem",
  "collection-card": "9.6875rem",
  "collection-card-wide": "11.875rem",
  "recent-search-card": "17rem",
  "recent-search-card-wide": "19rem",
  "recent-search-card-min": "6.5rem",
  /* Messaging is a viewport-owned workspace rather than an ordinary document
     page. On mobile the account rail, footer and global bottom navigation are
     removed, so only the global header chrome is reserved. */
  "messaging-shell-offset-mobile": "7.5rem",
  "messaging-shell-offset-desktop": "8.75rem",
  "messaging-shell-min": "37.5rem",
  "messaging-shell-max": "53.125rem",
  "messaging-shell-height-mobile":
    "calc(100dvh - var(--spacing-messaging-shell-offset-mobile))",
  "messaging-shell-height-desktop":
    "calc(100dvh - var(--spacing-messaging-shell-offset-desktop))",
  "search-map": "42.5rem",
  "search-map-tall": "45rem",
  "search-map-panel": "calc(100vh - 9rem)",
  "search-results-panel": "calc(100vh - 13rem)",
  "page-loading-min": "70vh",
  "dialog-viewport-max-height": "90vh",
  "dialog-viewport-max-width": "90vw",
  /* The shell heights for Modal and Drawer. `dvh` rather than the `vh` used by
     the media-preview tokens above: a dialog has to fit *inside* the visible
     viewport while mobile browser chrome is showing, and `vh` ignores it — the
     drawer's footer actions ended up under Safari's toolbar. */
  "dialog-modal-max-height": "calc(100dvh - 2rem)",
  "dialog-drawer-max-height": "90dvh",
  "dialog-native-max-height": "90%",
  "media-preview-max-height": "80vh",
  "side-sheet-height": "100dvh",
  "safe-area-bottom": "env(safe-area-inset-bottom)",
  "mobile-nav-bar": "var(--mobile-nav-h)",
  "mobile-nav-clearance": "var(--mobile-nav-total-h)",
  "mobile-nav-clearance-gutter":
    "calc(var(--mobile-nav-total-h) + var(--spacing-semantic-md))",
  "page-bottom-inset": "var(--page-bottom-inset, 0px)",
  "page-viewport-min": "100vh",
  "focus-ring-offset": "0.125rem",
  scrollbar: "0.375rem",
  "mobile-nav-height": "3.75rem",
  "mobile-nav-fab-rise": "1.25rem",
  "viewport-popover-max": "calc(100vw - 1.5rem)",
  "viewport-full": "100vw",
  "search-submit-height": "calc(100% + 2px)",
  "message-bubble": "85%",
  "message-bubble-wide": "70%",
  "field-multiline-min": "7rem",
  "skeleton-panel-min": "8rem",
  "side-sheet-width": "85vw",
  "admin-menu-max": "60vh",
  /* Desktop admin navigation sits below the sticky global chrome and keeps a
     small bottom gutter so its final destination remains keyboard-reachable. */
  "admin-sidebar-max": "calc(100dvh - 6.5rem)",
  "pipeline-column-max": "70vh",
  /* Shared vertical ceiling for menus and popovers. The viewport expression
     keeps long option sets operable on short mobile screens; the fixed ceiling
     preserves the compact desktop composition. */
  "menu-max": "min(23.75rem, calc(100dvh - 4rem))",
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

/**
 * Reusable application layouts. Their names describe structural roles so
 * feature modules never encode sidebar or aside measurements independently.
 */
export const themeGridTemplates = {
  /* The generic responsive card grid: as many equal columns as fit, never
     narrower than 16rem, and never wider than the container on one column. */
  "auto-fit-md": "repeat(auto-fit, minmax(min(100%, 16rem), 1fr))",
  "sidebar-compact": "14rem minmax(0, 1fr)",
  sidebar: "16rem minmax(0, 1fr)",
  "sidebar-wide": "19rem minmax(0, 1fr)",
  "content-aside-xs": "minmax(0, 1fr) 18rem",
  "content-aside-sm": "minmax(0, 1fr) 19rem",
  "content-aside": "minmax(0, 1fr) 20rem",
  "content-aside-md": "minmax(0, 1fr) 21rem",
  "content-aside-lg": "minmax(0, 1fr) 22rem",
  "aside-content-lg": "22rem minmax(0, 1fr)",
  "content-compact-aside": "minmax(0, 1fr) 9rem",
  "media-content-xs": "9rem minmax(0, 1fr)",
  "media-content-sm": "10rem minmax(0, 1fr)",
  "media-content": "11rem minmax(0, 1fr)",
  "media-content-md": "12rem minmax(0, 1fr)",
  "media-content-lg": "15rem minmax(0, 1fr)",
  "media-content-xl": "17rem minmax(0, 1fr)",
  "content-stat": "minmax(0, 1fr) 10rem",
  "content-action": "minmax(0, 1fr) auto",
  "action-content": "auto minmax(0, 1fr)",
  "filter-action": "minmax(0, 1fr) 6rem",
  "filter-row": "minmax(0, 1fr) 11rem 8rem",
  "search-fields": "minmax(0, 1.4fr) minmax(0, 1fr) auto",
  "search-compare-auto": "16rem minmax(0, 1fr) 17rem",
  "search-compare-balanced": "16rem minmax(0, 1fr) 16rem",
  "search-map-split": "minmax(28rem, 0.9fr) minmax(20rem, 1.1fr)",
  "workspace-metrics":
    "auto minmax(0, 1fr) minmax(12rem, 0.7fr) minmax(12rem, 0.7fr)",
  "course-card": "9rem minmax(0, 1fr) 10rem",
  "audit-row": "9rem minmax(0, 1fr)",
  "label-value": "7rem 1fr",
  "admin-verification": "1fr 1.2fr auto",
  "admin-monetization": "minmax(13.75rem, 1fr) 8.125rem 6.875rem 6.875rem 2rem",
  "agency-fields": "minmax(0, 1fr) 10rem 10rem",
  "listing-grid-fixed": "repeat(auto-fill, var(--spacing-listing-card))",
  "listing-grid-fluid":
    "repeat(auto-fit, minmax(var(--spacing-listing-card-grid-min), 1fr))",
  "description-list": "auto 1fr",
  "plans-tiers": "1fr 1.4fr 1fr",
  "admin-content-aside": "minmax(0, 1fr) 21.25rem",
  "finance-content-aside": "minmax(0, 1.65fr) minmax(20rem, 0.85fr)",
  "commission-content-aside": "minmax(0, 1.1fr) minmax(20rem, 0.9fr)",
  "moderation-content-aside": "minmax(0, 1.25fr) minmax(20rem, 0.75fr)",
  "trending-columns": "minmax(0, 0.8fr) minmax(0, 1.2fr)",
  "agency-content-aside": "minmax(0, 1.35fr) minmax(18rem, 0.65fr)",
  "agency-content-aside-secondary": "minmax(0, 1fr) minmax(18rem, 0.7fr)",
} as const;

/** Semantic 4px spacing scale shared by CSS utilities and React Native. */
/**
 * Media aspect ratios.
 *
 * `media` is the general responsive media well. `listingCard` is the portrait
 * photo used by narrow marketplace cards and their loading skeletons.
 */
export const themeAspect = {
  brandLogo: "240 / 61",
  listingCard: "29 / 25",
  media: "4 / 3",
  square: "1 / 1",
  video: "16 / 9",
} as const;

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
  "2xs": "0 1px 2px rgb(28 25 23 / 0.04)",
  xs: "0 2px 5px -2px rgb(28 25 23 / 0.09), 0 1px 2px rgb(28 25 23 / 0.04)",
  sm: "0 5px 14px -5px rgb(28 25 23 / 0.13), 0 2px 5px -2px rgb(28 25 23 / 0.06)",
  md: "0 10px 24px -8px rgb(28 25 23 / 0.16), 0 3px 8px -3px rgb(28 25 23 / 0.08)",
  lg: "0 18px 38px -12px rgb(28 25 23 / 0.18), 0 6px 14px -6px rgb(28 25 23 / 0.09)",
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
  "duration-skeleton": "1400ms",
  /** Time a transient copied/saved acknowledgement remains readable. */
  "duration-feedback": "2000ms",
  "duration-reduced": "0.01ms",
  "duration-marquee-fast": "24s",
  "duration-marquee-normal": "28s",
  "duration-marquee-reverse": "32s",
  "duration-marquee-slow": "38s",
  "motion-enter-shift": "0.5rem",
  "motion-enter-scale": "0.95",
  "motion-press-surface-scale": "0.995",
  "motion-press-control-scale": "0.98",
  "motion-press-icon-scale": "0.96",
  "motion-marquee-travel": "-50%",
  "motion-iteration-once": "1",
} as const;

export const themeOpacity = {
  hidden: 0,
  visible: 1,
  disabled: 0.45,
  pressed: 0.78,
  muted: 0.7,
  scrim: 0.6,
  "category-tone": "8%",
} as const;

export const themeBorders = {
  hairline: "1px",
  strong: "2px",
} as const;

/** Lucide stroke weights shared by the Web and native icon primitives. */
export const themeIconStrokeWidths = {
  light: 1.5,
  regular: 2,
  strong: 2.5,
} as const;

export const themeInteraction = {
  focusRingWidth: "2px",
  focusRingOffset: "2px",
  pressScale: 0.95,
  minimumTouchTarget: themeSpacing["control-touch"],
  /** Pixel tolerance used when deciding whether a rail is at an edge. */
  scrollBoundaryTolerancePx: 2,
  /** A rail arrow advances far enough to reveal a meaningful next item. */
  railNudgeMinimumPx: 160,
  railNudgeViewportRatio: 0.7,
  /** Category labels are shorter, so their dedicated rail uses a fixed nudge. */
  categoryRailNudgePx: 280,
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
  gridTemplates: themeGridTemplates,
  space: themeSpaceScale,
  controlSizes: themeControlSizes,
  containers: themeContainers,
  breakpoints: themeBreakpoints,
  shadows: themeShadows,
  motion: themeMotion,
  zIndex: themeZIndex,
  opacity: themeOpacity,
  borders: themeBorders,
  iconStrokeWidths: themeIconStrokeWidths,
  interaction: themeInteraction,
} as const;

export type Theme = typeof theme;
