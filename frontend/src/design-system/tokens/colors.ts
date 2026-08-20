/**
 * Programmatic colour tokens.
 *
 * Values are declared once in `src/index.css` and parity-checked through the
 * canonical mirror in `theme.ts`. Feature components must not add local hex
 * palettes; taxonomy accent colours remain domain data by design.
 */
import { themeColors } from './theme';

export const colors = {
  ...themeColors,
  category: {
    vehicles: themeColors['category-vehicles'],
    realEstate: themeColors['category-real-estate'],
    jobs: themeColors['category-jobs'],
    multimedia: themeColors['category-multimedia'],
    homeGarden: themeColors['category-home-garden'],
    fashion: themeColors['category-fashion'],
    leisure: themeColors['category-leisure'],
    services: themeColors['category-services'],
    tech: themeColors['category-tech'],
    baby: themeColors['category-baby'],
    pets: themeColors['category-pets'],
    sport: themeColors['category-sport'],
    trades: themeColors['category-trades'],
    agriculture: themeColors['category-agriculture'],
    neutral: themeColors['category-neutral'],
    neutralSoft: themeColors['category-neutral-soft'],
  },
} as const;
export type Colors = typeof colors;
