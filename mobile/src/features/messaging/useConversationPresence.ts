import { useCallback, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import {
  startPresenceObserver,
  type UserPresence,
} from "@shongre/shared/presence";
import { useAuth } from "@/features/auth/AuthProvider";
import { messagingService } from "./messaging.service";

export function useConversationPresence(
  conversationIds: readonly string[],
  marketCode: string,
): Readonly<Record<string, UserPresence>> {
  const { user } = useAuth();
  const userId = user?.id;
  const ids = [...new Set(conversationIds)].sort().join(",");
  const [result, setResult] = useState<{
    key: string;
    values: Record<string, UserPresence>;
  }>({ key: "", values: {} });
  const key = `${userId ?? ""}:${marketCode}:${ids}`;

  useFocusEffect(
    useCallback(() => {
      if (!userId || !ids) return;
      const observer = startPresenceObserver({
        read: (signal) =>
          messagingService.getPresence(ids.split(","), marketCode, signal),
        update: (items) =>
          setResult({
            key,
            values: Object.fromEntries(
              items.map((item) => [item.conversationId, item.presence]),
            ),
          }),
        visible: AppState.currentState === "active",
      });
      const subscription = AppState.addEventListener("change", (state) =>
        observer.visible(state === "active"),
      );
      return () => {
        subscription.remove();
        observer.stop();
      };
    }, [ids, key, marketCode, userId]),
  );

  return result.key === key ? result.values : {};
}
