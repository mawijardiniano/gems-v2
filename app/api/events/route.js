import { connectDB } from "@/lib/db";
import Event from "@/models/event";
import Project from "@/models/projects";
import "@/models/profile";
import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activityLog";
import { requireAuth } from "@/lib/auth";
import { cacheOrSet, cacheDelPrefix } from "@/lib/cache";
import { USER_POPULATE_BASE } from "@/lib/userPopulate";

const EVENTS_LIST_CACHE_TTL = 15 * 1000; // 15 seconds

const ALLOWED_CREATOR_ROLES = [
  "GAD Focal Person",
  "GAD Coordinator",
  "Dean",
];

export async function GET(req) {
  try {
    const { error, status, user } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });

    await connectDB();

    const { searchParams } = new URL(req.url);
    const created_by = searchParams.get("created_by");

    if (created_by) {
      const ORGANIZER_ROLES = [
        "Admin",
        "GAD Focal Person",
        "GAD Coordinator",
        "Dean",
      ];
      if (
        created_by !== user._id.toString() &&
        !ORGANIZER_ROLES.includes(user.role)
      ) {
        return NextResponse.json(
          { status: "error", message: "You can only filter by your own events." },
          { status: 403 },
        );
      }
    }

    const filter = created_by ? { created_by } : {};
    const cacheKey = `events:list:${created_by || "all"}`;

    const events = await cacheOrSet(
      cacheKey,
      async () => {
        return Event.find(filter)
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

    const { error, status, user } = await requireAuth(req);
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
      !type_of_activity ||
      !organizing_office_unit?.length ||
      target_number_of_participants == null ||
      Number(target_number_of_participants) < 0
    ) {
      return NextResponse.json(
        {
          message:
            "All fields are required. start_dates and end_dates must be arrays matching number_of_days.",
        },
        { status: 400 },
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
      created_by: user._id,
      updated_by: user._id,
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