// AquaWatch service worker. Handles incoming Web Push events and
// re-focuses or opens the dashboard when the user taps the notification.

self.addEventListener("install", () => {
  // Take control of clients as soon as the new SW is installed
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = { title: "AquaWatch", body: "" };
  try {
    payload = event.data ? event.data.json() : payload;
  } catch {
    payload.body = event.data ? event.data.text() : "";
  }

  const { title, body, url = "/alerts", tag } = payload;

  event.waitUntil(
    self.registration.showNotification(title || "AquaWatch", {
      body: body || "",
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag: tag || "aquawatch",
      data: { url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsArr) => {
      // Focus an existing tab if one is open
      for (const c of clientsArr) {
        try {
          const u = new URL(c.url);
          if (u.origin === self.location.origin) {
            c.focus();
            if ("navigate" in c) c.navigate(targetUrl);
            return;
          }
        } catch {
          /* ignore */
        }
      }
      // Otherwise open a new tab
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    }),
  );
});
