/**
 * Shongre Design System - Spacing Tokens
 * 4px/8px modular rhythm scale for consistent layout, component padding, and hit targets.
 */

export const spacing = {
  // Modular Scale (4px base)
  0: '0px',
  0.5: '0.125rem', // 2px
  1: '0.25rem',    // 4px
  1.5: '0.375rem', // 6px
  2: '0.5rem',     // 8px
  2.5: '0.625rem', // 10px
  3: '0.75rem',    // 12px
  3.5: '0.875rem', // 14px
  4: '1rem',       // 16px
  5: '1.25rem',    // 20px
  6: '1.5rem',     // 24px
  7: '1.75rem',    // 28px
  8: '2rem',       // 32px
  9: '2.25rem',    // 36px
  10: '2.5rem',    // 40px
  12: '3rem',      // 48px
  14: '3.5rem',    // 56px
  16: '4rem',      // 64px
  20: '5rem',      // 80px
  24: '6rem',      // 96px

  // Semantic Layout Spacing
  layout: {
    containerMax: '1280px',
    containerPadding: '1.25rem', // 20px
    sectionGap: '2rem',         // 32px
    cardPadding: '1.25rem',      // 20px
    gridGap: '1rem',             // 16px
  },

  // Component & Interaction Targets
  components: {
    touchTargetMin: '44px',     // WCAG touch target
    buttonPaddingX: '1rem',      // 16px
    buttonPaddingY: '0.5rem',    // 8px (2:1 ratio)
    inputPaddingX: '0.875rem',   // 14px
    inputPaddingY: '0.625rem',   // 10px
    badgePaddingX: '0.625rem',   // 10px
    badgePaddingY: '0.25rem',    // 4px
  },
} as const;

export type Spacing = typeof spacing;
