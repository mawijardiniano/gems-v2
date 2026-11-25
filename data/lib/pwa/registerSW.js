export function registerServiceWorker() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  const isProd = process.env.NODE_ENV === "production";
  const shouldRegister = isProd || process.env.NEXT_PUBLIC_ENABLE_PWA === "true";

  if (!shouldRegister) {
    console.log(
      "[PWA] Service worker registration skipped. Set NEXT_PUBLIC_ENABLE_PWA=true to enable in development.",
    );
    /* A worker registered earlier (PWA flag on before, or a production
       build on the same host) keeps controlling the page and serving its
       cache. Remove it and its caches so the page runs the current code. */
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => Promise.all(regs.map((r) => r.unregister())))
      .then(() => (window.caches ? caches.keys() : []))
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("gems-"))
            .map((k) => caches.delete(k)),
        ),
      )
      .catch(() => {});
    return;
  }

  /* A development build registers the worker in dev mode, where it never
     caches /_next/ chunks (see public/sw.js). */
  const swUrl = isProd ? "/sw.js" : "/sw.js?dev=1";

  const register = () => {
    navigator.serviceWorker
      .register(swUrl)
      .then((registration) => {
        console.log("[PWA] Service worker registered:", registration.scope);


        registration.update().catch((err) => {
          console.warn("[PWA] Service worker update check failed:", err);
        });

        navigator.serviceWorker.addEventListener("controllerchange", () => {
          /* Reload only when a new worker replaces an old one; the first
             install taking control needs no reload. */
          if (!hadController) return;
          console.log("[PWA] New service worker activated, reloading...");
          window.location.reload();
        });
      })
      .catch((err) => {
        console.error("[PWA] Service worker registration failed:", err);
      });
  };

  const hadController = Boolean(navigator.serviceWorker.controller);

  /* This runs from a React effect, which in development (and on a fast
     page) is often after the window "load" event has already fired; a
     listener added then never runs and the worker is never registered. */
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
}
