import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import {
  nativeColors,
  nativeOpacity,
  nativePalette,
  nativeRadius,
  nativeSizing,
  nativeSpacing,
  nativeTypography,
} from "@shongre/design-tokens/native";

export interface ButtonProps {
  children?: ReactNode;
  label?: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "pro";
  size?: "sm" | "compact" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  isLoading?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  icon?: ReactNode;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  children,
  label,
  onPress,
  variant = "primary",
  size = "md",
  disabled,
  loading,
  isLoading,
  accessibilityLabel,
  accessibilityHint,
  leftIcon,
  rightIcon,
  icon,
  fullWidth,
  style,
}: ButtonProps) {
  const busy = Boolean(loading || isLoading);
  const unavailable = Boolean(disabled || busy);
  const visibleLabel = children ?? label;
  const labelText = typeof visibleLabel === "string" ? visibleLabel : label;

  if (!visibleLabel && !accessibilityLabel) {
    throw new Error(
      "Button requires visible children/label or accessibilityLabel.",
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? labelText}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: unavailable, busy }}
      disabled={unavailable}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        sizeStyles[size],
        variantStyles[variant],
        fullWidth && styles.fullWidth,
        pressed && !unavailable && styles.pressed,
        unavailable && styles.disabled,
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator
          color={
            variant === "primary" || variant === "pro"
              ? nativeColors.action.onPrimary
              : nativeColors.action.primary
          }
        />
      ) : (
        (leftIcon ?? icon)
      )}
      {typeof visibleLabel === "string" || typeof visibleLabel === "number" ? (
        <Text
          style={[
            styles.label,
            labelSizeStyles[size],
            labelVariantStyles[variant],
          ]}
        >
          {visibleLabel}
        </Text>
      ) : (
        visibleLabel
      )}
      {!busy ? rightIcon : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: nativeRadius.control,
    paddingHorizontal: nativeSpacing.lg,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: nativeSpacing.sm,
    borderWidth: 1,
  },
  fullWidth: { width: "100%" },
  pressed: { opacity: nativeOpacity.pressed },
  disabled: { opacity: nativeOpacity.disabled },
  label: { fontFamily: nativeTypography.fontFamily.bold },
});

const sizeStyles = StyleSheet.create({
  sm: {
    minHeight: nativeSizing.controlSm,
    paddingHorizontal: nativeSpacing.md,
  },
  compact: { minHeight: nativeSizing.controlMd },
  md: { minHeight: nativeSizing.controlTouch },
  lg: {
    minHeight: nativeSizing.controlLg,
    paddingHorizontal: nativeSpacing.xl,
  },
});
const labelSizeStyles = StyleSheet.create({
  sm: { fontSize: nativeTypography.size.caption },
  compact: { fontSize: nativeTypography.size.bodySm },
  md: { fontSize: nativeTypography.size.bodySm },
  lg: { fontSize: nativeTypography.size.body },
});
const variantStyles = StyleSheet.create({
  primary: {
    backgroundColor: nativeColors.action.primary,
    borderColor: nativeColors.action.primary,
  },
  secondary: {
    backgroundColor: nativeColors.surface.raised,
    borderColor: nativeColors.border.strong,
  },
  outline: {
    backgroundColor: nativeColors.surface.raised,
    borderColor: nativeColors.border.default,
    borderWidth: 2,
  },
  ghost: { backgroundColor: "transparent", borderColor: "transparent" },
  danger: {
    backgroundColor: nativeColors.status.error,
    borderColor: nativeColors.status.error,
  },
  pro: {
    backgroundColor: nativePalette["stone-900"],
    borderColor: nativePalette["stone-900"],
  },
});
const labelVariantStyles = StyleSheet.create({
  primary: { color: nativeColors.action.onPrimary },
  secondary: { color: nativeColors.text.primary },
  outline: { color: nativeColors.text.primary },
  ghost: { color: nativeColors.action.primary },
  danger: { color: nativeColors.action.onPrimary },
  pro: { color: nativeColors.action.onPrimary },
});
