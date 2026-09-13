import type { ReactNode } from "react";
import {
  StyleSheet,
  Text,
  View,
  type AccessibilityRole,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import {
  nativeBorders,
  nativeColors,
  nativeRadius,
  nativeSizing,
  nativeSpacing,
  nativeTypography,
} from "@shongre/design-tokens/native";
import type { BadgeVariant } from "./Badge.web";
import type { BadgeSize } from "./Badge.web";

export interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityRole?: AccessibilityRole;
  testID?: string;
}
export function Badge({
  children,
  variant = "neutral",
  size = "sm",
  icon,
  style,
  accessibilityLabel,
  accessibilityRole,
  testID,
}: BadgeProps) {
  return (
    <View
      style={[styles.base, sizes[size], variants[variant], style]}
      accessible={Boolean(accessibilityLabel)}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      testID={testID}
    >
      {icon}
      {typeof children === "string" ? (
        <Text style={[styles.label, sizeLabels[size], labels[variant]]}>
          {children}
        </Text>
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
    maxWidth: nativeSizing.full,
    borderRadius: nativeRadius.md,
    borderWidth: nativeBorders.hairline,
    gap: nativeSpacing.xs,
  },
  label: {
    flexShrink: 1,
    fontFamily: nativeTypography.fontFamily.semibold,
  },
});
const sizes = StyleSheet.create({
  xs: {
    paddingHorizontal: nativeSpacing.xs,
    paddingVertical: nativeSpacing.xs / 2,
    gap: nativeSpacing.xs / 2,
  },
  sm: {
    paddingHorizontal: nativeSpacing.sm,
    paddingVertical: nativeSpacing.xs / 2,
  },
  md: {
    paddingHorizontal: nativeSpacing.sm + nativeSpacing.xs / 2,
    paddingVertical: nativeSpacing.xs,
    gap: nativeSpacing.sm - nativeSpacing.xs / 2,
  },
});
const sizeLabels = StyleSheet.create({
  xs: {
    fontFamily: nativeTypography.fontFamily.bold,
    fontSize: nativeTypography.size.overline,
    lineHeight: nativeTypography.size.overline,
  },
  sm: {
    fontSize: nativeTypography.size.micro,
    lineHeight: nativeTypography.size.micro,
  },
  md: {
    fontSize: nativeTypography.size.xs,
    lineHeight: nativeTypography.size.xs,
  },
});
const variants = StyleSheet.create({
  neutral: {
    backgroundColor: nativeColors.surface.mutedAlternative,
    borderColor: nativeColors.border.disabled,
  },
  primary: {
    backgroundColor: nativeColors.action.primarySubtle,
    borderColor: nativeColors.action.primaryBorder,
  },
  boosted: {
    backgroundColor: nativeColors.surface.raised,
    borderColor: nativeColors.action.primaryBorder,
  },
  inverse: {
    backgroundColor: nativeColors.surface.inverse,
    borderColor: nativeColors.surface.inverse,
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
  neutral: { color: nativeColors.text.emphasis },
  primary: { color: nativeColors.text.primary },
  boosted: {
    color: nativeColors.action.primary,
    fontFamily: nativeTypography.fontFamily.bold,
  },
  inverse: { color: nativeColors.text.inverse },
  urgent: { color: nativeColors.status.error },
  deal: { color: nativeColors.status.warning },
  warning: { color: nativeColors.status.warning },
  success: { color: nativeColors.status.success },
  featured: {
    color: nativeColors.action.onPrimary,
    fontFamily: nativeTypography.fontFamily.bold,
  },
});
