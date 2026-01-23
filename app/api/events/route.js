import { connectDB } from "@/lib/db";
import Event from "@/models/event";
import User from "@/models/user";
import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activityLog";

export async function GET() {
  try {
    await connectDB();

    const events = await Event.find().lean();

    return NextResponse.json({ status: "success", data: events });
  } catch (error) {
    console.error("GET /api/events error:", error);
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json();
    const { title, description, date, venue, created_by, invitation_rules } =
      body;

    if (!title || !date || !created_by) {
      return NextResponse.json(
        { message: "Title, date, and created_by are required." },
        { status: 400 }
      );
    }

    const user = await User.findById(created_by);
    if (!user) {
      return NextResponse.json(
        { message: "Creator user not found." },
        { status: 404 }
      );
    }

    const newEvent = await Event.create({
      title,
      description,
      date,
      venue,
      created_by,
      updated_by: created_by,
      invitation_rules,
      registered_users: [],
    });

    await logActivity({
      user_id: user._id,
      action: "EVENT_CREATE",
      description: `Created event: ${title}`,
      req,
      metadata: { event_id: newEvent?._id },
    });

    return NextResponse.json(
      { message: "Event created successfully", event: newEvent },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}
