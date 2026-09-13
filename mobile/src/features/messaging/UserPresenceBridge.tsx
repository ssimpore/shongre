import { useEffect } from "react";
import { AppState } from "react-native";
import {
  createPresenceClientId,
  startPresenceHeartbeat,
} from "@shongre/shared/presence";
import { useAuth } from "@/features/auth/AuthProvider";
import { messagingService } from "./messaging.service";

let notifyActivity: (() => void) | undefined;

/** Called by the one native root responder; it carries no identity or payload. */
export function notifyNativePresenceActivity() {
  notifyActivity?.();
}

export function UserPresenceBridge() {
  const { user, loading } = useAuth();
  const userId = user?.id;
  const allowed =
    !loading &&
    user?.capabilities?.includes("message.read.own") === true &&
    (!user.staffStatus || user.staffStatus === "none");

  useEffect(() => {
    if (!userId || !allowed) return;
    const heartbeat = startPresenceHeartbeat({
      clientId: createPresenceClientId(),
      send: (input, signal) => messagingService.updatePresence(input, signal),
      foreground: AppState.currentState === "active",
    });
    const subscription = AppState.addEventListener("change", (state) =>
      heartbeat.foreground(state === "active"),
    );
    notifyActivity = () => heartbeat.activity();
    return () => {
      notifyActivity = undefined;
      subscription.remove();
      heartbeat.stop();
    };
  }, [allowed, userId]);

  return null;
}
