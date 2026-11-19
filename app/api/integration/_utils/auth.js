import jwt from "jsonwebtoken";
import UserAuth from "@/models/user";
import { rateLimiters } from "@/data/lib/rateLimit";
import { tokenPredatesPasswordChange } from "@/data/lib/auth";

const JWT_SECRET = process.env.JWT_SECRET;

/* Shared by requireAdmin and requireIntegrationAccess. The role always comes
   from the database (a demoted user's token still says "Admin"), and the same
   account checks as requireAuth apply: a deactivated account, or a token
   issued before the last password change, is refused. Read fresh rather than
   through requireAuth's 15 s user cache, since these routes change roles and
   delete accounts. */
async function requireDbRole(req, allowedRoles, forbiddenMessage) {
  const rateLimitResult = await rateLimiters.integration(req);
  if (rateLimitResult.error) {
    return {
      error: rateLimitResult.error,
      status: rateLimitResult.status,
      headers: rateLimitResult.headers,
    };
  }

  const token = req.cookies.get("auth_token")?.value;
  if (!token) {
    return { error: "No token provided", status: 401 };
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch {
    return { error: "Invalid token", status: 401 };
  }
  if (!decoded?.id) {
    return { error: "Invalid token payload", status: 401 };
  }

  const user = await UserAuth.findById(decoded.id).select("-password").lean();
  if (!user) {
    return { error: "User not found", status: 401 };
  }
  if (user.is_active === false) {
    return { error: "This account has been deactivated", status: 401 };
  }
  if (tokenPredatesPasswordChange(decoded, user)) {
    return { error: "Session expired, please log in again", status: 401 };
  }

  if (!allowedRoles.includes(user.role)) {
    return { error: forbiddenMessage, status: 403 };
  }

  return { user };
}

export async function requireAdmin(req) {
  return requireDbRole(req, ["Admin"], "Forbidden: Admins only");
}

const INTEGRATION_ALLOWED_ROLES = ["Admin", "ICTU Director"];

/**
 * Same as requireAdmin but also allows the ICTU Director role,
 * which is responsible for data integration and manual uploads.
 */
export async function requireIntegrationAccess(req) {
  return requireDbRole(
    req,
    INTEGRATION_ALLOWED_ROLES,
    "Forbidden: Admins or ICTU Directors only",
  );
}
