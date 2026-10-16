/* Prensa NexoraOne • Service Worker
 * Requisito para que Android/Chrome muestre el cartel de instalación como app.
 * Estrategia: red primero (noticias siempre frescas) con respaldo offline mínimo.
 */
const CACHE = "nexora-shell-v1";
const SHELL = ["/offline.html", "/icons/icon-192x192.png", "/icons/icon-512x512.png"];

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
  // Nunca interceptar API, subidas de audio/foto ni peticiones que no sean GET
  if (req.method !== "GET" || new URL(req.url).pathname.startsWith("/api/")) return;
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match("/offline.html")));
  }
});
