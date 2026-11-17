import { connectDB } from "@/data/lib/db";
import AccomplishmentReport from "@/models/accomplishment_report";
import Event from "@/models/event";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/data/lib/activityLog";
import { requireAuth } from "@/data/lib/auth";
import { findForeignReportKey } from "@/data/lib/eventFileKeys";

export async function POST(req) {
  try {
    const { error, status, user } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });
    await connectDB();
    const body = await req.json();

    const { event_id } = body;
    if (!event_id || !mongoose.Types.ObjectId.isValid(event_id)) {
      return NextResponse.json(
        { message: "Valid event_id is required" },
        { status: 400 },
      );
    }

    const event = await Event.findById(event_id).select("created_by");
    if (!event) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 });
    }

    /* Same owners as PUT: without this, anyone could file the report first
       and lock the real organizer out with a 409. */
    if (
      String(event.created_by) !== String(user._id) &&
      user.role !== "Admin"
    ) {
      return NextResponse.json(
        { message: "Only the event's creator can submit its report." },
        { status: 403 },
      );
    }

    const foreignKey = findForeignReportKey(body, { userId: user._id });
    if (foreignKey) {
      return NextResponse.json(
        { message: "One of the attached files was not uploaded by you." },
        { status: 400 },
      );
    }

    const existingReport = await AccomplishmentReport.findOne({ event_id });
    if (existingReport) {
      return NextResponse.json(
        {
          message:
            "A report already exists for this event. Update the existing report instead.",
        },
        { status: 409 },
      );
    }

    const report = await AccomplishmentReport.create({
      event_id: body.event_id,
      narrative: body.narrative,
      office_memorandum: body.office_memorandum,
      activity_design: body.activity_design,
      attendance_sheet: body.attendance_sheet,
      photos: body.photos,
      other_attachments: body.other_attachments,
      submitted_by: user._id,
      status: "submitted",
    });

    await logActivity({
      req,
      action: "ACCOMPLISHMENT_CREATE",
      description: `Accomplishment report created`,
      resource_type: "accomplishment",
      resource_id: report._id,
      severity: "info",
      metadata: { event_id: body.event_id },
    });

    return NextResponse.json({ status: "success", data: report });
  } catch (err) {
    /* Two submits racing past the findOne both reach create; the unique
       event_id index rejects the second. */
    if (err?.code === 11000) {
      return NextResponse.json(
        {
          message:
            "A report already exists for this event. Update the existing report instead.",
        },
        { status: 409 },
      );
    }
    console.error("POST /api/events/accomplishment-report failed:", err);
    return NextResponse.json(
      { message: "Unable to create report." },
      { status: 500 },
    );
  }
}

export async function GET(req) {
  try {
    const { error, status } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });
    await connectDB();

    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("event_id");

    let query = {};

    if (eventId) {
      query.event_id = eventId;
    }

    const reports = await AccomplishmentReport.find(query)
      .populate(
        "event_id",
        "title venue start_date end_date start_dates end_dates",
      )
      .sort({ createdAt: -1 });

    return NextResponse.json({
      status: "success",
      data: reports,
    });
  } catch (err) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
