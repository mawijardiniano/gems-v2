import jwt from "jsonwebtoken";
import UserAuth from "@/models/user";
import { connectDB } from "@/lib/db";
import { rateLimiters } from "@/lib/rateLimit";
import { cacheGet, cacheSet, cacheDel } from "@/lib/cache";

const JWT_SECRET = process.env.JWT_SECRET;

const USER_CACHE_TTL_MS = 15 * 1000; // 15 seconds
const USER_CACHE_PREFIX = "user:";


export function invalidateUserCache(userId) {
  if (!userId) return;
  cacheDel(`${USER_CACHE_PREFIX}${userId}`);
}


async function getCachedUser(userId) {
  const cacheKey = `${USER_CACHE_PREFIX}${userId}`;
  const cached = cacheGet(cacheKey);
  if (cached !== undefined) return cached;

  await connectDB();
  const user = await UserAuth.findById(userId).select("-password").lean();
  if (user) {
    cacheSet(cacheKey, user, USER_CACHE_TTL_MS);
  }
  return user;
}

export async function requireAuth(req) {
  const rateLimitResult = await rateLimiters.api(req);
  if (rateLimitResult.error) {
    return { error: rateLimitResult.error, status: rateLimitResult.status, headers: rateLimitResult.headers };
  }

  const token =
    req.cookies.get("auth_token")?.value ||
    req.headers.get("authorization")?.replace("Bearer ", "");

  if (!token) {
    return { error: "No token provided", status: 401 };
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch {
    return { error: "Invalid or expired token", status: 401 };
  }

  if (!decoded.id) {
    return { error: "Invalid token payload", status: 400 };
  }

  const user = await getCachedUser(decoded.id);
  if (!user) {
    return { error: "User not found", status: 404 };
  }

  return { user };
}

export async function requireRole(req, roles) {
  const { user, error, status, headers } = await requireAuth(req);
  if (error) return { error, status, headers };

  if (!roles.includes(user.role)) {
    return { error: "Forbidden", status: 403 };
  }

  return { user };
}