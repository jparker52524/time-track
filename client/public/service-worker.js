const CACHE_NAME = "time-tracker-cache-v1";
const urlsToCache = [
  "/",            // index.html
  "/index.html",
  "/manifest.json"
];

// Install SW & cache app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

// Activate SW & clear old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => {
        if (key !== CACHE_NAME) return caches.delete(key);
      }))
    )
  );
});

// Intercept fetch requests
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // 👇 Skip caching for API requests (your EC2 backend)
  if (url.hostname.includes("localhost") || url.hostname.includes("54.226.148.89")) {
    return; // Let these requests go straight to the network
  }

  // Otherwise, use cache-first for static assets
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});