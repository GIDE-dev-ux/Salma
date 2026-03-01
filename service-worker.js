const CACHE =  "chatbot-cache-v2";

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
  event.respondWith(
    caches.match(event.request).then(res => res || fetch(event.request))
  );
});
