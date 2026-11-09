import Notification from "@/models/notification";
import UserAuth from "@/models/user";

export function normalizeRole(role) {
  return String(role || "")
    .trim()
    .toLowerCase();
}

export async function getPlanningDirectorIds(excludeUserId) {
  const planningDirectors = await UserAuth.find(
    {
      role: "Planning Director",
      is_active: true,
      ...(excludeUserId ? { _id: { $ne: excludeUserId } } : {}),
    },
    "_id",
  ).lean();

  return planningDirectors.map((user) => user._id);
}

/**
 * Ids of the active users holding one exact role, minus the actor.
 *
 * Roles are matched on the exact enum casing from models/user.js — unlike the
 * lowercase comparisons used for page gating, because this is a database query
 * rather than a client-side check.
 */
export async function getUserIdsByRole(role, excludeUserId) {
  const users = await UserAuth.find(
    {
      role,
      is_active: true,
      ...(excludeUserId ? { _id: { $ne: excludeUserId } } : {}),
    },
    "_id",
  ).lean();

  return users.map((user) => user._id);
}

/**
 * Roles told when a year's GPB is approved or disapproved.
 *
 * SUC President is deliberately absent: the status endpoint lets them *set* the
 * status (GPB_STATUS_ROLES in app/api/gpb/status/[id]/route.js), but
 * lib/roleAccess.js gives them no /gpb page, so a notification would have
 * nowhere to lead. GAD Coordinator is included even though they cannot set the
 * status — they can open the GPB and need to see the outcome.
 */
export const GPB_STATUS_NOTIFY_ROLES = [
  "GAD Focal Person",
  "GAD Coordinator",
  "Planning Director",
];

/** Everyone to notify about a GPB status change, excluding the actor. */
export async function getGpbStatusRecipientIds(excludeUserId) {
  /* One query per role rather than a single $in, so each role keeps its own
     exclusion path and a new role is a one-line change to the list above. */
  const lists = await Promise.all(
    GPB_STATUS_NOTIFY_ROLES.map((role) =>
      getUserIdsByRole(role, excludeUserId),
    ),
  );

  /* A user with several roles would otherwise be notified once per match;
     createNotifications already de-dupes, but flattening keeps this honest. */
  return [...new Set(lists.flat().map(String))];
}

export async function createNotifications({
  recipientIds,
  senderId,
  type,
  title,
  message,
  projectId,
  metadata = {},
}) {
  const uniqueRecipients = [
    ...new Set((recipientIds || []).filter(Boolean).map(String)),
  ];

  if (!uniqueRecipients.length) {
    return [];
  }

  const docs = uniqueRecipients.map((recipientId) => ({
    recipientId,
    senderId: senderId || null,
    type,
    title,
    message,
    projectId: projectId || null,
    metadata,
  }));

  const created = await Notification.insertMany(docs);

  if (global.io) {
    created.forEach((notification) => {
      global.io.emit("notification:new", {
        recipientId: String(notification.recipientId),
        notification,
      });
    });
  }

  return created;
}
