const CACHE = "babi-cache-v1";

const filesToCache = [
  "/",
  "/index.html",
  "/style.css",
  "/script.js"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(filesToCache))
  );
});

self.addEventListener("fetch", event => {
  if (event.request.url.includes("/api/")) return;

  event.respondWith(
    caches.match(event.request).then(res => res || fetch(event.request))
  );
});
