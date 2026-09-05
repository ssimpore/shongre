import { Image, StyleSheet, View } from "react-native";
import {
  nativeAspect,
  nativeSizing,
  nativeSpacing,
} from "@shongre/design-tokens/native";
import { mobileBrandImages } from "../brand-images.generated";

export type BrandLogoVariant = "primary" | "reverse";
export type BrandLogoSize = "compact" | "standard";

const sizes = StyleSheet.create({
  compact: {
    width: nativeSizing.brandLogoCompact,
    aspectRatio: nativeAspect.brandLogo,
  },
  standard: {
    width: nativeSizing.brandLogoStandard,
    aspectRatio: nativeAspect.brandLogo,
  },
});

export interface BrandLogoProps {
  variant?: BrandLogoVariant;
  size?: BrandLogoSize;
  decorative?: boolean;
  accessibilityLabel?: string;
}

export function BrandLogo({
  variant = "primary",
  size = "compact",
  decorative = false,
  accessibilityLabel = "SHONGRE.",
}: BrandLogoProps) {
  return (
    <View style={styles.clearSpace}>
      <Image
        source={mobileBrandImages[variant]}
        style={sizes[size]}
        resizeMode="contain"
        accessible={!decorative}
        accessibilityRole={decorative ? undefined : "image"}
        accessibilityLabel={decorative ? undefined : accessibilityLabel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  clearSpace: { alignSelf: "flex-start", padding: nativeSpacing.sm },
});
