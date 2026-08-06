import { connectDB } from "@/lib/db";
import Notification from "@/models/notification";
import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(req) {
  const { error, status } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });

  await connectDB();

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const unreadOnly = searchParams.get("unread") === "true";
  const type = searchParams.get("type");

  if (!userId) {
    return Response.json({ message: "userId is required" }, { status: 400 });
  }

  const filter = {
    recipientId: userId,
    ...(unreadOnly ? { isRead: false } : {}),
    ...(type ? { type } : {}),
  };

  const notifications = await Notification.find(filter)
    .populate("senderId", "username role personal_info_id")
    .sort({ createdAt: -1 })
    .lean();

  const unreadCount = await Notification.countDocuments({
    recipientId: userId,
    isRead: false,
    ...(type ? { type } : {}),
  });

  return Response.json({ data: notifications, unreadCount });
}
