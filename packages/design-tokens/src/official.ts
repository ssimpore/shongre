import { themeColors } from "./theme";

/**
 * Official palettes for artwork whose colours must not follow the product
 * theme. Keeping them here still gives the repository one colour source while
 * preserving the identities of countries and external sign-in providers.
 */
export const officialCountryFlagColors = {
  france: { blue: "#0055A4", white: themeColors.white, red: "#EF4135" },
  belgium: { black: "#2D2926", yellow: "#FFCD00", red: "#C8102E" },
  germany: { black: themeColors.black, red: "#DD0000", yellow: "#FFCE00" },
  spain: { red: "#AA151B", yellow: "#F1BF00" },
  unitedKingdom: {
    blue: "#012169",
    white: themeColors.white,
    red: "#C8102E",
  },
  italy: { green: "#009246", white: themeColors.white, red: "#CE2B37" },
  netherlands: {
    red: "#AE1C28",
    white: themeColors.white,
    blue: "#21468B",
  },
  switzerland: { red: "#D52B1E", white: themeColors.white },
  luxembourg: {
    red: "#EF3340",
    white: themeColors.white,
    blue: "#00A3E0",
  },
  senegal: { green: "#00853F", yellow: "#FDEF42", red: "#E31B23" },
  burkinaFaso: { red: "#EF2B2D", green: "#009E49", yellow: "#FCD116" },
} as const;

export const officialProviderColors = {
  google: {
    blue: "#4285F4",
    green: "#34A853",
    yellow: "#FBBC05",
    red: "#EA4335",
  },
  facebook: { blue: "#1877F2", white: themeColors.white },
} as const;
