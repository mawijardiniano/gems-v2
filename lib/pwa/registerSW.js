export function registerServiceWorker() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  const isProd = process.env.NODE_ENV === "production";
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


        registration.update().catch((err) => {
          console.warn("[PWA] Service worker update check failed:", err);
        });

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
