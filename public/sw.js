/* Prensa NexoraOne • Service Worker Enterprise PWA
 * Gestiona cache offline y notificaciones Push Web nativas en Android, iOS y Desktop.
 */
const CACHE = "nexora-shell-v2";
const SHELL = ["/offline.html", "/icons/icon-192x192.png", "/icons/icon-512x512.png", "/favicon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).pathname.startsWith("/api/")) return;
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match("/offline.html")));
  }
});

// ESCUCHADOR DE NOTIFICACIONES PUSH EN SEGUNDO PLANO
self.addEventListener("push", (event) => {
  let data = {
    title: "🚨 Alerta Editorial • Prensa NexoraOne",
    body: "Nuevo despacho urgente desde exteriores.",
    url: "/admin/corresponsal",
    tag: "nexora-breaking-alert"
  };

  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (err) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body || "Nuevo testimonio o flash urgente recibido.",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-192x192.png",
    vibrate: [300, 100, 300, 100, 450],
    data: {
      url: data.url || "/admin/corresponsal",
      timestamp: Date.now()
    },
    actions: [
      { action: "open", title: "🎙️ Abrir Noticia" },
      { action: "dismiss", title: "Cerrar" }
    ],
    tag: data.tag || "nexora-urgent-alert",
    renotify: true,
    requireInteraction: true
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// ACCION AL TOCAR LA NOTIFICACION EN EL MOVIL
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;

  const targetUrl = event.notification.data?.url || "/admin/corresponsal";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes("/admin") && "focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
