import { connectDB } from "@/data/lib/db";
import { canonicalOfficeList } from "@/data/lib/colleges";
import Event from "@/models/event";
import Project from "@/models/projects";
import "@/models/profile";
import { NextResponse } from "next/server";
import { logActivity } from "@/data/lib/activityLog";
import { requireAuth } from "@/data/lib/auth";
import { cacheOrSet, cacheDelPrefix } from "@/data/lib/cache";
import {
  USER_POPULATE_BASE,
  hydrateUserPopulate,
} from "@/data/lib/userPopulate";
import {
  eventYearFromDate,
  nextEventRefNumber,
} from "@/data/lib/referenceNumber";
import mongoose from "mongoose";
import { EVENT_STATUSES, notEndedFilter } from "@/data/lib/eventStatus";
import { appEndOfDay, parseAppDate } from "@/data/lib/appTime";
import { canViewPII } from "@/data/lib/profileBroker";
import { isAcceptablePosterKey } from "@/data/lib/eventFileKeys";
import { checkEventProjectLink } from "@/data/lib/eventProjectLink";
import {
  EVENT_CREATOR_ROLES,
  hasEventOversight,
  organizingOfficeError,
} from "@/data/lib/eventAccess";
import { emitToUser } from "@/data/lib/realtime";

const EVENTS_LIST_CACHE_TTL = 15 * 1000; // 15 seconds

/* Hard ceiling on a single page, so ?limit=100000 cannot defeat pagination. */
const MAX_PAGE_SIZE = 200;
/* A date range is already bounded; this only stops a pathological range. */
const MAX_RANGE_SIZE = 1000;

/* Read from the model so the filter and the schema enum cannot drift. */
const EVENT_ACTIVITY_TYPES = Event.schema.path("type_of_activity").enumValues;

/* Reuses the lifecycle module rather than repeating the list a third time. */
const EVENT_STATUS_VALUES = EVENT_STATUSES.map((entry) => entry.value);


export async function GET(req) {
  try {
    const { error, status, user } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });

    await connectDB();

    const { searchParams } = new URL(req.url);
    const created_by = searchParams.get("created_by");

    if (created_by && !mongoose.isValidObjectId(created_by)) {
      return NextResponse.json(
        { status: "error", message: "Invalid created_by" },
        { status: 400 },
      );
    }

    if (created_by) {
      /* Another user's events: oversight roles only. */
      if (created_by !== user._id.toString() && !hasEventOversight(user.role)) {
        return NextResponse.json(
          {
            status: "error",
            message: "You can only filter by your own events.",
          },
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
      const requested = statusFilter
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
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
      const projectIds = await Project.find({ year: yearNumber }).distinct(
        "_id",
      );
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

    /* ?upcoming=1 — only events that have not ended, soonest first, for the
       discover/dashboard lists that used to download every event and hide the
       finished ones in the browser. Always bounded. */
    const upcomingOnly = searchParams.get("upcoming") === "1";
    if (upcomingOnly) {
      filter.$and = [...(filter.$and || []), notEndedFilter()];
    }

    /* ?from=YYYY-MM-DD&to=YYYY-MM-DD — events overlapping those Manila days,
       for the calendar, which used to download every event to draw a month.
       Legacy rows with only start_dates/end_dates are matched through them. */
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const rangeFrom = fromParam ? parseAppDate(fromParam) : null;
    const rangeTo = toParam ? parseAppDate(toParam) : null;
    if (rangeFrom === undefined || rangeTo === undefined) {
      return NextResponse.json(
        { status: "error", message: "from/to must be dates (YYYY-MM-DD)" },
        { status: 400 },
      );
    }
    const hasRange = Boolean(rangeFrom || rangeTo);
    if (hasRange) {
      const conditions = [];
      if (rangeTo) {
        /* Starts on or before the last day of the range. */
        const toEnd = new Date(appEndOfDay(rangeTo));
        conditions.push({
          $or: [
            { start_date: { $lte: toEnd } },
            { start_date: null, start_dates: { $elemMatch: { $lte: toEnd } } },
          ],
        });
      }
      if (rangeFrom) {
        /* Ends on or after the first day of the range. */
        conditions.push(notEndedFilter(rangeFrom));
      }
      filter.$and = [...(filter.$and || []), ...conditions];
    }

    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const rawLimit = Number(searchParams.get("limit"));
    const limit =
      Number.isFinite(rawLimit) && rawLimit > 0
        ? Math.min(Math.floor(rawLimit), MAX_PAGE_SIZE)
        : upcomingOnly
          ? MAX_PAGE_SIZE
          : MAX_RANGE_SIZE;
    const skip = limit ? (page - 1) * limit : 0;

    /* The cache key must describe the query, not just the creator. Keying on
       `created_by` alone let a type-filtered result be served to an unfiltered
       request (and vice versa) for the whole TTL. */
    /* The hydrator decrypts creator identities only for PII-cleared roles, so
       the key must separate those callers or a cleared user's response would
       be served (decrypted) to everyone else for the TTL. */
    const piiScope = canViewPII(user?.role) ? "pii" : "masked";
    const cacheKey = `events:list:${piiScope}:${created_by || "all"}:${[
      type || "",
      statusFilter || "",
      year || "",
      search || "",
      upcomingOnly ? "upcoming" : "",
      hasRange ? `${fromParam || ""}~${toParam || ""}` : "",
      page,
      limit,
    ].join("|")}`;

    const payload = await cacheOrSet(
      cacheKey,
      async () => {
        const query = Event.find(filter)
          .sort(
            upcomingOnly
              ? { start_date: 1, createdAt: 1 }
              : { start_date: -1, createdAt: -1 },
          )
          .skip(skip);

        /* Always bounded: with no `limit`, `upcoming` or date range this
           used to return every event in the system. Callers that need a whole
           set narrow it (`?year=`, `?from=&to=`, `?created_by=`). */
        query.limit(limit);

        /* Only the number of attendees leaves this route. The list used to
           hand every attendee's id to any signed-in account; the screens only
           ever read its length. The event page (/api/events/[id]) serves the
           list itself, to organizers. */
        query.select("-attended_users");

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
        const counts = new Map(
          (
            await Event.aggregate([
              { $match: { _id: { $in: rows.map((r) => r._id) } } },
              {
                $project: {
                  n: { $size: { $ifNull: ["$attended_users", []] } },
                },
              },
            ])
          ).map((r) => [String(r._id), r.n]),
        );
        for (const row of data) {
          row.attended_count = counts.get(String(row._id)) || 0;
        }

        const total = await Event.countDocuments(filter);

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

    /* The poster key is deleted with the event, so it must be the caller's
       own upload. */
    if (!isAcceptablePosterKey(event_poster?.key, { userId: user._id })) {
      return NextResponse.json(
        { message: "The poster file was not uploaded by you." },
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

    if (!EVENT_CREATOR_ROLES.includes(user.role)) {
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
          message: `Only ${EVENT_CREATOR_ROLES.join(", ")} can create events.`,
        },
        { status: 403 },
      );
    }

    const officeError = organizingOfficeError(user, officeUnits);
    if (officeError) {
      return NextResponse.json({ message: officeError }, { status: 403 });
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
      const linkError = await checkEventProjectLink({
        projectId: project,
        gadActivity: gad_activity,
        user,
      });
      if (linkError) {
        return NextResponse.json({ message: linkError }, { status: 400 });
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

    /* Invalidated after the write: clearing it before the create let a GET
       in between re-cache the old list for the whole TTL. */
    cacheDelPrefix("events:list:");

    await logActivity({
      user_id: user._id,
      action: "EVENT_CREATE",
      description: `Created event: ${title}`,
      req,
      metadata: { event_id: newEvent?._id },
    });

    /* Only the creator's own screens list a new event live; this went to
       every connected socket, signed in or not. */
    emitToUser(user._id, "event:created", {
      event: newEvent,
      createdBy: user._id,
    });

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
