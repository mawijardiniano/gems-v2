import { connectDB } from "@/data/lib/db";
import AccomplishmentReport from "@/models/accomplishment_report";
import Event from "@/models/event";
import Project from "@/models/projects";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/data/lib/activityLog";
import { requireAuth } from "@/data/lib/auth";
import { findForeignReportKey } from "@/data/lib/eventFileKeys";
import {
  canManageEvent,
  canReadAllEventReports,
  canViewEventReport,
} from "@/data/lib/eventAccess";

const MAX_REPORTS = 1000;

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
    if (!canManageEvent(user, event)) {
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
    const { error, status, user } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });
    await connectDB();

    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("event_id");

    let query = {};

    if (eventId) {
      if (!mongoose.Types.ObjectId.isValid(eventId)) {
        return NextResponse.json(
          { message: "Invalid event_id" },
          { status: 400 },
        );
      }
      const event = await Event.findById(eventId).select("created_by").lean();
      if (!event) {
        return NextResponse.json({ message: "Event not found" }, { status: 404 });
      }
      if (!canViewEventReport(user, event)) {
        return NextResponse.json(
          { message: "You are not allowed to view this report." },
          { status: 403 },
        );
      }
      query.event_id = eventId;
    } else {
      const eventFilter = {};
      /* Reports carry file keys for signed attendance sheets; any account
         used to list all of them. Others see only their own events'. */
      if (!canReadAllEventReports(user.role)) {
        eventFilter.created_by = user._id;
      }
      /* `?year=` narrows to one GPB year's events, as on GET /api/events. The
         year lives on the linked project. The GAD-AR print builder used to
         read every year's reports to use one year's. */
      const year = searchParams.get("year");
      if (year) {
        const yearNumber = Number(year);
        if (!Number.isFinite(yearNumber)) {
          return NextResponse.json(
            { message: "year must be a number" },
            { status: 400 },
          );
        }
        const projectIds = await Project.find({ year: yearNumber }).distinct(
          "_id",
        );
        eventFilter.project = { $in: projectIds };
      }
      if (Object.keys(eventFilter).length > 0) {
        const events = await Event.find(eventFilter).select("_id").lean();
        query.event_id = { $in: events.map((e) => e._id) };
      }
    }

    /* Bounded: the GAD-AR print builder reads this list, and an unbounded,
       non-lean read of every report grew with the collection. */
    const reports = await AccomplishmentReport.find(query)
      .populate(
        "event_id",
        "title venue start_date end_date start_dates end_dates",
      )
      .sort({ createdAt: -1 })
      .limit(MAX_REPORTS)
      .lean();

    return NextResponse.json({
      status: "success",
      data: reports,
    });
  } catch (err) {
    console.error("GET /api/events/accomplishment-report failed:", err);
    return NextResponse.json(
      { message: "Unable to load reports." },
      { status: 500 },
    );
  }
}
