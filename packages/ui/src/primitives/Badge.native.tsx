import type { ReactNode } from "react";
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import {
  nativeColors,
  nativePalette,
  nativeRadius,
  nativeSpacing,
  nativeTypography,
} from "@shongre/design-tokens/native";
import type { BadgeVariant } from "./Badge.web";

export interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: "sm" | "md";
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
}
export function Badge({
  children,
  variant = "neutral",
  size = "sm",
  icon,
  style,
}: BadgeProps) {
  return (
    <View style={[styles.base, sizes[size], variants[variant], style]}>
      {icon}
      {typeof children === "string" ? (
        <Text style={[styles.label, labels[variant]]}>{children}</Text>
      ) : (
        children
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  base: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    borderRadius: nativeRadius.md,
    borderWidth: 1,
    gap: nativeSpacing.xs,
  },
  label: {
    fontFamily: nativeTypography.fontFamily.semibold,
    fontSize: nativeTypography.size.micro,
  },
});
const sizes = StyleSheet.create({
  sm: {
    paddingHorizontal: nativeSpacing.sm,
    paddingVertical: nativeSpacing.xs,
  },
  md: {
    paddingHorizontal: nativeSpacing.md,
    paddingVertical: nativeSpacing.xs,
  },
});
const variants = StyleSheet.create({
  neutral: {
    backgroundColor: nativePalette["stone-100"],
    borderColor: nativePalette["stone-200"],
  },
  primary: {
    backgroundColor: nativeColors.action.primarySubtle,
    borderColor: nativeColors.action.primaryBorder,
  },
  pro: {
    backgroundColor: nativePalette["stone-900"],
    borderColor: nativePalette["stone-900"],
  },
  verified: {
    backgroundColor: nativeColors.status.successSurface,
    borderColor: nativeColors.status.successBorder,
  },
  urgent: {
    backgroundColor: nativeColors.status.errorSurface,
    borderColor: nativeColors.status.errorBorder,
  },
  deal: {
    backgroundColor: nativeColors.status.warningSurface,
    borderColor: nativeColors.status.warningBorder,
  },
  warning: {
    backgroundColor: nativeColors.status.warningSurface,
    borderColor: nativeColors.status.warningBorder,
  },
  success: {
    backgroundColor: nativeColors.status.successSurface,
    borderColor: nativeColors.status.successBorder,
  },
  featured: {
    backgroundColor: nativeColors.action.primary,
    borderColor: nativeColors.action.primary,
  },
});
const labels = StyleSheet.create({
  neutral: { color: nativePalette["stone-700"] },
  primary: { color: nativeColors.action.primary },
  pro: { color: nativeColors.text.inverse },
  verified: { color: nativeColors.status.success },
  urgent: { color: nativeColors.status.error },
  deal: { color: nativeColors.status.warning },
  warning: { color: nativeColors.status.warning },
  success: { color: nativeColors.status.success },
  featured: { color: nativeColors.text.inverse },
});
