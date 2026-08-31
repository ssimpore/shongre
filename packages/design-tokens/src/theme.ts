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
  /* Muted body copy has to clear WCAG AA (4.5:1) on every surface token it can
     sit on, not just `bg-surface`. The previous #78716C reached 4.79:1 on white
     but only 4.25:1 on `bg-subtle` and 4.10:1 on `bg-muted`, so every muted
     caption, table header and breadcrumb on a tinted panel was a failure — the
     audit found them on the property detail, teacher profile, course table,
     admin market and CRM prospecting surfaces. This value clears 4.5:1 against
     `bg-surface`, `bg-base`, `bg-subtle` and `bg-muted` alike; the contrast
     assertion in `check-design-tokens.mjs` keeps it that way. */
  "text-muted": "#6A635E",
  "text-disabled": "#A8A29E",
  "text-inverse": "#FFFFFF",
  focus: "#C4431F",
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
  "warning-hover": "#92400E",
  "warning-active": "#78350F",
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
  "listing-card": "0.875rem",
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
  /* Shared compact width for listing cards in rails and desktop grids. Five
     cards plus four standard gaps fit a 69rem discovery row. */
  "listing-card": "13rem",
  /* Dense result grids may compress standard cards slightly so an available
     listing can use an otherwise empty desktop column. The card component and
     height remain shared with homepage rails. */
  "listing-card-grid-min": "12.5rem",
  /* Minimum card rhythm; real content may grow, and stretched grid/rail items
     keep neighbours aligned without clipping missing or long metadata. */
  "listing-card-height": "23rem",
  /* Homepage discovery keeps a slightly taller editorial rhythm while sharing
     the canonical card width with every other listing rail. */
  "listing-card-showcase-height": "24rem",
  /* Horizontal result cards share one footprint. The image steps up with the
     available viewport so list mode remains useful on desktop without
     squeezing the copy column on phones. */
  "listing-card-list-height": "12.5rem",
  "listing-card-list-image-md": "10rem",
  "listing-card-list-image-lg": "11rem",
  "collection-card": "9.6875rem",
  "collection-card-wide": "11.875rem",
  "recent-search-card": "17rem",
  "recent-search-card-wide": "19rem",
  "recent-search-card-min": "6.5rem",
  /* Messaging is a viewport-owned workspace rather than an ordinary document
     page. The shell offset accounts for the application/header/account chrome;
     the mobile navigation clearance is added by the consuming layout so the
     composer never paints under the raised publication action. */
  "messaging-shell-offset-mobile": "17rem",
  "messaging-shell-offset-desktop": "8.75rem",
  "messaging-shell-min": "37.5rem",
  "messaging-shell-max": "53.125rem",
  "messaging-shell-height-mobile":
    "calc(100dvh - var(--spacing-messaging-shell-offset-mobile) - var(--mobile-nav-total-h))",
  "messaging-shell-height-desktop":
    "calc(100dvh - var(--spacing-messaging-shell-offset-desktop))",
  "auth-shell-min": "calc(100vh - 3.5rem)",
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
  "search-submit-height": "calc(100% + 2px)",
  "message-bubble": "85%",
  "message-bubble-wide": "70%",
  "side-sheet-width": "85vw",
  "admin-menu-max": "60vh",
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
  "search-properties": "16rem minmax(30rem, 0.9fr) minmax(24rem, 1.1fr)",
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
    "repeat(auto-fill, minmax(var(--spacing-listing-card-grid-min), 1fr))",
  "description-list": "auto 1fr",
  "plans-tiers": "1fr 1.4fr 1fr",
  "admin-content-aside": "minmax(0, 1fr) 21.25rem",
  "finance-content-aside": "minmax(0, 1.65fr) minmax(20rem, 0.85fr)",
  "commission-content-aside": "minmax(0, 1.1fr) minmax(20rem, 0.9fr)",
  "moderation-content-aside": "minmax(0, 1.25fr) minmax(20rem, 0.75fr)",
  "trending-columns": "minmax(0, 0.8fr) minmax(0, 1.2fr)",
  "agency-content-aside": "minmax(0, 1.35fr) minmax(18rem, 0.65fr)",
  "agency-content-aside-secondary": "minmax(0, 1fr) minmax(18rem, 0.7fr)",
  footer: "repeat(3, minmax(0, 1fr)) minmax(16rem, 1.25fr)",
} as const;

/** Semantic 4px spacing scale shared by CSS utilities and React Native. */
/**
 * Media aspect ratios.
 *
 * `media` is the listing-card photo well. It was written as `aspect-[4/3]` in
 * both the card and its loading skeleton, which meant the placeholder and the
 * real card were two independent literals that had to be kept equal by hand.
 */
export const themeAspect = {
  media: "4 / 3",
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
  /** Time a transient copied/saved acknowledgement remains readable. */
  "duration-feedback": "2000ms",
  "duration-reduced": "0.01ms",
  "duration-marquee-fast": "24s",
  "duration-marquee-normal": "28s",
  "duration-marquee-reverse": "32s",
  "duration-marquee-slow": "38s",
  "motion-enter-shift": "0.5rem",
  "motion-enter-scale": "0.95",
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
  interaction: themeInteraction,
} as const;

export type Theme = typeof theme;
