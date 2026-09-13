import { Text, View, StyleSheet } from "react-native";
import { currentPresence, type UserPresence } from "@shongre/shared/presence";
import { PresenceIndicator } from "@shongre/ui/native";
import { messagesFr } from "@/i18n/messages.fr";
import {
  mobileColors as colors,
  nativeSizing,
  nativeSpacing as spacing,
  nativeTypography,
} from "@shongre/design-tokens/native";

export function PresenceStatus({
  presence,
  lastSeen = false,
}: {
  presence?: UserPresence;
  lastSeen?: boolean;
}) {
  const value = currentPresence(presence);
  const status = value?.status ?? "unknown";
  const date = value?.lastSeenAt ? Date.parse(value.lastSeenAt) : NaN;
  const label = messagesFr[`messaging.presence.${status}`];
  const description =
    lastSeen &&
    status !== "online" &&
    status !== "unknown" &&
    Number.isFinite(date)
      ? messagesFr["messaging.presence.lastSeen"].replace(
          "{date}",
          new Intl.DateTimeFormat("fr-FR", {
            dateStyle: "short",
            timeStyle: "short",
          }).format(date),
        )
      : "";
  return (
    <View
      style={styles.row}
      accessibilityLabel={[label, description].filter(Boolean).join(" · ")}
    >
      <PresenceIndicator status={status} label={label} decorative />
      <Text numberOfLines={1} style={styles.text}>
        {[label, description].filter(Boolean).join(" · ")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    minHeight: nativeSizing.iconSm,
  },
  text: {
    flexShrink: 1,
    color: colors.textMuted,
    fontSize: nativeTypography.size.caption,
  },
});
