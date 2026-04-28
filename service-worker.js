const CACHE_NAME = "babi-bot-v5";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/style.css",
  "/script.js",
  "/favicon.png",
  "/icon-192.png",
  "/icon-512.png"
];

// ================= INSTALL =================
self.addEventListener("install", (event) => {
  console.log("Service Worker installing...");
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// ================= ACTIVATE =================
self.addEventListener("activate", (event) => {
  console.log("Service Worker activating...");

  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log("Deleting old cache:", key);
            return caches.delete(key);
          }
        })
      );
    })
  );

  self.clients.claim();
});

// ================= FETCH =================
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // 🚫 Skip non-GET (important for API POST like /api/chat)
  if (req.method !== "GET") return;

  // ================= API (NETWORK FIRST) =================
  if (req.url.includes("/api/")) {
    event.respondWith(
      fetch(req).catch(() => caches.match(req))
    );
    return;
  }

  // ================= STATIC (CACHE FIRST) =================
  if (
    req.destination === "style" ||
    req.destination === "script" ||
    req.destination === "image"
  ) {
    event.respondWith(
      caches.match(req).then(cached => {
        return (
          cached ||
          fetch(req).then(res => {
            return caches.open(CACHE_NAME).then(cache => {
              cache.put(req, res.clone());
              return res;
            });
          })
        );
      })
    );
    return;
  }

  // ================= HTML (NETWORK FIRST) =================
  event.respondWith(
    fetch(req)
      .then(res => {
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(req, res.clone());
          return res;
        });
      })
      .catch(() => caches.match("/index.html"))
  );
});