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
      })
      .catch((err) => {
        console.error("[PWA] Service worker registration failed:", err);
      });
  });
}