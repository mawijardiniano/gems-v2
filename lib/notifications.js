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
