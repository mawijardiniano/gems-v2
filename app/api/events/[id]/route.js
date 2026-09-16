import { connectDB } from "@/lib/db";
import Event from "@/models/event";
import Project from "@/models/projects";
import "@/models/profile";
import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activityLog";
import mongoose from "mongoose";
import { requireAuth, optionalAuth } from "@/lib/auth";
import { cacheDelPrefix } from "@/lib/cache";
import { deleteEventCascade } from "@/lib/eventCascade";
import { USER_POPULATE_BASE } from "@/lib/userPopulate";

const EDITABLE_FIELDS = [
  "title",
  "description",
  "start_date",
  "end_date",
  "venue",
  "type_of_activity",
  "organizing_office_unit",
  "co_organizing_office_unit",
  "eligibility_criteria",
  "target_number_of_participants",
  "project",
  "gad_activity",
  "event_poster",
];

export async function GET(req, { params }) {

  const { user, error, status } = await optionalAuth(req);
  if (error) return NextResponse.json({ error }, { status });

  const { id } = await params;

  if (!id)
    return NextResponse.json(
      { status: "error", message: "Missing event id" },
      { status: 400 },
    );

  if (!mongoose.isValidObjectId(id))
    return NextResponse.json(
      { status: "error", message: "Event not found" },
      { status: 404 },
    );

  try {
    await connectDB();

    let query = Event.findById(id);

    if (!user) {
      query = query.select(
        "-registered_users -interested_users -not_interested_users -participant_numbers -attended_users",
      );
    }

    const event = await query
      .populate({
        path: "created_by",
        ...USER_POPULATE_BASE,
      })
      .populate({
        path: "registered_users",
        ...USER_POPULATE_BASE,
      })
      .populate({
        path: "interested_users",
        ...USER_POPULATE_BASE,
      })
      .populate({
        path: "not_interested_users",
        ...USER_POPULATE_BASE,
      })
      .populate({
        path: "attended_users.user_id",
        ...USER_POPULATE_BASE,
      })
      .lean();

    if (!event)
      return NextResponse.json(
        { status: "error", message: "Event not found" },
        { status: 404 },
      );

    return NextResponse.json({ status: "success", data: event });
  } catch (err) {
    console.error("GET /api/events/[id] failed:", err);
    return NextResponse.json(
      { status: "error", message: "Unable to load event." },
      { status: err?.name === "CastError" ? 404 : 500 },
    );
  }
}

export async function PUT(req, { params }) {
  const { error, status, user } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });

  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { status: "error", message: "Missing event id" },
      { status: 400 },
    );
  }

  try {
    await connectDB();
    const body = await req.json();

    if (body.project === "" || body.project === null || body.project === undefined) {
      body.project = null;
    }
    if (body.gad_activity === "" || body.gad_activity === null || body.gad_activity === undefined) {
      body.gad_activity = "";
    }

    const event = await Event.findById(id);
    if (!event) {
      return NextResponse.json(
        { status: "error", message: "Event not found" },
        { status: 404 },
      );
    }

    if (
      event.created_by.toString() !== user._id.toString() &&
      user.role !== "Admin"
    ) {
      return NextResponse.json(
        { status: "error", message: "You are not allowed to edit this event" },
        { status: 403 },
      );
    }

    const oldProjectId = event.project ? event.project.toString() : null;
    const newProjectId = body.project ?? null;

    for (const field of EDITABLE_FIELDS) {
      if (body[field] !== undefined) {
        event.set(field, body[field]);
      }
    }

    if (body.start_date || body.end_date) {
      const legacyStart = event.start_date || body.start_date;
      const legacyEnd = event.end_date || body.end_date;
      if (legacyStart) event.set("start_dates", [legacyStart]);
      if (legacyEnd) event.set("end_dates", [legacyEnd]);
      if (!event.number_of_days) event.set("number_of_days", 1);
    }
    event.updated_by = user._id;

    await event.save();

    if (oldProjectId && oldProjectId !== newProjectId) {
      await Project.findByIdAndUpdate(oldProjectId, {
        $pull: { events: event._id },
      });
    }
    if (newProjectId && oldProjectId !== newProjectId) {
      await Project.findByIdAndUpdate(newProjectId, {
        $addToSet: { events: event._id },
      });
    }

    cacheDelPrefix("events:list:");

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

export async function DELETE(req, { params }) {
  const { error, status, user } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });

  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { status: "error", message: "Missing event id" },
      { status: 400 },
    );
  }

  await connectDB();

  const event = await Event.findById(id);

  if (!event) {
    return NextResponse.json(
      { status: "error", message: "Event not found" },
      { status: 404 },
    );
  }

  try {
    const { title } = await deleteEventCascade(event);

    // Event deleted - invalidate cached event lists.
    cacheDelPrefix("events:list:");

    await logActivity({
      user_id: user._id,
      action: "EVENT_DELETE",
      description: `Deleted event: ${title || event.title}`,
      req,
      metadata: { event_id: event._id },
    });

    return NextResponse.json({
      status: "success",
      message: "Event and related files deleted successfully",
    });
  } catch (error) {
    console.error("Delete failed:", error);

    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 400 },
    );
  }
}
