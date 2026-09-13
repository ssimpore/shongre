import { colors } from "./colors";
import {
  themeAspect,
  themeBorders,
  themeIconStrokeWidths,
  themeLetterSpacing,
  themeOpacity,
  themeRadii,
  themeSpaceScale,
  themeSpacing,
  themeText,
  themeTextLineHeights,
  themeZIndex,
} from "./theme";

const remToPx = (value: string): number => {
  const parsed = Number.parseFloat(value);
  return value.endsWith("rem") ? parsed * 16 : parsed;
};

const aspectToNumber = (value: string): number => {
  const [width, height] = value.split("/").map(Number);
  return width / height;
};

const emToPx = (value: string, fontSize: number): number => {
  const parsed = Number.parseFloat(value);
  return value.endsWith("em") ? parsed * fontSize : remToPx(value);
};

export const nativeColors = colors;
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
  none: remToPx(themeSpaceScale.none),
  xs: remToPx(themeSpaceScale.xs),
  sm: remToPx(themeSpaceScale.sm),
  md: remToPx(themeSpaceScale.md),
  lg: remToPx(themeSpaceScale.lg),
  xl: remToPx(themeSpaceScale.xl),
  xxl: remToPx(themeSpaceScale["2xl"]),
  xxxl: remToPx(themeSpaceScale["3xl"]),
} as const;
export const nativeRadius = {
  xs: remToPx(themeRadii.xs),
  sm: remToPx(themeRadii.sm),
  md: remToPx(themeRadii.md),
  lg: remToPx(themeRadii.lg),
  control: remToPx(themeRadii.control),
  listingCard: remToPx(themeRadii["listing-card"]),
  card: remToPx(themeRadii.card),
  overlay: remToPx(themeRadii.overlay),
  pill: Number.parseFloat(themeRadii.pill),
} as const;
export const mobileRadius = {
  sm: nativeRadius.lg,
  md: nativeRadius.control,
  lg: nativeRadius.card,
  pill: nativeRadius.pill,
} as const;
export const nativeSizing = {
  full: "100%",
  brandLogoCompact: remToPx(themeSpacing["brand-logo-compact"]),
  brandLogoStandard: remToPx(themeSpacing["brand-logo-standard"]),
  controlSm: remToPx(themeSpacing["control-sm"]),
  controlMd: remToPx(themeSpacing["control-md"]),
  controlTouch: remToPx(themeSpacing["control-touch"]),
  controlTarget: remToPx(themeSpacing["control-target"]),
  controlLg: remToPx(themeSpacing["control-lg"]),
  controlFab: remToPx(themeSpacing["control-fab"]),
  iconXs: remToPx(themeSpacing["icon-xs"]),
  iconSm: remToPx(themeSpacing["icon-sm"]),
  iconMd: remToPx(themeSpacing["icon-md"]),
  iconLg: remToPx(themeSpacing["icon-lg"]),
  iconNav: remToPx(themeSpacing["icon-nav"]),
  iconXl: remToPx(themeSpacing["icon-xl"]),
  avatarSm: remToPx(themeSpacing["avatar-sm"]),
  avatarMd: remToPx(themeSpacing["avatar-md"]),
  avatarLg: remToPx(themeSpacing["avatar-lg"]),
  avatarXl: remToPx(themeSpacing["avatar-xl"]),
  avatar2xl: remToPx(themeSpacing["avatar-2xl"]),
  listingCard: remToPx(themeSpacing["listing-card"]),
  listingCardHeight: remToPx(themeSpacing["listing-card-height"]),
  listingCardMediaHeight: remToPx(themeSpacing["listing-card-media-height"]),
  listingCardListImageSm: remToPx(themeSpacing["listing-card-list-image-sm"]),
  fieldMultilineMin: remToPx(themeSpacing["field-multiline-min"]),
  skeletonPanelMin: remToPx(themeSpacing["skeleton-panel-min"]),
  dialogMaxHeight: themeSpacing["dialog-native-max-height"],
  messageBubbleMax: themeSpacing["message-bubble"],
  mobileNavHeight: remToPx(themeSpacing["mobile-nav-height"]),
  mobileNavFabRise: remToPx(themeSpacing["mobile-nav-fab-rise"]),
} as const;
export const nativeBorders = {
  hairline: remToPx(themeBorders.hairline),
  strong: remToPx(themeBorders.strong),
} as const;
export const nativeAspect = {
  brandLogo: aspectToNumber(themeAspect.brandLogo),
  listingCard: aspectToNumber(themeAspect.listingCard),
  media: aspectToNumber(themeAspect.media),
  square: aspectToNumber(themeAspect.square),
  video: aspectToNumber(themeAspect.video),
} as const;
export const iconStrokeWidths = themeIconStrokeWidths;

const nativeFontSizes = {
  cardTitle: remToPx(themeText["card-title"]),
  cardPrice: remToPx(themeText["card-price"]),
  overline: remToPx(themeText.overline),
  micro: remToPx(themeText.micro),
  xs: remToPx(themeText.xs),
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
} as const;

export const nativeTypography = {
  fontFamily: {
    regular: "Inter_400Regular",
    medium: "Inter_500Medium",
    semibold: "Inter_600SemiBold",
    bold: "Inter_700Bold",
  },
  size: nativeFontSizes,
  lineHeight: {
    cardTitle:
      nativeFontSizes.cardTitle * Number(themeTextLineHeights["card-title"]),
    cardPrice:
      nativeFontSizes.cardPrice * Number(themeTextLineHeights["card-price"]),
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
  letterSpacing: {
    wide: emToPx(themeLetterSpacing.wide, nativeFontSizes.micro),
    overline: emToPx(themeLetterSpacing.wider, nativeFontSizes.micro),
  },
} as const;
export const nativeOpacity = themeOpacity;
export const nativeZIndex = themeZIndex;

export { remToPx };
