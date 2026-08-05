const CACHE_NAME = "gems-attendance-v2";
const STATIC_ASSETS = [
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
];


const PRECACHE_ROUTES = ["/", "/events/discover"];


const NETWORK_FIRST_URLS = [
  "/api/events/attendance",
  "/api/profile/my-profile",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/events",
  "/api/events/",
];


self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(async (cache) => {
        // Cache static assets first
        await cache.addAll(STATIC_ASSETS);


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


self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});


const isApiRequest = (url) => url.pathname.startsWith("/api/");


const isNetworkFirst = (url) => {
  return NETWORK_FIRST_URLS.some((prefix) => url.pathname.startsWith(prefix));
};


const stripQuery = (requestUrl) => {
  const u = new URL(requestUrl);
  u.search = "";
  u.hash = "";
  return u.toString();
};

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);


  if (url.origin !== self.location.origin) return;


  if (request.method !== "GET") return;


  if (isApiRequest(url)) {
    if (isNetworkFirst(url)) {
      event.respondWith(
        fetch(request)
          .then((response) => {
            
            if (response.ok || response.status === 404) {
              const clone = response.clone();
              caches
                .open(CACHE_NAME)
                .then((cache) => cache.put(request, clone));
            }
            return response;
          })
          .catch(() => {
   
            return caches
              .match(request)
              .then((cached) => {
                if (cached) return cached;
                return caches.match(stripQuery(request.url));
              })
              .then((cached) => {
                if (cached) return cached;

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

      event.respondWith(fetch(request));
    }
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => {
          return caches
            .match(request)
            .then((cached) => {
              if (cached) return cached;
              return caches.match(stripQuery(request.url));
            })
            .then((cached) => {
              if (cached) return cached;
             
              return caches
                .match("/events/discover")
                .then((discoverFallback) => {
                  if (discoverFallback) return discoverFallback;
         
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

self.addEventListener("sync", (event) => {
  if (event.tag === "attendance-sync") {
    event.waitUntil(replayAttendanceQueue());
  }
});


async function notifyClientsAttendanceSynced(syncedItems) {
  if (!syncedItems || syncedItems.length === 0) return;
  const clients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  for (const client of clients) {
    client.postMessage({
      type: "ATTENDANCE_SYNCED",
      items: syncedItems,
    });
  }
}

async function replayAttendanceQueue() {
  try {
    const db = await openAttendanceDB();
    const tx = db.transaction("attendance", "readwrite");
    const store = tx.objectStore("attendance");
    const queued = await store.getAll();

    const syncedItems = [];

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

          await store.delete(item.id);
          let alreadyAttended = false;
          let errorCode = null;
          try {
            const body = await response.json();
            alreadyAttended = !!body.already_attended;
            errorCode = body.code || null;
          } catch (e) {

          }
          syncedItems.push({
            ...item,
            already_attended: alreadyAttended,
            error_code: errorCode,
          });
        }

      } catch (err) {

        console.error("Attendance sync failed for item", item.id, err);
      }
    }

    await notifyClientsAttendanceSynced(syncedItems);
  } catch (err) {
    console.error("Failed to replay attendance queue:", err);
  }
}

function openAttendanceDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("gems-pwa", 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("attendance")) {
        db.createObjectStore("attendance", {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}
