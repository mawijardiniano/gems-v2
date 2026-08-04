// Service worker registration helper
// Only registers in production (or when explicitly enabled in dev)
// to avoid stale caches during development

export function registerServiceWorker() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  const isProd = process.env.NODE_ENV === "production";
  // Register in dev too so you can test the PWA locally
  const shouldRegister = isProd || process.env.NEXT_PUBLIC_ENABLE_PWA === "true";

  if (!shouldRegister) {
    console.log(
      "[PWA] Service worker registration skipped. Set NEXT_PUBLIC_ENABLE_PWA=true to enable in development.",
    );
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("[PWA] Service worker registered:", registration.scope);

        // Force the service worker to check for updates immediately.
        // This ensures a newly deployed sw.js (e.g. after a Vercel push)
        // is detected and installed on the very next online visit,
        // without requiring the user to manually clear site data.
        registration.update().catch((err) => {
          console.warn("[PWA] Service worker update check failed:", err);
        });

        // When a new service worker takes control, reload the page so the
        // new version is used right away (instead of waiting for a 2nd visit).
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          console.log("[PWA] New service worker activated, reloading...");
          window.location.reload();
        });
      })
      .catch((err) => {
        console.error("[PWA] Service worker registration failed:", err);
      });
  });
}
