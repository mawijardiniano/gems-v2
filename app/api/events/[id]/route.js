import { connectDB } from "@/lib/db";
import Event from "@/models/event";
import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activityLog";

export async function GET(req, { params }) {
  const { id } = await params;

  if (!id)
    return NextResponse.json(
      { status: "error", message: "Missing event id" },
      { status: 400 }
    );

  await connectDB();
  const event = await Event.findById(id).lean();
  if (!event)
    return NextResponse.json(
      { status: "error", message: "Event not found" },
      { status: 404 }
    );

  return NextResponse.json({ status: "success", data: event });
}

export async function PUT(req, { params }) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { status: "error", message: "Missing event id" },
      { status: 400 }
    );
  }

  await connectDB();
  const body = await req.json();
  console.log("body", body);

  const event = await Event.findById(id);
  if (!event) {
    return NextResponse.json(
      { status: "error", message: "Event not found" },
      { status: 404 }
    );
  }

  event.set(body);
  console.log("event", event);
  if (!event.updated_by) {
    return NextResponse.json(
      { status: "error", message: "updated_by is required" },
      { status: 400 }
    );
  }
  event.updated_by = event.updated_by;

  try {
    const updated = await event.save();

    await logActivity({
      user_id: event.updated_by,
      action: "EVENT_UPDATE",
      description: `Updated event: ${event.title}`,
      req,
      metadata: { event_id: event._id },
    });

    return NextResponse.json({ status: "success", data: updated });
  } catch (error) {
    console.error("Validation failed:", error);
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 400 }
    );
  }
}
