// Woodshed service worker — offline app shell + library (lives in library/ because that
// directory is the app's publicDir, so it ships at the web root next to index.html).
// - Navigations + index.json: network-first, so a deploy is picked up whenever online.
// - Everything else same-origin (hashed assets, fonts, chart masters): stale-while-
//   revalidate — instant from cache, refreshed in the background. A chart you've opened
//   once is readable with no signal.
const CACHE = 'woodshed-v1';
const PRECACHE = ['./', 'index.json'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  const fresh = req.mode === 'navigate' || url.pathname.endsWith('/index.json');
  e.respondWith(fresh ? networkFirst(req) : staleWhileRevalidate(req));
});

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    const hit = await cache.match(req);
    if (hit) return hit;
    if (req.mode === 'navigate') {
      const shell = await cache.match('./');
      if (shell) return shell;
    }
    return Response.error();
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  const refresh = fetch(req)
    .then((res) => { if (res && res.ok) cache.put(req, res.clone()); return res; })
    .catch(() => undefined);
  return hit || (await refresh) || Response.error();
}
