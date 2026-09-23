// Offline support: app files are network-first (so updates show up), CDN libraries and fonts are cache-first.
const CACHE = 'pclab-v1';
const CORE = ['./', 'index.html', 'style.css', 'manifest.webmanifest', 'icons/icon-192.png',
  'js/main.js', 'js/kit.js', 'js/parts.js', 'js/museum.js', 'js/chips.js', 'js/features.js', 'js/compat.js', 'js/data.js'];

self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const sameOrigin = new URL(e.request.url).origin === location.origin;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const hit = await cache.match(e.request, { ignoreSearch: sameOrigin });
    if (!sameOrigin && hit) return hit;
    try {
      const res = await fetch(e.request);
      if (res.ok || res.type === 'opaque') cache.put(e.request, res.clone());
      return res;
    } catch (err) {
      if (hit) return hit;
      throw err;
    }
  }));
});
