import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { nativeSpacing } from "@shongre/design-tokens/native";
export type LayoutSpace = "none" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
const gaps = {
  none: 0,
  xs: nativeSpacing.xs,
  sm: nativeSpacing.sm,
  md: nativeSpacing.lg,
  lg: nativeSpacing.xl,
  xl: nativeSpacing.xxl,
  "2xl": nativeSpacing.xxxl,
} as const;
export interface StackProps {
  children: ReactNode;
  gap?: LayoutSpace;
  align?: "stretch" | "start" | "center" | "end";
  style?: StyleProp<ViewStyle>;
}
export function Stack({
  children,
  gap = "md",
  align = "stretch",
  style,
}: StackProps) {
  const alignItems = {
    stretch: "stretch",
    start: "flex-start",
    center: "center",
    end: "flex-end",
  } as const;
  return (
    <View style={[{ gap: gaps[gap], alignItems: alignItems[align] }, style]}>
      {children}
    </View>
  );
}
export interface InlineProps extends StackProps {
  justify?: "start" | "center" | "end" | "between";
  wrap?: boolean;
}
export function Inline({
  children,
  gap = "sm",
  align = "center",
  justify = "start",
  wrap,
  style,
}: InlineProps) {
  const justifyContent = {
    start: "flex-start",
    center: "center",
    end: "flex-end",
    between: "space-between",
  } as const;
  const alignItems = {
    stretch: "stretch",
    start: "flex-start",
    center: "center",
    end: "flex-end",
  } as const;
  return (
    <View
      style={[
        {
          flexDirection: "row",
          gap: gaps[gap],
          alignItems: alignItems[align],
          justifyContent: justifyContent[justify],
          flexWrap: wrap ? "wrap" : "nowrap",
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
