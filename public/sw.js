// Service worker for the Boardroom PWA.
// Strategy: cache the app shell on install, serve from cache when the network
// fails (so the installed app opens even if the Bolt-hosted site is down),
// and always try the network first for navigation + API/storage requests.
const SHELL_CACHE = 'boardroom-shell-v3';
const SHELL_ASSETS = [
  '/boardroom',
  '/',
  '/logo.png.png',
  '/manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS)).catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== SHELL_CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Never cache cross-origin API/storage calls (Supabase). Try network, fall
  // back to cache only if present; otherwise let it fail so the UI shows an
  // error state instead of a stale/blank response.
  if (url.origin !== self.location.origin) {
    event.respondWith(
      fetch(req).catch(() => caches.match(req).then((r) => r || Response.error())),
    );
    return;
  }

  // Same-origin navigations: network-first, fall back to cached shell.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put('/boardroom', copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('/boardroom').then((r) => r || caches.match('/'))),
    );
    return;
  }

  // Static assets: stale-while-revalidate.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
