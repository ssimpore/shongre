import {
  iconStrokeWidths,
  nativeColors,
  nativeSizing,
} from "@shongre/design-tokens/native";
import { BadgeCheck } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import type {
  VerifiedIconProps,
  VerifiedIconSize,
} from "./identity-status.types";

const dimensions: Record<VerifiedIconSize, number> = {
  xs: nativeSizing.iconXs,
  sm: nativeSizing.iconSm,
  md: nativeSizing.iconMd,
  lg: nativeSizing.iconLg,
};

/** Native counterpart of the canonical verification mark. */
export function VerifiedIcon({ size = "sm", label }: VerifiedIconProps) {
  const dimension = dimensions[size];
  return (
    <View
      testID="ui-verified-icon"
      style={[styles.icon, { width: dimension, height: dimension }]}
      accessible={Boolean(label)}
      accessibilityRole={label ? "image" : undefined}
      accessibilityLabel={label}
    >
      <BadgeCheck
        size={dimension}
        color={nativeColors.text.inverse}
        fill={nativeColors.status.success}
        strokeWidth={iconStrokeWidths.regular}
        accessible={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  icon: { flexShrink: 0 },
});
