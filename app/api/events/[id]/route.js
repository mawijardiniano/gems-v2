import { connectDB } from "@/lib/db";
import Event from "@/models/event";
import "@/models/profile";
import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activityLog";

export async function GET(req, { params }) {
  const { id } = await params;

  if (!id)
    return NextResponse.json(
      { status: "error", message: "Missing event id" },
      { status: 400 },
    );

  await connectDB();
  const event = await Event.findById(id)
    .populate({
      path: "created_by",
      model: "UserAuth",
      select: "username role personal_info_id",
      populate: {
        path: "personal_info_id",
        model: "GemsProfile",
      },
    })
    .populate({
      path: "registered_users",
      model: "UserAuth",
      select: "username role personal_info_id",
      populate: {
        path: "personal_info_id",
        model: "GemsProfile",
      },
    })
    .populate({
      path: "interested_users",
      model: "UserAuth",
      select: "username role personal_info_id",
      populate: {
        path: "personal_info_id",
        model: "GemsProfile",
      },
    })
    .populate({
      path: "not_interested_users",
      model: "UserAuth",
      select: "username role personal_info_id",
      populate: {
        path: "personal_info_id",
        model: "GemsProfile",
      },
    })
    .lean();
  if (!event)
    return NextResponse.json(
      { status: "error", message: "Event not found" },
      { status: 404 },
    );

  return NextResponse.json({ status: "success", data: event });
}

export async function PUT(req, { params }) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { status: "error", message: "Missing event id" },
      { status: 400 },
    );
  }

  await connectDB();
  const body = await req.json();
  console.log("body", body);

  const event = await Event.findById(id);
  if (!event) {
    return NextResponse.json(
      { status: "error", message: "Event not found" },
      { status: 404 },
    );
  }

  event.set(body);
  console.log("event", event);
  if (!event.updated_by) {
    return NextResponse.json(
      { status: "error", message: "updated_by is required" },
      { status: 400 },
    );
  }
  event.updated_by = event.updated_by;

  try {
    await event.save();

    const populated = await Event.findById(id)
      .populate({
        path: "created_by",
        model: "UserAuth",
        select: "username role personal_info_id",
        populate: { path: "personal_info_id", model: "GemsProfile" },
      })
      .populate({
        path: "registered_users",
        model: "UserAuth",
        select: "username role personal_info_id",
        populate: { path: "personal_info_id", model: "GemsProfile" },
      })
      .populate({
        path: "interested_users",
        model: "UserAuth",
        select: "username role personal_info_id",
        populate: { path: "personal_info_id", model: "GemsProfile" },
      })
      .populate({
        path: "not_interested_users",
        model: "UserAuth",
        select: "username role personal_info_id",
        populate: { path: "personal_info_id", model: "GemsProfile" },
      })
      .lean();

    await logActivity({
      user_id: event.updated_by,
      action: "EVENT_UPDATE",
      description: `Updated event: ${event.title}`,
      req,
      metadata: { event_id: event._id },
    });

    return NextResponse.json({ status: "success", data: populated });
  } catch (error) {
    console.error("Validation failed:", error);
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 400 },
    );
  }
}
