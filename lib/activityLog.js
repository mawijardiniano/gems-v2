import ActivityLog from "@/models/activity_log";

export async function logActivity({
  user_id,
  action,
  description = "",
  req = null,
  metadata = {},
}) {
  try {
    await ActivityLog.create({
      user_id,
      action,
      description,
      ip_address: req?.headers.get("x-forwarded-for") || "unknown",
      user_agent: req?.headers.get("user-agent") || "unknown",
      metadata,
    });
  } catch (err) {
    console.error("Activity log failed:", err);
  }
}
