import ActivityLog from "@/models/activity_log";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

async function resolveActorId({ user_id, req }) {
  if (user_id) return user_id;
  if (!req) return null;
  try {
    const token = req.cookies.get("auth_token")?.value;
    if (!token) return null;
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded?.id || null;
  } catch {
    return null;
  }
}

export async function logActivity({
  user_id,
  action,
  description = "",
  req = null,
  metadata = {},
  severity = "info",
  resource_type = null,
  resource_id = null,
}) {
  try {
    const resolvedUserId = await resolveActorId({ user_id, req });
    await ActivityLog.create({
      user_id: resolvedUserId,
      action,
      description,
      severity,
      resource_type,
      resource_id,
      ip_address: req?.headers.get("x-forwarded-for") || "unknown",
      user_agent: req?.headers.get("user-agent") || "unknown",
      metadata,
    });
  } catch (err) {
    console.error("Activity log failed:", err);
  }
}
