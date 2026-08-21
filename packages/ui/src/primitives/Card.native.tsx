import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import {
  nativeColors,
  nativePalette,
  nativeRadius,
  nativeSpacing,
} from "@shongre/design-tokens/native";

export interface CardProps {
  children: ReactNode;
  tone?: "default" | "subtle" | "inverse";
  padding?: "none" | "sm" | "md" | "lg";
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}
export function Card({
  children,
  tone = "default",
  padding = "md",
  style,
  ...props
}: CardProps) {
  return (
    <View
      style={[styles.base, tones[tone], paddings[padding], style]}
      {...props}
    >
      {children}
    </View>
  );
}
const styles = StyleSheet.create({
  base: { borderWidth: 1, borderRadius: nativeRadius.card, overflow: "hidden" },
});
const tones = StyleSheet.create({
  default: {
    backgroundColor: nativeColors.surface.raised,
    borderColor: nativeColors.border.default,
  },
  subtle: {
    backgroundColor: nativeColors.surface.subtle,
    borderColor: nativeColors.border.default,
  },
  inverse: {
    backgroundColor: nativePalette["stone-900"],
    borderColor: nativePalette["stone-800"],
  },
});
const paddings = StyleSheet.create({
  none: { padding: 0 },
  sm: { padding: nativeSpacing.md },
  md: { padding: nativeSpacing.lg },
  lg: { padding: nativeSpacing.xl },
});
