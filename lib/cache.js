/**
 * Lightweight in-memory TTL cache for API responses.
 * Use for read-heavy, low-write endpoints (analytics, activity logs, etc.)
 * so repeat hits skip the DB entirely.
 */

const DEFAULT_TTL_MS = 30 * 1000; // 30 seconds

const store = new Map();

/**
 * Get a value from the cache.
 * @param {string} key
 * @returns {*} Returns the cached value or undefined if missing/expired.
 */
export function cacheGet(key) {
  const entry = store.get(key);
  if (!entry) return undefined;

  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }

  return entry.value;
}

/**
 * Set a value in the cache.
 * @param {string} key
 * @param {*} value
 * @param {number} ttlMs Time-to-live in milliseconds.
 */
export function cacheSet(key, value, ttlMs = DEFAULT_TTL_MS) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

/**
 * Delete a key (or array of keys) from the cache.
 * @param {string|string[]} key
 */
export function cacheDel(key) {
  if (Array.isArray(key)) {
    key.forEach((k) => store.delete(k));
  } else {
    store.delete(key);
  }
}

/**
 * Delete all cache entries whose key starts with the given prefix.
 * @param {string} prefix
 */
export function cacheDelPrefix(prefix) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

/**
 * Clear the entire cache.
 */
export function cacheFlush() {
  store.clear();
}

/**
 * Get a value from cache or compute + cache it.
 * @param {string} key
 * @param {Function} fn Async function that produces the value on a miss.
 * @param {number} ttlMs
 */
export async function cacheOrSet(key, fn, ttlMs = DEFAULT_TTL_MS) {
  const cached = cacheGet(key);
  if (cached !== undefined) return cached;

  const value = await fn();
  cacheSet(key, value, ttlMs);
  return value;
}

const interval = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.expiresAt) store.delete(key);
  }
}, 60 * 1000);
if (typeof interval.unref === "function") interval.unref();