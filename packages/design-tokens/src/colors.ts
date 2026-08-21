import { themeColors } from "./theme";

export const palette = themeColors;

export const colors = {
  surface: {
    default: themeColors["bg-base"],
    raised: themeColors["bg-surface"],
    subtle: themeColors["bg-subtle"],
    muted: themeColors["bg-muted"],
  },
  text: {
    primary: themeColors["text-main"],
    secondary: themeColors["text-secondary"],
    muted: themeColors["text-muted"],
    disabled: themeColors["text-disabled"],
    inverse: themeColors["text-inverse"],
  },
  border: {
    default: themeColors["border-base"],
    subtle: themeColors["border-subtle"],
    strong: themeColors["border-hover"],
  },
  action: {
    primary: themeColors.primary,
    primaryHover: themeColors["primary-hover"],
    primaryPressed: themeColors["primary-active"],
    primarySubtle: themeColors["primary-light"],
    primaryBorder: themeColors["primary-border"],
    disabled: themeColors["text-disabled"],
    onPrimary: themeColors.white,
  },
  status: {
    success: themeColors.success,
    successSurface: themeColors["success-surface"],
    successBorder: themeColors["success-border"],
    warning: themeColors.warning,
    warningSurface: themeColors["warning-surface"],
    warningBorder: themeColors["warning-border"],
    error: themeColors.danger,
    errorHover: themeColors["danger-hover"],
    errorPressed: themeColors["danger-active"],
    errorSurface: themeColors["danger-surface"],
    errorBorder: themeColors["danger-border"],
    info: themeColors.info,
    infoSurface: themeColors["info-surface"],
    infoBorder: themeColors["info-border"],
  },
  interaction: {
    focus: themeColors.focus,
    overlay: themeColors.overlay,
  },
  category: {
    vehicles: themeColors["category-vehicles"],
    realEstate: themeColors["category-real-estate"],
    jobs: themeColors["category-jobs"],
    multimedia: themeColors["category-multimedia"],
    homeGarden: themeColors["category-home-garden"],
    fashion: themeColors["category-fashion"],
    leisure: themeColors["category-leisure"],
    services: themeColors["category-services"],
    tech: themeColors["category-tech"],
    baby: themeColors["category-baby"],
    pets: themeColors["category-pets"],
    sport: themeColors["category-sport"],
    trades: themeColors["category-trades"],
    agriculture: themeColors["category-agriculture"],
    neutral: themeColors["category-neutral"],
    neutralSoft: themeColors["category-neutral-soft"],
  },
} as const;

export type SemanticColors = typeof colors;
