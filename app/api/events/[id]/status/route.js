import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Event from "@/models/event";
import { logActivity } from "@/lib/activityLog";

export async function PATCH(req, context) {
  try {
    await connectDB();

    const params = await context.params;
    const { id } = params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Invalid event ID" },
        { status: 400 }
      );
    }

    const { status, userId } = await req.json();
    const allowedStatus = ["active", "cancelled", "completed"];

    if (!allowedStatus.includes(status)) {
      return NextResponse.json(
        { message: "Invalid status value" },
        { status: 400 }
      );
    }

    const event = await Event.findById(id);
    if (!event) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 });
    }

    if (event.created_by.toString() !== userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    event.status = status;
    await event.save();

    await logActivity({
      user_id: userId,
      action: "EVENT_STATUS_UPDATE",
      description: `Updated event status to "${status}" for: ${event.title}`,
      req,
      metadata: { event_id: event._id, new_status: status },
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
