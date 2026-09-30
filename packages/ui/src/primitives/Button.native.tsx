import type { ReactNode, Ref } from "react";
import { interaction } from "@shongre/design-tokens";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type AccessibilityRole,
  type AccessibilityState,
  type StyleProp,
  type ViewStyle,
  type View,
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

import { useReducedMotion } from "../hooks/useReducedMotion.native";

export interface ButtonProps {
  ref?: Ref<View>;
  children?: ReactNode;
  label?: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "pro";
  size?: "sm" | "compact" | "md";
  disabled?: boolean;
  loading?: boolean;
  isLoading?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: AccessibilityState;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  icon?: ReactNode;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  ref,
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
  accessibilityRole = "button",
  accessibilityState,
  leftIcon,
  rightIcon,
  icon,
  fullWidth,
  style,
}: ButtonProps) {
  const reducedMotion = useReducedMotion();
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
      ref={ref}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel ?? labelText}
      accessibilityHint={accessibilityHint}
      accessibilityState={{
        ...accessibilityState,
        disabled: unavailable,
        busy,
      }}
      disabled={unavailable}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        size === "sm" && styles.small,
        variantStyles[variant],
        fullWidth && styles.fullWidth,
        pressed &&
          !unavailable &&
          (variant === "primary" && !reducedMotion
            ? styles.primaryPressed
            : variant === "primary"
              ? styles.stillPressed
              : styles.pressed),
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
              : variant === "primary"
                ? nativeColors.action.onPrimary
                : variant === "pro" || variant === "danger"
                  ? nativeColors.text.inverse
                  : nativeColors.text.primary
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
    minHeight: nativeSizing.controlTouch,
    minWidth: nativeSizing.controlTouch,
    maxWidth: nativeSizing.full,
    paddingHorizontal: nativeSpacing.lg,
    paddingVertical: nativeSpacing.xs,
    flexShrink: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: nativeSpacing.sm,
    borderWidth: nativeBorders.hairline,
  },
  fullWidth: { width: nativeSizing.full },
  small: { paddingHorizontal: nativeSpacing.md },
  stillPressed: { borderColor: nativeColors.border.strong },
  pressed: { opacity: nativeOpacity.pressed },
  primaryPressed: { transform: [{ scale: interaction.pressScale }] },
  disabled: { opacity: nativeOpacity.disabled },
  primaryDisabled: {
    backgroundColor: nativeColors.action.primaryDisabled,
    borderColor: nativeColors.action.primaryDisabledBorder,
  },
  primaryDisabledLabel: { color: nativeColors.text.primary },
  label: {
    fontFamily: nativeTypography.fontFamily.bold,
    flexShrink: 1,
    textAlign: "center",
  },
});

const labelSizeStyles = StyleSheet.create({
  sm: { fontSize: nativeTypography.size.caption },
  compact: { fontSize: nativeTypography.size.bodySm },
  md: { fontSize: nativeTypography.size.bodySm },
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
  danger: { color: nativeColors.text.inverse },
  pro: { color: nativeColors.text.inverse },
});
