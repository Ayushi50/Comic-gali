/* Comic Gali service worker: offline app shell + cached content.
   - navigations: network first, fall back to cached index.html (single-page app)
   - /assets/* (hashed, immutable): cache first
   - /content/* and fonts: stale-while-revalidate
   - offline packs live in the 'cg-packs-v1' cache, written by the page */
const SHELL = 'cg-shell-v1';
const RUNTIME = 'cg-runtime-v1';
const PACKS = 'cg-packs-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(['/', '/manifest.webmanifest', '/icon.svg', '/content/catalog.json'])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => ![SHELL, RUNTIME, PACKS].includes(k)).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

async function swr(req, cacheName) {
  const c = await caches.open(cacheName);
  const hit = (await c.match(req)) || (await caches.match(req));
  const net = fetch(req).then((r) => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }).catch(() => hit);
  return hit || net;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.pathname.startsWith('/api/')) return; // API calls always go to the network (auth, moderation, signed URLs)
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((r) => { caches.open(SHELL).then((c) => c.put('/', r.clone())); return r; }).catch(() => caches.match('/')));
    return;
  }
  if (url.origin === location.origin && url.pathname.startsWith('/assets/')) {
    e.respondWith(caches.match(req).then((h) => h || fetch(req).then((r) => { const cp = r.clone(); caches.open(RUNTIME).then((c) => c.put(req, cp)); return r; })));
    return;
  }
  if ((url.origin === location.origin && url.pathname.startsWith('/content/')) || /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(swr(req, RUNTIME));
  }
});
