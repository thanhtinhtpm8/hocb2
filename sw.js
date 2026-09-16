const CACHE_NAME = "b2vstep-v2";
const APP_SHELL = ["./", "./index.html", "./css/style.css", "./manifest.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(APP_SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// Network-first for same-origin GET requests, falling back to cache when offline.
// Content here (manifest + weekly JSON) grows over time, so a stale cache-first
// hit would hide newly added weeks/months from returning visitors who are online.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  e.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        const res = await fetch(e.request);
        if (res.ok) cache.put(e.request, res.clone());
        return res;
      } catch {
        const cached = await cache.match(e.request);
        if (cached) return cached;
        throw new Error("offline and not cached");
      }
    })
  );
});
