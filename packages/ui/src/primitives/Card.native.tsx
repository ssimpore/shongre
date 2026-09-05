import type { ReactNode } from "react";
import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from "react-native";
import {
  nativeBorders,
  nativeColors,
  nativeRadius,
  nativeSpacing,
} from "@shongre/design-tokens/native";

export interface CardProps extends Omit<ViewProps, "children" | "style"> {
  children: ReactNode;
  tone?: "default" | "subtle" | "inverse";
  padding?: "none" | "sm" | "md" | "lg";
  style?: StyleProp<ViewStyle>;
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
  base: {
    borderWidth: nativeBorders.hairline,
    borderRadius: nativeRadius.card,
    overflow: "hidden",
  },
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
    backgroundColor: nativeColors.surface.inverse,
    borderColor: nativeColors.border.inverse,
  },
});
const paddings = StyleSheet.create({
  none: { padding: nativeSpacing.none },
  sm: { padding: nativeSpacing.md },
  md: { padding: nativeSpacing.lg },
  lg: { padding: nativeSpacing.xl },
});
