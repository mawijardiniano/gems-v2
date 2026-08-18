import { connectDB } from "@/lib/db";
import Event from "@/models/event";
import UserAuth from "@/models/user";
import Project from "@/models/projects";
import "@/models/profile";
import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activityLog";
import { requireAuth } from "@/lib/auth";
import { cacheOrSet, cacheDelPrefix } from "@/lib/cache";

const EVENTS_LIST_CACHE_TTL = 15 * 1000; // 15 seconds

const ALLOWED_CREATOR_ROLES = [
  "GAD Focal Person",
  "GAD Coordinator",
  "Dean",
];

export async function GET(req) {
  try {
    const { error, status } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });

    await connectDB();

    const { searchParams } = new URL(req.url);
    const created_by = searchParams.get("created_by");

    const filter = created_by ? { created_by } : {};
    const cacheKey = `events:list:${created_by || "all"}`;

    const events = await cacheOrSet(
      cacheKey,
      async () => {
        return Event.find(filter)
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
      },
      EVENTS_LIST_CACHE_TTL,
    );

    return NextResponse.json({ status: "success", data: events });
  } catch (error) {
    console.error("GET /api/events error:", error);
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 },
    );
  }
}

export async function POST(req) {
  try {
    const { error, status } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });

    await connectDB();

    const body = await req.json();

    const {
      title,
      description,
      number_of_days,
      start_dates,
      end_dates,
      venue,
      created_by,
      type_of_activity,
      organizing_office_unit,
      co_organizing_office_unit,
      eligibility_criteria,
      target_number_of_participants,
      project,
      gad_activity,
      event_poster,
    } = body;

    if (
      !title ||
      !number_of_days ||
      !Array.isArray(start_dates) ||
      !Array.isArray(end_dates) ||
      start_dates.length !== Number(number_of_days) ||
      end_dates.length !== Number(number_of_days) ||
      !created_by ||
      !type_of_activity ||
      !co_organizing_office_unit ||
      !organizing_office_unit ||
      !eligibility_criteria ||
      !target_number_of_participants
    ) {
      return NextResponse.json(
        {
          message:
            "All fields are required. start_dates and end_dates must be arrays matching number_of_days.",
        },
        { status: 400 },
      );
    }

    const user = await UserAuth.findById(created_by);
    if (!user) {
      console.error("POST /api/events: Creator user not found", { created_by });
      return NextResponse.json(
        { message: "Creator user not found." },
        { status: 404 },
      );
    }

    if (!ALLOWED_CREATOR_ROLES.includes(user.role)) {
      console.error(
        "POST /api/events: Forbidden - user is not allowed to create events",
        {
          userId: user._id,
          username: user.username,
          role: user.role,
        },
      );
      return NextResponse.json(
        {
          message: `Only ${ALLOWED_CREATOR_ROLES.join(", ")} can create events.`,
          debug: { userId: user._id, username: user.username, role: user.role },
        },
        { status: 403 },
      );
    }

    if (type_of_activity === "GAD") {
      if (!project) {
        return NextResponse.json(
          { message: "A project is required when the type of activity is GAD." },
          { status: 400 },
        );
      }
      if (!gad_activity || !String(gad_activity).trim()) {
        return NextResponse.json(
          {
            message:
              "A GAD Activity is required when the type of activity is GAD.",
          },
          { status: 400 },
        );
      }
    }

    // Event created - invalidate cached event lists.
    cacheDelPrefix("events:list:");

    const newEvent = await Event.create({
      title,
      description,
      number_of_days,
      start_dates,
      end_dates,
      venue,
      type_of_activity,
      organizing_office_unit,
      co_organizing_office_unit,
      eligibility_criteria,
      target_number_of_participants,
      created_by,
      updated_by: created_by,
      registered_users: [],
      ...(project ? { project } : {}),
      gad_activity,
      event_poster: event_poster || {
        url: "",
        key: "",
      },
    });

    if (project) {
      await Project.findByIdAndUpdate(
        project,
        { $addToSet: { events: newEvent._id } },
        { new: true },
      );
    }

    await logActivity({
      user_id: user._id,
      action: "EVENT_CREATE",
      description: `Created event: ${title}`,
      req,
      metadata: { event_id: newEvent?._id },
    });

    if (global.io) {
      global.io.emit("event:created", {
        event: newEvent,
        createdBy: user._id,
      });
    }

    return NextResponse.json(
      { message: "Event created successfully", event: newEvent },
      { status: 201 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 },
    );
  }
}

export async function DELETE(req) {
  try {
    const { error, status } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });

    await connectDB();

    const result = await Event.deleteMany({});

    // Events deleted - invalidate cached event lists.
    cacheDelPrefix("events:list:");

    return NextResponse.json({
      status: "success",
      message: `Deleted ${result.deletedCount} event.`,
    });
  } catch (error) {
    console.error("Error deleting all events:", error);
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 },
    );
  }
}