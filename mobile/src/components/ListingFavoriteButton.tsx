import { StyleSheet } from "react-native";
import { Button, SemanticIcon } from "@shongre/ui/native";
import {
  nativeColors,
  nativeRadius,
  nativeSizing,
  nativeSpacing,
} from "@shongre/design-tokens/native";

interface ListingFavoriteButtonProps {
  isFavorite: boolean;
  disabled?: boolean;
  loadState?: "loading" | "ready" | "error";
  label: string;
  onPress: () => void;
  onRetry?: () => void;
}

export function ListingFavoriteButton({
  isFavorite,
  disabled,
  loadState = "ready",
  label,
  onPress,
  onRetry,
}: ListingFavoriteButtonProps) {
  const retrying = loadState === "error";
  return (
    <Button
      accessibilityLabel={label}
      disabled={disabled || (retrying && !onRetry)}
      loading={loadState === "loading"}
      icon={
        <SemanticIcon
          name={retrying ? "refresh" : "heart"}
          size="md"
          color={
            retrying
              ? nativeColors.status.error
              : isFavorite
                ? nativeColors.action.primary
                : nativeColors.text.primary
          }
          filled={!retrying && isFavorite}
        />
      }
      onPress={retrying ? (onRetry ?? onPress) : onPress}
      size="compact"
      style={styles.control}
      variant="secondary"
    />
  );
}

const styles = StyleSheet.create({
  control: {
    width: nativeSizing.controlTouch,
    height: nativeSizing.controlTouch,
    minHeight: nativeSizing.controlTouch,
    paddingHorizontal: nativeSpacing.none,
    borderRadius: nativeRadius.pill,
    backgroundColor: nativeColors.surface.raised,
  },
});
