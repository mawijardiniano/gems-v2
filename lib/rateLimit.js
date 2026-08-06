
const buckets = new Map();


const CLEANUP_INTERVAL = 5 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) {
      buckets.delete(key);
    }
  }
}, CLEANUP_INTERVAL).unref();

/**
 * Rate limit middleware for Next.js API routes.
 * 
 * @param {Request} req - The Next.js request object
 * @param {Object} options - Rate limit options
 * @param {number} options.limit - Maximum number of requests allowed in the window
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {string} [options.keyPrefix] - Prefix for the rate limit key (e.g., 'login', 'api')
 * @param {boolean} [options.bypassAuth] - If true, rate limit by IP only (for public endpoints)
 * @returns {Promise<{error: string|null, status: number|null, headers: Object}>}
 */
export async function rateLimit(req, {
  limit = 100,
  windowMs = 60 * 1000, // 1 minute default
  keyPrefix = "api",
  bypassAuth = false,
} = {}) {
  // Get client IP from various sources
  const forwardedFor = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const cfConnectingIp = req.headers.get("cf-connecting-ip");
  
  const ip = cfConnectingIp || realIp || (forwardedFor ? forwardedFor.split(",")[0].trim() : "unknown");

  
  let userId = null;
  if (!bypassAuth) {
    const token = req.cookies?.get?.("auth_token")?.value || 
                  req.headers.get("authorization")?.replace("Bearer ", "");
    if (token) {
      try {
        const jwt = (await import("jsonwebtoken")).default;
        const decoded = jwt.decode(token);
        if (decoded?.id) userId = decoded.id;
      } catch {
        
      }
    }
  }

  
  const identifier = userId || ip;
  const key = `${keyPrefix}:${identifier}`;

  const now = Date.now();
  let bucket = buckets.get(key);

  
  if (!bucket || now > bucket.resetAt) {
    bucket = {
      count: 0,
      resetAt: now + windowMs,
    };
    buckets.set(key, bucket);
  }

  
  if (bucket.count >= limit) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
    return {
      error: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "X-RateLimit-Limit": String(limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.ceil(bucket.resetAt / 1000)),
      },
    };
  }


  bucket.count++;

  return {
    error: null,
    status: null,
    headers: {
      "X-RateLimit-Limit": String(limit),
      "X-RateLimit-Remaining": String(limit - bucket.count),
      "X-RateLimit-Reset": String(Math.ceil(bucket.resetAt / 1000)),
    },
  };
}


export const rateLimiters = {
  // Login: 5 attempts per minute per IP (brute force protection)
  login: (req) => rateLimit(req, { limit: 5, windowMs: 60 * 1000, keyPrefix: "login", bypassAuth: true }),
  
  // Register: 3 attempts per hour per IP
  register: (req) => rateLimit(req, { limit: 3, windowMs: 60 * 60 * 1000, keyPrefix: "register", bypassAuth: true }),
  
  // General API: 100 requests per minute per user
  api: (req) => rateLimit(req, { limit: 100, windowMs: 60 * 1000, keyPrefix: "api" }),
  
  // Sensitive operations (delete, update, etc.): 30 per minute per user
  sensitive: (req) => rateLimit(req, { limit: 30, windowMs: 60 * 1000, keyPrefix: "sensitive" }),
  
  // File uploads: 10 per minute per user
  upload: (req) => rateLimit(req, { limit: 10, windowMs: 60 * 1000, keyPrefix: "upload" }),
  
  // Password change: 3 per hour per user
  passwordChange: (req) => rateLimit(req, { limit: 3, windowMs: 60 * 60 * 1000, keyPrefix: "password" }),
  
  // Integration API: 50 per minute per user
  integration: (req) => rateLimit(req, { limit: 50, windowMs: 60 * 1000, keyPrefix: "integration" }),
  
  // Analytics/reports: 30 per minute per user
  analytics: (req) => rateLimit(req, { limit: 30, windowMs: 60 * 1000, keyPrefix: "analytics" }),
};