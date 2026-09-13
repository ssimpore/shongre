import { useEffect, useState } from "react";
import {
  startPresenceObserver,
  type UserPresence,
} from "@shongre/shared/presence";
import { useAuth } from "../../app/providers/AuthProvider";
import { services } from "../../api/client/service-registry";

export function useConversationPresence(
  conversationIds: readonly string[],
  scope = "",
) {
  const { currentUser } = useAuth();
  const ids = [...new Set(conversationIds)].sort().join(",");
  const key = `${currentUser?.id ?? ""}:${scope}:${ids}`;
  const [result, setResult] = useState<{
    key: string;
    values: Record<string, UserPresence>;
  }>({ key: "", values: {} });
  const userId = currentUser?.id;
  useEffect(() => {
    if (!userId || !ids) return;
    const observer = startPresenceObserver({
      read: (signal) => services.messaging.getPresence(ids.split(","), signal),
      update: (items) =>
        setResult({
          key,
          values: Object.fromEntries(
            items.map((item) => [item.conversationId, item.presence]),
          ),
        }),
      visible: document.visibilityState === "visible" && navigator.onLine,
    });
    const visibility = () =>
      observer.visible(
        document.visibilityState === "visible" && navigator.onLine,
      );
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("online", visibility);
    window.addEventListener("offline", visibility);
    return () => {
      observer.stop();
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("online", visibility);
      window.removeEventListener("offline", visibility);
    };
  }, [ids, key, userId]);
  return result.key === key ? result.values : {};
}
