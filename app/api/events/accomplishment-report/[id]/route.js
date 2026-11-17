import { connectDB } from "@/data/lib/db";
import AccomplishmentReport from "@/models/accomplishment_report";
import Event from "@/models/event";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/data/lib/activityLog";
import { requireAuth } from "@/data/lib/auth";
import { deleteFileFromBucket } from "@/data/lib/delete";
import {
  collectReportFileKeys as collectFileKeys,
  findForeignReportKey,
} from "@/data/lib/eventFileKeys";

export async function GET(req, { params }) {
  const { error, status } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });

  const { id } = await params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ message: "Invalid event id" }, { status: 400 });
  }

  try {
    await connectDB();
    /* `data: null` (200) still means "no report yet" — ReportTab relies on it
       to show the empty form rather than an error. */
    const report = await AccomplishmentReport.findOne({
      event_id: id,
    })
      .populate("event_id", "title venue start_date end_date start_dates end_dates")
      .lean();

    return NextResponse.json({ data: report });
  } catch (err) {
    console.error("GET /api/events/accomplishment-report/[id] failed:", err);
    return NextResponse.json(
      { message: "Unable to load report." },
      { status: 500 },
    );
  }
}

export async function PUT(req, { params }) {
  try {
    const { error, status, user } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });
    await connectDB();

    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Valid event id is required" },
        { status: 400 },
      );
    }
    const body = await req.json();

    const existing = await AccomplishmentReport.findOne({ event_id: id });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Only the report submitter, the event creator, or an Admin may edit
    const event = await Event.findById(id).select("created_by");
    const isSubmitter =
      existing.submitted_by?.toString() === user._id.toString();
    const isEventCreator =
      event?.created_by?.toString() === user._id.toString();
    if (!isSubmitter && !isEventCreator && user.role !== "Admin") {
      return NextResponse.json(
        { error: "You are not allowed to update this report" },
        { status: 403 },
      );
    }

    /* Files already on the report may be kept; anything new must come from
       the caller's own uploads, since replaced keys get deleted below. */
    if (findForeignReportKey(body, { userId: user._id, existing })) {
      return NextResponse.json(
        { error: "One of the attached files was not uploaded by you." },
        { status: 400 },
      );
    }

    const oldFileKeys = collectFileKeys(existing);

    const updated = await AccomplishmentReport.findOneAndUpdate(
      { event_id: id },
      {
        narrative: body.narrative,
        office_memorandum: body.office_memorandum,
        activity_design: body.activity_design,
        attendance_sheet: body.attendance_sheet,
        photos: body.photos,
        other_attachments: body.other_attachments,
        updated_by: user._id,
      },
      { new: true },
    );

    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const keptKeys = new Set(collectFileKeys(updated));
    for (const key of oldFileKeys) {
      if (!keptKeys.has(key)) {
        try {
          await deleteFileFromBucket(key);
        } catch (err) {
          console.error(
            "Failed to delete replaced report file:",
            key,
            err?.message,
          );
        }
      }
    }

    await logActivity({
      req,
      action: "ACCOMPLISHMENT_UPDATE",
      description: `Accomplishment report updated`,
      resource_type: "accomplishment",
      resource_id: id,
      severity: "info",
      metadata: { event_id: id },
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (err) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
