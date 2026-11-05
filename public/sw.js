// Pacto service worker.
// App data is never cached: check-ins must always hit the server (fresh day in
// São Paulo, fresh auth). The only cached thing is a static "no connection" page,
// shown when a page navigation fails because the phone is offline.
// It also keeps the app installable and shows push notifications (src/lib/push.ts).

const OFFLINE_CACHE = "pacto-offline-v1";
const OFFLINE_FILES = ["/offline.html", "/lowpoly/computer.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(OFFLINE_CACHE)
      .then((cache) => cache.addAll(OFFLINE_FILES))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== OFFLINE_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.mode === "navigate") {
    // Network first, always; the offline page only when the network itself fails.
    event.respondWith(fetch(request).catch(() => caches.match("/offline.html")));
    return;
  }
  if (OFFLINE_FILES.includes(new URL(request.url).pathname) && new URL(request.url).origin === self.location.origin) {
    event.respondWith(fetch(request).catch(() => caches.match(request)));
  }
  // Everything else: plain network.
});

// --- Push notifications ------------------------------------------------------
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? "Pacto", {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url ?? "/hoje" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url ?? "/hoje", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      const open = wins.find((w) => w.url.startsWith(self.location.origin));
      return open ? open.navigate(url).then((w) => w?.focus()) : self.clients.openWindow(url);
    }),
  );
});
