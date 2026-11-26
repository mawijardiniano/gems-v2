/**
 * Next runs `register()` per server process AND per serverless function.
 *
 * Why the runtime check below matters: Next also executes this hook in the
 * Edge runtime, where `process.env` is not the Node environment. Calling
 * `assertJwtSecret()` there reads an absent `JWT_SECRET` and throws, which
 * Next reports as the opaque
 *
 *   Error: An error occurred while loading instrumentation hook: JWT_SECRET...
 *
 * That failure is worse than it looks. It does not fail the build: pages that
 * are static or edge-rendered keep serving 200, while every `/api/**` route
 * loads this hook, throws, and returns 500. The visible symptom is therefore a
 * site whose pages work and whose API is entirely dead — which reads as a
 * database or auth bug and sends you looking in the wrong place entirely.
 * Restricting the guard to the Node runtime removes the false positive without
 * weakening the check where it actually applies.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  /* Imported lazily so the Edge runtime never evaluates the module at all. */
  const { assertJwtSecret } = await import("@/data/lib/configGuards");
  assertJwtSecret();

  /* Daily HRMIS sync, when an admin has turned it on in the integration
     config. INTEGRATION_SCHEDULER=off keeps a process from running it (a
     second instance, or a machine pointed at a copy of the database). */
  if (process.env.INTEGRATION_SCHEDULER !== "off") {
    const { startSyncScheduler } = await import(
      "@/app/api/integration/_utils/syncScheduler"
    );
    startSyncScheduler();
  }
}
