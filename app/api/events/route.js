import { connectDB } from "@/lib/db";
import { canonicalOfficeList } from "@/lib/colleges";
import Event from "@/models/event";
import Project from "@/models/projects";
import "@/models/profile";
import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activityLog";
import { requireAuth } from "@/lib/auth";
import { cacheOrSet, cacheDelPrefix } from "@/lib/cache";
import { USER_POPULATE_BASE, hydrateUserPopulate } from "@/lib/userPopulate";
import {
  eventYearFromDate,
  nextEventRefNumber,
} from "@/lib/referenceNumber";
import { EVENT_STATUSES } from "@/lib/eventStatus";

const EVENTS_LIST_CACHE_TTL = 15 * 1000; // 15 seconds

/* Hard ceiling on a single page, so ?limit=100000 cannot defeat pagination. */
const MAX_PAGE_SIZE = 200;

/* Keep in sync with the `type_of_activity` enum in models/event.js. */
const EVENT_ACTIVITY_TYPES = [
  "Academic",
  "Administrative",
  "GAD",
  "Extension",
  "Research",
  "Students",
  "Others",
];

/* Reuses the lifecycle module rather than repeating the list a third time. */
const EVENT_STATUS_VALUES = EVENT_STATUSES.map((entry) => entry.value);

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

    /* Filters are resolved on the server so the list page stops downloading
       every event in the system and discarding most of it in the browser. The
       old handler hydrated the whole collection (decrypting a vault identity per
       row) for a page that renders a few dozen cards. */
    const filter = {};
    if (created_by) filter.created_by = created_by;

    const type = searchParams.get("type");
    if (type) {
      if (!EVENT_ACTIVITY_TYPES.includes(type)) {
        return NextResponse.json(
          { status: "error", message: `Unknown activity type: ${type}` },
          { status: 400 },
        );
      }
      filter.type_of_activity = type;
    }

    const statusFilter = searchParams.get("status");
    if (statusFilter) {
      const requested = statusFilter.split(",").map((s) => s.trim()).filter(Boolean);
      if (requested.some((s) => !EVENT_STATUS_VALUES.includes(s))) {
        return NextResponse.json(
          { status: "error", message: `Unknown status: ${statusFilter}` },
          { status: 400 },
        );
      }
      filter.status = { $in: requested };
    }

    /* Year lives on the linked project, not the event, so it becomes an _id
       lookup rather than a filter on this collection. */
    const year = searchParams.get("year");
    if (year) {
      const yearNumber = Number(year);
      if (!Number.isFinite(yearNumber)) {
        return NextResponse.json(
          { status: "error", message: "year must be a number" },
          { status: 400 },
        );
      }
      const projectIds = await Project.find({ year: yearNumber }).distinct("_id");
      filter.project = { $in: projectIds };
    }

    const search = String(searchParams.get("q") || "").trim();
    if (search) {
      /* Escaped so a title containing a regex metacharacter cannot alter the
         query. */
      const safe = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = new RegExp(safe, "i");
      filter.$or = [
        { title: pattern },
        { reference_number: pattern },
        { venue: pattern },
      ];
    }

    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const rawLimit = Number(searchParams.get("limit"));
    const limit =
      Number.isFinite(rawLimit) && rawLimit > 0
        ? Math.min(Math.floor(rawLimit), MAX_PAGE_SIZE)
        : 0;
    const skip = limit ? (page - 1) * limit : 0;

    /* The cache key must describe the query, not just the creator. Keying on
       `created_by` alone let a type-filtered result be served to an unfiltered
       request (and vice versa) for the whole TTL. */
    const cacheKey = `events:list:${created_by || "all"}:${[
      type || "",
      statusFilter || "",
      year || "",
      search || "",
      page,
      limit,
    ].join("|")}`;

    const payload = await cacheOrSet(
      cacheKey,
      async () => {
        const query = Event.find(filter)
          .sort({ start_date: -1, createdAt: -1 })
          .skip(skip);

        /* An unbounded limit is only used by callers that genuinely need every
           row (the calendar, the report builders). `?limit=` makes the list
           page bounded. */
        if (limit) query.limit(limit);

        const rows = await query
          .populate({
            path: "created_by",
            ...USER_POPULATE_BASE,
          })
          .lean();

        /* The creator's name and birthday come from the vault now; without this
           the list renders blank names once the legacy columns are stripped.
           The role gate inside the hydrator decides who actually gets a
           decrypted identity. */
        const data = await hydrateUserPopulate(rows, user?.role);

        const total = limit ? await Event.countDocuments(filter) : data.length;

        return { data, total };
      },
      EVENTS_LIST_CACHE_TTL,
    );

    return NextResponse.json({
      status: "success",
      data: payload.data,
      meta: { page, limit: limit || payload.total, total: payload.total },
    });
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
      start_date,
      end_date,
      venue,
      type_of_activity,
      organizing_office_unit,
      co_organizing_office_unit,
      project,
      gad_activity,
      event_poster,
    } = body;

    /* Office names are stored in their canonical spelling (colleges always use
       "and"), so a client still sending the legacy "&" form cannot put it back
       on a record. */
    const officeUnits = canonicalOfficeList(organizing_office_unit);
    const coOfficeUnits = canonicalOfficeList(co_organizing_office_unit);

    if (
      !title ||
      !start_date ||
      !end_date ||
      !type_of_activity ||
      !officeUnits.length
    ) {
      return NextResponse.json(
        {
          message:
            "All fields are required, including start date/time and end date/time.",
        },
        { status: 400 },
      );
    }

    const parsedStartDate = new Date(start_date);
    const parsedEndDate = new Date(end_date);

    if (
      Number.isNaN(parsedStartDate.getTime()) ||
      Number.isNaN(parsedEndDate.getTime()) ||
      parsedEndDate < parsedStartDate
    ) {
      return NextResponse.json(
        {
          message:
            "Invalid event dates: end date/time must be after start date/time.",
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

    const isProjectBased = Boolean(project);

    if (isProjectBased) {
      if (type_of_activity !== "GAD") {
        return NextResponse.json(
          { message: "Project-based events must use the GAD activity type." },
          { status: 400 },
        );
      }
      if (!gad_activity || !String(gad_activity).trim()) {
        return NextResponse.json(
          {
            message:
              "A GAD Activity is required for project-based (GPB) events.",
          },
          { status: 400 },
        );
      }
    } else {
      if (type_of_activity === "GAD") {
        return NextResponse.json(
          {
            message:
              "GAD events must be project-based. Select Project-based (GPB) or choose another activity type.",
          },
          { status: 400 },
        );
      }
      if (gad_activity && String(gad_activity).trim()) {
        return NextResponse.json(
          { message: "Independent events cannot be linked to a project." },
          { status: 400 },
        );
      }
    }

    // Event created - invalidate cached event lists.
    cacheDelPrefix("events:list:");

    const eventData = {
      title,
      description,
      start_date: parsedStartDate,
      end_date: parsedEndDate,
      /* The legacy start_dates/end_dates/number_of_days fields are no longer
         written. Every reader now asks eventSpan() in lib/eventStatus.js, which
         falls back to the arrays for rows created before this change. */
      venue,
      type_of_activity,
      organizing_office_unit: officeUnits,
      co_organizing_office_unit: coOfficeUnits,
      created_by: user._id,
      updated_by: user._id,
      ...(project ? { project } : {}),
      ...(project && gad_activity ? { gad_activity } : { gad_activity: "" }),
      event_poster: event_poster || {
        url: "",
        key: "",
      },
    };

    /* The reference number is derived from the type of activity + start year,
       e.g. GAD-2025-001. Auto-assigned numbers can collide when two events are
       created at the same moment; the unique index rejects the loser and we
       retry with the next one. */
    const eventYear = eventYearFromDate(parsedStartDate);
    const MAX_REF_ATTEMPTS = 3;
    let newEvent = null;
    let lastRefError = null;

    for (let attempt = 0; attempt < MAX_REF_ATTEMPTS; attempt += 1) {
      const usedRefs = await Event.find({
        type_of_activity,
        reference_number: { $ne: null },
      }).select("reference_number");

      eventData.reference_number = nextEventRefNumber(
        type_of_activity,
        eventYear,
        usedRefs.map((doc) => doc.reference_number),
      );

      try {
        newEvent = await Event.create(eventData);
        break;
      } catch (err) {
        lastRefError = err;
        if (err?.code === 11000) continue;
        throw err;
      }
    }

    if (!newEvent) throw lastRefError;

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