import { useWindowDimensions } from "react-native";
import {
  resolveLayoutColumns,
  resolveLayoutMode,
  type LayoutMode,
} from "@shongre/design-tokens";

export interface LayoutModeState {
  mode: LayoutMode;
  /** Columns a listing grid should use at this width. */
  columns: number;
  isCompact: boolean;
}

/**
 * How much room the window has right now.
 *
 * A React Native tree has no media queries, so every screen that wants to adapt
 * has to read the window itself. Doing it through one hook keeps the thresholds
 * in the shared token package rather than scattered across screens, and makes a
 * rotation a re-render instead of a stale layout: `useWindowDimensions`
 * subscribes to the change, `Dimensions.get` does not.
 */
export function useLayoutMode(): LayoutModeState {
  const { width } = useWindowDimensions();
  const mode = resolveLayoutMode(width);
  return {
    mode,
    columns: resolveLayoutColumns(width),
    isCompact: mode === "compact",
  };
}
