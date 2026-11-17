
const DEFAULT_TTL_MS = 30 * 1000; // 30 seconds

const store = new Map();

const inFlight = new Map();


export function cacheGet(key) {
  const entry = store.get(key);
  if (!entry) return undefined;

  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }

  return entry.value;
}


export function cacheSet(key, value, ttlMs = DEFAULT_TTL_MS) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}


export function cacheDel(key) {
  if (Array.isArray(key)) {
    key.forEach((k) => store.delete(k));
  } else {
    store.delete(key);
  }
}


export function cacheDelPrefix(prefix) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}


export function cacheFlush() {
  store.clear();
}


export async function cacheOrSet(key, fn, ttlMs = DEFAULT_TTL_MS) {
  const cached = cacheGet(key);
  if (cached !== undefined) return cached;

  if (inFlight.has(key)) {
    return inFlight.get(key);
  }

  const promise = (async () => {
    const value = await fn();
    cacheSet(key, value, ttlMs);
    return value;
  })();

  inFlight.set(key, promise);

  try {
    return await promise;
  } finally {
    inFlight.delete(key);
  }
}

const interval = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.expiresAt) store.delete(key);
  }
}, 60 * 1000);
if (typeof interval.unref === "function") interval.unref();