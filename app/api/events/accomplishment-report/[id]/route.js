import { connectDB } from "@/lib/db";
import AccomplishmentReport from "@/models/accomplishment_report";
import Event from "@/models/event";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/activityLog";
import { requireAuth } from "@/lib/auth";
import { deleteFileFromBucket } from "@/lib/delete";

const collectFileKeys = (report) => {
  const keys = [];
  for (const field of ["office_memorandum", "activity_design", "attendance_sheet"]) {
    if (report?.[field]?.key) keys.push(report[field].key);
  }
  if (Array.isArray(report?.photos)) {
    report.photos.forEach((p) => p?.key && keys.push(p.key));
  }
  if (Array.isArray(report?.other_attachments)) {
    report.other_attachments.forEach((p) => p?.key && keys.push(p.key));
  }
  return keys;
};

export async function GET(req, { params }) {
  const { error, status } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });

  await connectDB();

  const { id } = await params;

  try {
    const report = await AccomplishmentReport.findOne({
      event_id: id,
    }).populate("event_id", "title venue start_dates end_dates");

    return NextResponse.json({ data: report });
  } catch (err) {
    return NextResponse.json(
      { message: err.message },
      { status: 500 }
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
        { status: 400 }
      );
    }
    const body = await req.json();

    const existing = await AccomplishmentReport.findOne({ event_id: id });
    if (!existing) {
      return NextResponse.json(
        { error: "Not found" },
        { status: 404 }
      );
    }

    // Only the report submitter, the event creator, or an Admin may edit
    const event = await Event.findById(id).select("created_by");
    const isSubmitter = existing.submitted_by?.toString() === user._id.toString();
    const isEventCreator = event?.created_by?.toString() === user._id.toString();
    if (!isSubmitter && !isEventCreator && user.role !== "Admin") {
      return NextResponse.json(
        { error: "You are not allowed to update this report" },
        { status: 403 }
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
      { new: true }
    );

    if (!updated) {
      return NextResponse.json(
        { error: "Not found" },
        { status: 404 }
      );
    }

    const keptKeys = new Set(collectFileKeys(updated));
    for (const key of oldFileKeys) {
      if (!keptKeys.has(key)) {
        try {
          await deleteFileFromBucket(key);
        } catch (err) {
          console.error("Failed to delete replaced report file:", key, err?.message);
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
    return NextResponse.json(
      { message: err.message },
      { status: 500 }
    );
  }
}