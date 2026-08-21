import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import {
  nativeColors,
  nativeRadius,
  nativeSizing,
} from "@shongre/design-tokens/native";
export interface SkeletonProps {
  shape?: "line" | "control" | "media" | "circle" | "panel";
  style?: StyleProp<ViewStyle>;
}
export function Skeleton({ shape = "line", style }: SkeletonProps) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.base, shapes[shape], style]}
    />
  );
}
const styles = StyleSheet.create({
  base: { backgroundColor: nativeColors.surface.muted },
});
const shapes = StyleSheet.create({
  line: { height: 16, borderRadius: nativeRadius.lg },
  control: {
    height: nativeSizing.controlTouch,
    borderRadius: nativeRadius.control,
  },
  media: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: nativeRadius.control,
  },
  circle: { width: 40, height: 40, borderRadius: nativeRadius.pill },
  panel: { minHeight: 128, borderRadius: nativeRadius.card },
});
