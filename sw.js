// Service Worker SIF-Portal — network-first
const CACHE = 'sif-portal-v1';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;
  // Solo interceptar navegacion al index
  if (!url.includes('index.html') && !url.endsWith('/SIF-Portal/') && !url.endsWith('/SIF-Portal')) return;
  e.respondWith(
    fetch(e.request, { cache: 'no-store' })
      .then(async networkRes => {
        if (networkRes.ok) {
          const cache = await caches.open(CACHE);
          const cached = await cache.match(e.request);
          if (cached) {
            const oldText = await cached.text();
            const newClone = networkRes.clone();
            const newText = await newClone.text();
            if (oldText !== newText) {
              await cache.put(e.request, new Response(newText, { headers: networkRes.headers }));
              // Notificar a los clientes que hay nueva version
              const clients = await self.clients.matchAll({ type: 'window' });
              clients.forEach(c => c.postMessage({ type: 'SW_UPDATE' }));
            }
          } else {
            await cache.put(e.request, networkRes.clone());
          }
        }
        return networkRes;
      })
      .catch(() => caches.match(e.request))
  );
});
