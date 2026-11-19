import jwt from "jsonwebtoken";
import UserAuth from "@/models/user";
import { connectDB } from "@/data/lib/db";
import { rateLimiters } from "@/data/lib/rateLimit";
import { cacheGet, cacheSet, cacheDel } from "@/data/lib/cache";

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
    return {
      error: rateLimitResult.error,
      status: rateLimitResult.status,
      headers: rateLimitResult.headers,
    };
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

  /* 401 for every "this token does not identify an active user" case: a bad
     payload used to be 400 and a deleted account 404. */
  if (!decoded.id) {
    return { error: "Invalid token payload", status: 401 };
  }

  const user = await getCachedUser(decoded.id);
  if (!user) {
    return { error: "User not found", status: 401 };
  }

  /* Only login checked is_active, so a deactivated account's existing token
     kept working against every API until it expired. The user cache (15s)
     bounds how long a deactivation takes to apply. */
  if (user.is_active === false) {
    return { error: "This account has been deactivated", status: 401 };
  }

  /* A password change (own or admin reset) must end sessions opened with the
     old password. `passwordChangedAt` is stamped one second in the past on
     save, so a token issued right after the change still passes. */
  if (tokenPredatesPasswordChange(decoded, user)) {
    return { error: "Session expired, please log in again", status: 401 };
  }

  return { user };
}

export function tokenPredatesPasswordChange(decoded, user) {
  if (!user?.passwordChangedAt || !decoded?.iat) return false;
  const changedAt = new Date(user.passwordChangedAt).getTime();
  return Number.isFinite(changedAt) && decoded.iat * 1000 < changedAt;
}

/* Roles that read other people's records (staff dashboards, rosters). The
   plain `User` role — students and employees — only ever sees itself. */
export const STAFF_ROLES = [
  "Admin",
  "GAD Focal Person",
  "SUC President",
  "GAD Coordinator",
  "ICTU Director",
  "Planning Director",
  "Dean",
  "Campus Director",
];

/* Roles whose reads are confined to their own college/office. */
export const COLLEGE_SCOPED_ROLES = ["Dean", "GAD Coordinator"];

/**
 * Like requireAuth, but refuses the plain `User` role. Returns `scopeCollege`:
 * the college a scoped role is confined to, taken from the database — never
 * from the token or the query string.
 */
export async function requireStaff(req) {
  const result = await requireRole(req, STAFF_ROLES);
  if (result.error) return result;
  const scoped = COLLEGE_SCOPED_ROLES.includes(result.user.role);
  return {
    user: result.user,
    scopeCollege: scoped ? result.user.assignedCollege || "__none__" : null,
  };
}

export async function optionalAuth(req) {
  const rateLimitResult = await rateLimiters.api(req);
  if (rateLimitResult.error) {
    return {
      error: rateLimitResult.error,
      status: rateLimitResult.status,
      headers: rateLimitResult.headers,
    };
  }

  const token =
    req.cookies.get("auth_token")?.value ||
    req.headers.get("authorization")?.replace("Bearer ", "");

  if (!token) {
    return { user: null };
  }

  try {
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return { user: null };
    }

    if (!decoded.id) {
      return { user: null };
    }

    const user = await getCachedUser(decoded.id);
    return { user: user || null };
  } catch (err) {
    console.error("optionalAuth lookup failed:", err);
    return { user: null };
  }
}

export async function requireRole(req, roles) {
  const { user, error, status, headers } = await requireAuth(req);
  if (error) return { error, status, headers };

  if (!roles.includes(user.role)) {
    return { error: "Forbidden", status: 403 };
  }

  return { user };
}
