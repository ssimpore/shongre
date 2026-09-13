import {
  nativeBorders,
  nativeColors,
  nativeRadius,
  nativeSizing,
  nativeSpacing,
} from "@shongre/design-tokens/native";
import { StyleSheet, View } from "react-native";
import type { PresenceIndicatorProps } from "./identity-status.types";

/** Native counterpart of the canonical compact presence mark. */
export function PresenceIndicator({
  status,
  label,
  size = "xs",
  decorative = false,
}: PresenceIndicatorProps) {
  return (
    <View
      testID="ui-presence-indicator"
      accessible={!decorative}
      accessibilityElementsHidden={decorative}
      accessibilityRole={decorative ? undefined : "image"}
      accessibilityLabel={decorative ? undefined : label}
      style={[styles.frame, size === "xs" ? styles.frameXs : styles.frameSm]}
    >
      <View
        accessibilityElementsHidden
        style={[
          styles.dot,
          size === "xs" ? styles.dotXs : styles.dotSm,
          status === "online"
            ? styles.online
            : status === "away"
              ? styles.away
              : status === "offline"
                ? styles.offline
                : styles.unknown,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: nativeRadius.pill,
    borderWidth: nativeBorders.hairline,
    borderColor: nativeColors.border.default,
    backgroundColor: nativeColors.surface.raised,
  },
  frameXs: {
    width: nativeSizing.iconSm,
    height: nativeSizing.iconSm,
  },
  frameSm: {
    width: nativeSizing.iconMd,
    height: nativeSizing.iconMd,
  },
  dot: { borderRadius: nativeRadius.pill },
  dotXs: {
    width: nativeSpacing.xs + nativeBorders.hairline,
    height: nativeSpacing.xs + nativeBorders.hairline,
  },
  dotSm: {
    width: nativeSpacing.sm,
    height: nativeSpacing.sm,
  },
  online: { backgroundColor: nativeColors.status.success },
  away: { backgroundColor: nativeColors.status.warning },
  offline: { backgroundColor: nativeColors.text.tertiary },
  unknown: { backgroundColor: nativeColors.text.disabled },
});
