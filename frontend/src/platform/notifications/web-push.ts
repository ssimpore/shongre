/**
 * The browser side of Web Push: permission, service worker, subscription.
 *
 * The API decides whether push is available (`getWebPushConfig`) and owns
 * the registration; this module only speaks to the browser and hands the
 * serialized subscription over. Nothing here is stored in localStorage: the
 * browser's own PushManager is the source of truth for "this device".
 */

export type WebPushSupport = "unsupported" | "denied" | "ready";

export function webPushSupport(): WebPushSupport {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    return "unsupported";
  }
  return Notification.permission === "denied" ? "denied" : "ready";
}

async function registration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration("/");
  if (existing) return existing;
  return navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

/** The subscription this browser already holds, if any. */
export async function currentWebPushSubscription(): Promise<string | null> {
  if (webPushSupport() === "unsupported") return null;
  const existing = await navigator.serviceWorker.getRegistration("/");
  const subscription = await existing?.pushManager.getSubscription();
  return subscription ? JSON.stringify(subscription.toJSON()) : null;
}

function applicationServerKey(publicKey: string): Uint8Array {
  const padding = "=".repeat((4 - (publicKey.length % 4)) % 4);
  const base64 = (publicKey + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

/**
 * Asks the visitor, registers the worker and subscribes. Answers the
 * serialized subscription for the API, or null when the visitor declined.
 */
export async function subscribeWebPush(
  publicKey: string,
): Promise<string | null> {
  if (webPushSupport() !== "ready") return null;
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;
  const worker = await registration();
  const subscription =
    (await worker.pushManager.getSubscription()) ??
    (await worker.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey(publicKey) as BufferSource,
    }));
  return JSON.stringify(subscription.toJSON());
}

/** Drops this browser's subscription; answers what was dropped. */
export async function unsubscribeWebPush(): Promise<string | null> {
  if (webPushSupport() === "unsupported") return null;
  const existing = await navigator.serviceWorker.getRegistration("/");
  const subscription = await existing?.pushManager.getSubscription();
  if (!subscription) return null;
  const serialized = JSON.stringify(subscription.toJSON());
  await subscription.unsubscribe();
  return serialized;
}
