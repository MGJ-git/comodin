// Service worker: la app funciona sin conexión.
// - Archivos de la app: primero se intenta la red (máx. 3 s) para tener siempre la última versión;
//   si no hay conexión o tarda, se sirve la copia guardada.
// - SDK de Firebase (gstatic): se guarda la primera vez y luego sale de la caché.
// - Firestore/Auth: no se tocan; el propio SDK gestiona el modo sin conexión.
const CACHE = "comodin-v2";
const APP = [
  "./", "index.html", "datos.js", "sync.js", "firebase-config.js", "manifest.webmanifest",
  "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png",
];
const ESPERA_RED = 3000;

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(APP.map(u => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const propio = url.origin === self.location.origin;
  const sdk = url.hostname === "www.gstatic.com" && url.pathname.startsWith("/firebasejs/");
  if (!propio && !sdk) return;

  if (sdk){
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => {
      if (res.ok){ const copia = res.clone(); caches.open(CACHE).then(c => c.put(req, copia)); }
      return res;
    })));
    return;
  }

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const clave = req.mode === "navigate" ? "index.html" : new Request(url.origin + url.pathname);
    const red = fetch(req, { cache: "no-cache" }).then(async res => {
      if (res.ok) await cache.put(clave, res.clone());
      return res;
    });
    e.waitUntil(red.catch(() => {}));
    const enCache = cache.match(clave);
    // La red gana si responde en menos de ESPERA_RED; si no, la copia guardada (y la red sigue actualizando la caché)
    const tiempo = new Promise(res => setTimeout(res, ESPERA_RED));
    try {
      const r = await Promise.race([red, tiempo.then(() => null)]);
      if (r && r.ok) return r;
    } catch {}
    return (await enCache) || red.catch(() => Response.error());
  })());
});
