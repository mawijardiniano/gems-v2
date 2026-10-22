import { assertJwtSecret } from "@/lib/configGuards";

/**
 * Next runs this once per server process, before any request is served. It is
 * the only place where a bad `JWT_SECRET` can stop the app at boot instead of
 * quietly signing forgeable Admin session cookies.
 *
 * Throws in production on a missing, short or placeholder secret; logs a
 * warning elsewhere so local setups keep working. See lib/configGuards.js.
 */
export async function register() {
  assertJwtSecret();
}
