import ActivityLog from "@/models/activity_log";
import jwt from "jsonwebtoken";
import { canViewPII } from "@/lib/profileBroker";

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

async function writeLog(entry) {
  try {
    await ActivityLog.create(entry);
  } catch (err) {
    console.error("Activity log failed:", err);
  }
}


export function logActivity({
  user_id,
  action,
  description = "",
  req = null,
  metadata = {},
  severity = "info",
  resource_type = null,
  resource_id = null,
}) {
  const task = (async () => {
    const resolvedUserId = await resolveActorId({ user_id, req });
    await writeLog({
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
  })();

  if (severity === "info") {
    return;
  }

  return task;
}

/**
 * Records that someone viewed unmasked PII.
 *
 * Runs at `warning` severity so it is always awaited and always visible in
 * the activity log — a breach investigation needs a complete record of who
 * looked at whom, and when.
 *
 * `metadata` deliberately stores only identifiers (profile id, public id,
 * which field groups were revealed). The PII itself is never copied into the
 * log, because an activity entry has far weaker protection than the vault.
 */
export async function logPiiAccess({
  req = null,
  user_id = null,
  role = null,
  profileId = null,
  gemsPublicId = null,
  fields = [],
  context = "view",
}) {
  if (!canViewPII(role)) return;

  return logActivity({
    user_id,
    req,
    action: "PII_ACCESS",
    description: `Viewed full personal information${
      gemsPublicId ? ` for ${gemsPublicId}` : ""
    } (${context})`,
    severity: "warning",
    resource_type: "profile",
    resource_id: profileId,
    metadata: {
      role,
      profile_id: profileId,
      gems_public_id: gemsPublicId,
      fields,
      context,
    },
  });
}
