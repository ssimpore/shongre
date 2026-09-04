import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import {
  nativeAspect,
  nativeColors,
  nativeRadius,
  nativeSizing,
  nativeSpacing,
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
  line: { height: nativeSpacing.lg, borderRadius: nativeRadius.lg },
  control: {
    height: nativeSizing.controlTouch,
    borderRadius: nativeRadius.control,
  },
  media: {
    width: nativeSizing.full,
    aspectRatio: nativeAspect.media,
    borderRadius: nativeRadius.control,
  },
  circle: {
    width: nativeSizing.avatarMd,
    height: nativeSizing.avatarMd,
    borderRadius: nativeRadius.pill,
  },
  panel: {
    minHeight: nativeSizing.skeletonPanelMin,
    borderRadius: nativeRadius.card,
  },
});
