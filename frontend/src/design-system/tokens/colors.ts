/**
 * Shongre Design System - Color Palette Tokens
 * Features warm neutrals, artisanal terracotta primary, pine accent, and accessible WCAG AA semantic states.
 */

export const colors = {
  // Brand / Primary: Terracotta
  primary: {
    DEFAULT: '#D9532F',
    hover: '#C24422',
    active: '#A93719',
    light: '#FFF3EF',
    lighter: '#FFF8F6',
    border: '#FED7CC',
    borderLight: '#FEE5DE',
    dark: '#9A2E14',
    contrastText: '#FFFFFF',
  },

  // Secondary Accent: Deep Pine / Forest
  secondary: {
    DEFAULT: '#2A5C55',
    hover: '#224B45',
    active: '#1A3B36',
    light: '#EFF7F5',
    border: '#BFE0DA',
    dark: '#14312D',
    contrastText: '#FFFFFF',
  },

  // Warm Neutrals (Stone/Ecru palette)
  neutral: {
    background: '#FAF8F5',
    surface: '#FFFFFF',
    surfaceSubtle: '#F4F1EA',
    surfaceMuted: '#EAE6DD',
    border: '#E8E4DC',
    borderSubtle: '#F0ECE4',
    borderDark: '#D6D1C7',
    textPrimary: '#1C1917',     // Stone 900
    textSecondary: '#57534E',   // Stone 600
    textMuted: '#78716C',       // Stone 500
    textSubtle: '#A8A29E',      // Stone 400
    textInverted: '#FAF8F5',
    white: '#FFFFFF',
    black: '#121110',
  },

  // Semantic Status Colors
  success: {
    DEFAULT: '#16A34A',
    hover: '#15803D',
    light: '#F0FDF4',
    border: '#BBF7D0',
    text: '#15803D',
    contrastText: '#FFFFFF',
  },
  warning: {
    DEFAULT: '#D97706',
    hover: '#B45309',
    light: '#FFFBEB',
    border: '#FDE68A',
    text: '#B45309',
    contrastText: '#FFFFFF',
  },
  danger: {
    DEFAULT: '#DC2626',
    hover: '#B91C1C',
    light: '#FEF2F2',
    border: '#FECACA',
    text: '#B91C1C',
    contrastText: '#FFFFFF',
  },
  error: {
    DEFAULT: '#DC2626',
    hover: '#B91C1C',
    light: '#FEF2F2',
    border: '#FECACA',
    text: '#B91C1C',
    contrastText: '#FFFFFF',
  },
  info: {
    DEFAULT: '#0284C7',
    hover: '#0369A1',
    light: '#F0F9FF',
    border: '#BAE6FD',
    text: '#0369A1',
    contrastText: '#FFFFFF',
  },

  // Pro & Verification Accents
  pro: {
    badge: '#3B82F6',
    badgeLight: '#EFF6FF',
    badgeBorder: '#BFDBFE',
    badgeText: '#1D4ED8',
    gold: '#D97706',
    goldLight: '#FEF3C7',
  },

  // Marketplace & Boost Tones
  boost: {
    urgent: '#EA580C',
    urgentLight: '#FFF7ED',
    urgentBorder: '#FED7AA',
    highlight: '#7C3AED',
    highlightLight: '#F5F3FF',
    highlightBorder: '#DDD6FE',
    top: '#0284C7',
    topLight: '#F0F9FF',
    topBorder: '#BAE6FD',
  },
} as const;

export type Colors = typeof colors;
