import { useEffect } from "react";
import {
  createPresenceClientId,
  startPresenceHeartbeat,
} from "@shongre/shared/presence";
import { services } from "../../api/client/service-registry";
import { useAuth } from "./AuthProvider";

export function UserPresenceBridge() {
  const { currentUser, effectivePermissions, isRestoring } = useAuth();
  const userId = currentUser?.id;
  const allowed =
    !isRestoring &&
    currentUser !== null &&
    effectivePermissions.includes("message.read.own") &&
    (!currentUser.staffStatus || currentUser.staffStatus === "none");
  useEffect(() => {
    if (!userId || !allowed) return;
    const heartbeat = startPresenceHeartbeat({
      clientId: createPresenceClientId(),
      send: (input, signal) => services.messaging.updatePresence(input, signal),
      foreground: document.visibilityState === "visible",
      connected: navigator.onLine,
    });
    const activity = () => heartbeat.activity();
    const visibility = () =>
      heartbeat.foreground(document.visibilityState === "visible");
    const hide = () => heartbeat.foreground(false);
    const show = () =>
      heartbeat.foreground(document.visibilityState === "visible");
    const online = () => heartbeat.connected(true);
    const offline = () => heartbeat.connected(false);
    const events = ["pointerdown", "pointermove", "keydown", "scroll"] as const;
    events.forEach((event) =>
      window.addEventListener(event, activity, { passive: true }),
    );
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", hide);
    window.addEventListener("pageshow", show);
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => {
      heartbeat.stop();
      events.forEach((event) => window.removeEventListener(event, activity));
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", hide);
      window.removeEventListener("pageshow", show);
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, [allowed, userId]);
  return null;
}
