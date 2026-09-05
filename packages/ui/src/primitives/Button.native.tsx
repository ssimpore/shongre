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
  nativeBorders,
  nativeColors,
  nativeOpacity,
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
        unavailable && variant !== "primary" && styles.disabled,
        unavailable && variant === "primary" && styles.primaryDisabled,
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator
          color={
            variant === "primary" && unavailable
              ? nativeColors.text.primary
              : variant === "primary" || variant === "pro"
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
            unavailable && variant === "primary" && styles.primaryDisabledLabel,
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
    borderWidth: nativeBorders.hairline,
  },
  fullWidth: { width: nativeSizing.full },
  pressed: { opacity: nativeOpacity.pressed },
  disabled: { opacity: nativeOpacity.disabled },
  primaryDisabled: {
    backgroundColor: nativeColors.action.primaryDisabled,
    borderColor: nativeColors.action.primaryDisabledBorder,
  },
  primaryDisabledLabel: { color: nativeColors.text.primary },
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
    borderWidth: nativeBorders.strong,
  },
  ghost: {
    backgroundColor: nativeColors.surface.transparent,
    borderColor: nativeColors.surface.transparent,
  },
  danger: {
    backgroundColor: nativeColors.status.error,
    borderColor: nativeColors.status.error,
  },
  pro: {
    backgroundColor: nativeColors.surface.inverse,
    borderColor: nativeColors.surface.inverse,
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
