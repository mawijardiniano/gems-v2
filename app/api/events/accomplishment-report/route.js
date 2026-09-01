import { connectDB } from "@/lib/db";
import AccomplishmentReport from "@/models/accomplishment_report";
import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activityLog";
import { requireAuth } from "@/lib/auth";

export async function POST(req) {
  try {
    const { error, status, user } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });
    await connectDB();
    const body = await req.json();

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
    return NextResponse.json(
      { message: err.message },
      { status: 500 }
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
      .populate("event_id", "title venue start_dates end_dates")
      .sort({ createdAt: -1 });

    return NextResponse.json({
      status: "success",
      data: reports,
    });
  } catch (err) {
    return NextResponse.json(
      { message: err.message },
      { status: 500 }
    );
  }
}