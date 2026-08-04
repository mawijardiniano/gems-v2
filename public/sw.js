const CACHE_NAME = "gems-attendance-v2";
const STATIC_ASSETS = [
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
];

// Routes to precache during install so the app works
// even on the very first open after installation (offline)
const PRECACHE_ROUTES = ["/", "/events/discover"];

// Attendance flow API routes to cache with network-first strategy
const NETWORK_FIRST_URLS = [
  "/api/events/attendance",
  "/api/profile/my-profile",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/events/",
];

// Install: precache static assets AND the attendance flow pages
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(async (cache) => {
        // Cache static assets first
        await cache.addAll(STATIC_ASSETS);

        // Best-effort precache of critical routes (HTML shells)
        // so the app works offline even on first open after install.
        // Individual failures won't break the whole install.
        await Promise.allSettled(
          PRECACHE_ROUTES.map(async (route) => {
            try {
              const res = await fetch(route, {
                credentials: "same-origin",
              });
              if (res.ok) {
                await cache.put(route, res.clone());
              }
            } catch (err) {
              console.warn(`[PWA] Failed to precache route: ${route}`, err);
            }
          }),
        );
      })
      .then(() => self.skipWaiting()),
  );
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// Helper: is this an API request we should handle?
const isApiRequest = (url) => url.pathname.startsWith("/api/");

// Helper: should this request be network-first?
const isNetworkFirst = (url) => {
  return NETWORK_FIRST_URLS.some((prefix) => url.pathname.startsWith(prefix));
};

// Helper: build a cache key with the query string stripped, so
// /events/discover/[id]?attendance=1 matches the cached /events/discover/[id]
const stripQuery = (requestUrl) => {
  const u = new URL(requestUrl);
  u.search = "";
  u.hash = "";
  return u.toString();
};

// Fetch handler
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Same-origin only
  if (url.origin !== self.location.origin) return;

  // Skip non-GET requests (except POST /api/events/attendance handled via background sync)
  if (request.method !== "GET") return;

  // API requests: network-first with cache fallback
  if (isApiRequest(url)) {
    if (isNetworkFirst(url)) {
      event.respondWith(
        fetch(request)
          .then((response) => {
            // Cache successful GET responses
            if (response.ok || response.status === 404) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          })
          .catch(() => {
            // Try exact URL first, then without query string
            return caches
              .match(request)
              .then((cached) => {
                if (cached) return cached;
                return caches.match(stripQuery(request.url));
              })
              .then((cached) => {
                if (cached) return cached;
                // For API errors, return a JSON error response
                return new Response(
                  JSON.stringify({
                    message: "You are offline. Please check your connection.",
                    offline: true,
                  }),
                  {
                    status: 503,
                    headers: { "Content-Type": "application/json" },
                  },
                );
              });
          }),
      );
    } else {
      // Other API: network-only (don't cache mutations)
      event.respondWith(fetch(request));
    }
    return;
  }

  // Navigation requests: network-first, fallback to cache
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => {
          // Try exact URL first, then without query string
          return caches
            .match(request)
            .then((cached) => {
              if (cached) return cached;
              return caches.match(stripQuery(request.url));
            })
            .then((cached) => {
              if (cached) return cached;
              // Fallback to the events discover page if cached
              return caches.match("/events/discover").then((discoverFallback) => {
                if (discoverFallback) return discoverFallback;
                // Fallback to the landing page if cached
                return caches.match("/").then((landingFallback) => {
                  if (landingFallback) return landingFallback;
                  return new Response(
                    "<html><body><h1>Offline</h1><p>You need an internet connection to access this page.</p></body></html>",
                    { headers: { "Content-Type": "text/html" } },
                  );
                });
              });
            });
        }),
    );
    return;
  }

  // Static assets: cache-first
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/")
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        });
      }),
    );
  }
});

// Background Sync: replay queued attendance requests
self.addEventListener("sync", (event) => {
  if (event.tag === "attendance-sync") {
    event.waitUntil(replayAttendanceQueue());
  }
});

// Replay queued attendance POSTs from IndexedDB
async function replayAttendanceQueue() {
  try {
    const db = await openAttendanceDB();
    const tx = db.transaction("attendance", "readwrite");
    const store = tx.objectStore("attendance");
    const queued = await store.getAll();

    for (const item of queued) {
      try {
        const response = await fetch("/api/events/attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event_id: item.event_id,
            user_id: item.user_id,
            captured_at: item.captured_at,
          }),
        });

        if (response.ok || response.status === 400) {
          // 400 means the server rejected it (e.g. already attended, event not started)
          // drop from queue since retrying won't help
          await store.delete(item.id);
        }
        // Other statuses (5xx, network errors) - keep in queue and retry next sync
      } catch (err) {
        // Network error - keep in queue, retry later
        console.error("Attendance sync failed for item", item.id, err);
      }
    }
  } catch (err) {
    console.error("Failed to replay attendance queue:", err);
  }
}

// Open IndexedDB for the attendance queue
function openAttendanceDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("gems-pwa", 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("attendance")) {
        db.createObjectStore("attendance", { keyPath: "id", autoIncrement: true });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}