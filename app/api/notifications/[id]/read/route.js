import { connectDB } from "@/lib/db";
import Notification from "@/models/notification";

export async function PATCH(req, { params }) {
  await connectDB();

  const { id } = await params;

  const notification = await Notification.findByIdAndUpdate(
    id,
    { isRead: true, readAt: new Date() },
    { new: true },
  );

  if (!notification) {
    return Response.json(
      { message: "Notification not found" },
      { status: 404 },
    );
  }

  return Response.json({ data: notification });
}
