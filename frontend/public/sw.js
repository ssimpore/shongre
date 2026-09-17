/*
 * Shongre service worker: Web Push only.
 *
 * It deliberately caches nothing. An offline shell would have to be kept in
 * step with every deploy and would mask real availability problems behind a
 * stale copy; the app already fails closed on a missing API instead.
 */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : "" };
  }
  const title = String(payload.title || "Shongre");
  const options = {
    body: String(payload.body || ""),
    icon: "/apple-touch-icon.png",
    badge: "/favicon-96x96.png",
    tag: payload.notificationId ? `shongre-${payload.notificationId}` : undefined,
    data: { linkUrl: typeof payload.linkUrl === "string" ? payload.linkUrl : "/notifications" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.linkUrl) || "/notifications";
  // Same-origin only: a push payload must never open an arbitrary site.
  const target = new URL(link.startsWith("/") ? link : "/notifications", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
