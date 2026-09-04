import { nativeColors, nativeTypography } from "@shongre/design-tokens/native";
import { StyleSheet, Text } from "react-native";
import { Badge } from "../primitives/Badge.native";
import type { ProBadgeProps } from "./identity-status.types";

/** Native counterpart of the canonical professional-account marker. */
export function ProBadge({
  label,
  size = "sm",
  accessibilityLabel,
}: ProBadgeProps) {
  return (
    <Badge
      variant="inverse"
      size={size}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      testID="ui-pro-badge"
    >
      <Text style={[styles.label, labelSizes[size]]}>
        {label.toLocaleUpperCase()}
      </Text>
    </Badge>
  );
}

const styles = StyleSheet.create({
  label: {
    color: nativeColors.text.inverse,
    fontFamily: nativeTypography.fontFamily.bold,
    letterSpacing: nativeTypography.letterSpacing.wide,
    textTransform: "uppercase",
  },
});

const labelSizes = StyleSheet.create({
  xs: {
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
