import {
  Image,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import {
  nativeBorders,
  nativeColors,
  nativeRadius,
  nativeSizing,
  nativeSpacing,
} from "@shongre/design-tokens/native";
import { Text } from "./Typography.native";
import { VerifiedIcon } from "../identity/VerifiedIcon.native";

export interface AvatarProps {
  src?: string;
  name: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  isVerified?: boolean;
  verifiedLabel?: string;
  style?: StyleProp<ViewStyle>;
}
const dimensions = {
  sm: nativeSizing.avatarSm,
  md: nativeSizing.avatarMd,
  lg: nativeSizing.avatarLg,
  xl: nativeSizing.avatarXl,
  "2xl": nativeSizing.avatar2xl,
} as const;
const verificationSizes = {
  sm: "xs",
  md: "xs",
  lg: "sm",
  xl: "md",
  "2xl": "md",
} as const;
const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
export function Avatar({
  src,
  name,
  size = "md",
  isVerified,
  verifiedLabel,
  style,
}: AvatarProps) {
  const dimension = dimensions[size];
  return (
    <View
      style={[styles.wrapper, { width: dimension, height: dimension }, style]}
      accessibilityLabel={`${name}${isVerified && verifiedLabel ? `, ${verifiedLabel}` : ""}`}
    >
      {src ? (
        <Image
          source={{ uri: src }}
          accessibilityLabel={name}
          style={[styles.image, { width: dimension, height: dimension }]}
        />
      ) : (
        <View
          style={[styles.fallback, { width: dimension, height: dimension }]}
        >
          <Text weight="semibold">{initials(name)}</Text>
        </View>
      )}
      {isVerified ? (
        <View style={styles.verified}>
          <VerifiedIcon size={verificationSizes[size]} />
        </View>
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  wrapper: { position: "relative" },
  image: { borderRadius: nativeRadius.pill },
  fallback: {
    borderRadius: nativeRadius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: nativeColors.surface.subtle,
    borderWidth: nativeBorders.hairline,
    borderColor: nativeColors.border.default,
  },
  verified: {
    position: "absolute",
    right: -nativeSpacing.xs / 2,
    bottom: -nativeSpacing.xs / 2,
    borderRadius: nativeRadius.pill,
    backgroundColor: nativeColors.surface.raised,
    paddingHorizontal: nativeSpacing.xs,
  },
});
