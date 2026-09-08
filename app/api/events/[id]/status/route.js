import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Event from "@/models/event";
import { logActivity } from "@/lib/activityLog";
import { requireAuth } from "@/lib/auth";
import { cacheDelPrefix } from "@/lib/cache";

export async function PATCH(req, context) {
  try {
    const { error, status: authStatus, user } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status: authStatus });

    await connectDB();

    const params = await context.params;
    const { id } = params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Invalid event ID" },
        { status: 400 },
      );
    }

    const userId = user._id;

    const { status, cancelReason } = await req.json();
    const allowedStatus = ["active", "cancelled", "completed"];

    if (!allowedStatus.includes(status)) {
      return NextResponse.json(
        { message: "Invalid status value" },
        { status: 400 },
      );
    }

    const event = await Event.findById(id);
    if (!event) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 });
    }

    // Allow creator or Admin to change status (role from the DB, not the token)
    if (
      event.created_by.toString() !== userId.toString() &&
      user.role !== "Admin"
    ) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    // AUDIT: Track status changes with audit trail
    event.status = status;
    event.status_updated_by = userId;
    event.status_updated_at = new Date();

    // AUDIT: Track cancellation details
    if (status === "cancelled") {
      event.cancelled_by = userId;
      event.cancelled_at = new Date();
      event.cancel_reason = cancelReason || "";
    }

    await event.save();
    cacheDelPrefix("events:list:");

    await logActivity({
      user_id: userId,
      action: status === "cancelled" ? "EVENT_CANCEL" : "EVENT_UPDATE",
      description: `Updated event status to "${status}" for: ${event.title}`,
      req,
      metadata: { event_id: event._id, new_status: status, cancelReason: cancelReason || "" },
      resource_type: "event",
      resource_id: event._id,
      severity: status === "cancelled" ? "warning" : "info",
    });

    return NextResponse.json({
      message: `Event status updated to ${status}`,
      event,
    });
  } catch (error) {
    console.error("Update status error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
