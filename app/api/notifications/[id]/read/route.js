import { connectDB } from "@/lib/db";
import Notification from "@/models/notification";
import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function PATCH(req, { params }) {
  const { error, status } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });

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
