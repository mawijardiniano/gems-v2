import { connectDB } from "@/lib/db";
import Event from "@/models/event";
import Project from "@/models/projects";
import "@/models/profile";
import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activityLog";
import { deleteFileFromBucket } from "@/lib/delete";
import AccomplishmentReport from "@/models/accomplishment_report";
import mongoose from "mongoose";
import { requireAuth, optionalAuth } from "@/lib/auth";
import { cacheDelPrefix } from "@/lib/cache";


const USER_POPULATE_BASE = {
  model: "UserAuth",
  select: "username role personal_info_id",
  populate: {
    path: "personal_info_id",
    model: "GemsProfile",
    select:
      "personal.first_name personal.last_name personal.birthday personal.currentStatus gadData.sexAtBirth affiliation.academic_information college course year_level affiliation.employment_information office", // Only needed fields
  },
};

export async function GET(req, { params }) {

  const { user, error, status } = await optionalAuth(req);
  if (error) return NextResponse.json({ error }, { status });

  const { id } = await params;

  if (!id)
    return NextResponse.json(
      { status: "error", message: "Missing event id" },
      { status: 400 },
    );

  // Guard against CastError crashes from malformed ids (e.g. mangled QR URLs)
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
  const { error, status } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });

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

  // Sanitize empty project/gad_activity values to avoid ObjectId cast errors
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

  const oldProjectId = event.project ? event.project.toString() : null;
  const newProjectId = body.project;

  event.set(body);
  console.log("event", event);
  if (!event.updated_by) {
    return NextResponse.json(
      { status: "error", message: "updated_by is required" },
      { status: 400 },
    );
  }
  event.updated_by = event.updated_by;

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

  try {
    await event.save();

    // Event updated - invalidate cached event lists.
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
  const { error, status } = await requireAuth(req);
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
    if (event.event_poster?.key) {
      await deleteFileFromBucket(event.event_poster.key);
    }

    const report = await AccomplishmentReport.findOne({ event_id: id });

    if (report) {
      const filesToDelete = [];

      if (report.office_memorandum?.key)
        filesToDelete.push(report.office_memorandum.key);
      if (report.activity_design?.key)
        filesToDelete.push(report.activity_design.key);
      if (report.attendance_sheet?.key)
        filesToDelete.push(report.attendance_sheet.key);

      if (Array.isArray(report.photos)) {
        report.photos.forEach((p) => p?.key && filesToDelete.push(p.key));
      }

      if (Array.isArray(report.other_attachments)) {
        report.other_attachments.forEach(
          (p) => p?.key && filesToDelete.push(p.key),
        );
      }

      for (const key of filesToDelete) {
        await deleteFileFromBucket(key);
      }

      await AccomplishmentReport.deleteOne({ event_id: id });
    }

    await Project.updateMany({ events: id }, { $pull: { events: id } });

    await Event.deleteOne({ _id: id });

    // Event deleted - invalidate cached event lists.
    cacheDelPrefix("events:list:");

    await logActivity({
      user_id: req.user?._id || null,
      action: "EVENT_DELETE",
      description: `Deleted event: ${event.title}`,
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
