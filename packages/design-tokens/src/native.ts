import { colors } from "./colors";
import { themeColors, themeOpacity, themeText, themeZIndex } from "./theme";

const remToPx = (value: string): number => {
  const parsed = Number.parseFloat(value);
  return value.endsWith("rem") ? parsed * 16 : parsed;
};

export const nativeColors = colors;
export const nativePalette = themeColors;
/** Flat aliases for application composition; primitives use nativeColors. */
export const mobileColors = {
  background: colors.surface.default,
  surface: colors.surface.raised,
  surfaceMuted: colors.surface.subtle,
  text: colors.text.primary,
  textMuted: colors.text.muted,
  border: colors.border.default,
  primary: colors.action.primary,
  primaryPressed: colors.action.primaryPressed,
  onPrimary: colors.action.onPrimary,
  success: colors.status.success,
  danger: colors.status.error,
  warning: colors.status.warning,
  focus: colors.interaction.focus,
} as const;
export const nativeSpacing = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;
export const nativeRadius = {
  xs: 2,
  sm: 4,
  md: 6,
  lg: 8,
  control: 10,
  card: 20,
  overlay: 28,
  pill: 9999,
} as const;
export const mobileRadius = {
  sm: nativeRadius.lg,
  md: nativeRadius.control,
  lg: nativeRadius.card,
  pill: nativeRadius.pill,
} as const;
export const nativeSizing = {
  controlSm: 32,
  controlMd: 40,
  controlTouch: 44,
  controlLg: 48,
  controlFab: 52,
  iconSm: 14,
  iconMd: 16,
  iconLg: 20,
  iconXl: 24,
  mobileNavHeight: 60,
  mobileNavFabRise: 20,
} as const;
export const nativeBorders = { hairline: 1, strong: 2 } as const;
export const nativeTypography = {
  fontFamily: {
    regular: "Inter_400Regular",
    medium: "Inter_500Medium",
    semibold: "Inter_600SemiBold",
    bold: "Inter_700Bold",
  },
  size: {
    micro: remToPx(themeText.micro),
    caption: remToPx(themeText.caption),
    bodySm: remToPx(themeText["body-sm"]),
    body: remToPx(themeText["body-md"]),
    bodyLg: remToPx(themeText["body-lg"]),
    title: remToPx(themeText["heading-sm"]),
    heading: remToPx(themeText["heading-md"]),
    display: remToPx(themeText["heading-xl"]),
    displayLg: 56,
    displayMd: 44,
    displaySm: 36,
    headingXl: remToPx(themeText["heading-xl"]),
    headingLg: remToPx(themeText["heading-lg"]),
    headingMd: remToPx(themeText["heading-md"]),
    headingSm: remToPx(themeText["heading-sm"]),
    headingXs: remToPx(themeText["heading-xs"]),
  },
  lineHeight: {
    caption: 17,
    bodySm: 21,
    body: 24,
    bodyLg: 29,
    title: 28,
    heading: 31,
    display: 40,
    displayLg: 58,
    displayMd: 48,
    displaySm: 40,
    headingXl: 42,
    headingLg: 36,
    headingMd: 30,
    headingSm: 26,
    headingXs: 22,
  },
} as const;
export const nativeOpacity = themeOpacity;
export const nativeZIndex = themeZIndex;

export { remToPx };
