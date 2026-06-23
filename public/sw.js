/* Service worker minimalista: habilita uso sin conexión para los archivos de la app.
   No intercepta llamadas a APIs externas (como Alpha Vantage) para no servir
   cotizaciones de bolsa desactualizadas desde el caché. */

const CACHE_NAME = "vault-cache-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Solo cachea peticiones GET del mismo origen (los archivos de la app).
  if (request.method !== "GET" || !request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
