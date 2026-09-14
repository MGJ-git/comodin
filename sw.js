// Service worker: la app funciona sin conexión.
// - Archivos de la app: se sirven desde la caché al instante y se actualizan en segundo plano.
//   Si algo cambió (p. ej. datos.js), se avisa a la página para que ofrezca recargar.
// - SDK de Firebase (gstatic): se guarda la primera vez y luego sale de la caché.
// - Firestore/Auth: no se tocan; el propio SDK gestiona el modo sin conexión.
const CACHE = "comodin-v1";
const APP = [
  "./", "index.html", "datos.js", "sync.js", "firebase-config.js", "manifest.webmanifest",
  "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png",
];
const VIGILAR = /\/(index\.html|datos\.js|sync\.js|firebase-config\.js)?$/;

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(APP)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

async function avisar(){
  for (const c of await self.clients.matchAll()) c.postMessage({ tipo: "actualizado" });
}

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
    const enCache = await cache.match(clave);
    const red = fetch(req, { cache: "no-cache" }).then(async res => {
      if (!res.ok) return enCache || res;
      if (enCache && VIGILAR.test(url.pathname)){
        const [antes, ahora] = await Promise.all([enCache.clone().text(), res.clone().text()]);
        if (antes !== ahora) avisar();
      }
      await cache.put(clave, res.clone());
      return res;
    }).catch(() => enCache || Response.error());
    if (enCache){ e.waitUntil(red); return enCache; }
    return red;
  })());
});
