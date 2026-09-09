import { themeBreakpoints } from "./theme";

export { themeBreakpoints as breakpoints };

/**
 * How much room a surface has, independent of platform.
 *
 * Web expresses this with media queries; a React Native tree has no such
 * mechanism and has to ask for the window's width. Naming the three bands once
 * keeps a phone in landscape and a tablet in portrait from being treated as
 * "not a phone, therefore desktop" on one platform and "narrow, therefore
 * phone" on the other.
 */
export type LayoutMode = "compact" | "regular" | "expanded";

const remToPx = (value: string): number =>
  Number.parseFloat(value.replace("rem", "")) * 16;

/** `md` and `lg` from the shared scale: 768px and 1024px. */
export const LAYOUT_MODE_MIN_WIDTH: Readonly<Record<LayoutMode, number>> =
  Object.freeze({
    compact: 0,
    regular: remToPx(themeBreakpoints.md),
    expanded: remToPx(themeBreakpoints.lg),
  });

/**
 * Columns a card grid should use in each band.
 *
 * One column on a phone, two once a tablet or a landscape phone is wide enough
 * for a listing card to keep its proportions, three on a large tablet. Card
 * grids that stretch a single column to a tablet's width are the most visible
 * way a native app looks unfinished on anything but a phone.
 */
export const LAYOUT_MODE_COLUMNS: Readonly<Record<LayoutMode, number>> =
  Object.freeze({ compact: 1, regular: 2, expanded: 3 });

export function resolveLayoutMode(width: number): LayoutMode {
  if (!Number.isFinite(width) || width <= 0) return "compact";
  if (width >= LAYOUT_MODE_MIN_WIDTH.expanded) return "expanded";
  if (width >= LAYOUT_MODE_MIN_WIDTH.regular) return "regular";
  return "compact";
}

export function resolveLayoutColumns(width: number): number {
  return LAYOUT_MODE_COLUMNS[resolveLayoutMode(width)];
}
