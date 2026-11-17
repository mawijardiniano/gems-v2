import { connectDB } from "@/data/lib/db";
import Event from "@/models/event";
import Project from "@/models/projects";
import "@/models/profile";
import { NextResponse } from "next/server";
import { logActivity } from "@/data/lib/activityLog";
import mongoose from "mongoose";
import { requireAuth, optionalAuth } from "@/data/lib/auth";
import { cacheDelPrefix } from "@/data/lib/cache";
import { canonicalOfficeList } from "@/data/lib/colleges";
import { deleteEventCascade } from "@/data/lib/eventCascade";
import {
  USER_POPULATE_BASE,
  hydrateUserPopulate,
} from "@/data/lib/userPopulate";
import { normalizeRefNumber } from "@/data/lib/referenceNumber";
import { isAcceptablePosterKey } from "@/data/lib/eventFileKeys";
import { checkEventProjectLink } from "@/data/lib/eventProjectLink";

const EDITABLE_FIELDS = [
  "title",
  "description",
  "start_date",
  "end_date",
  "venue",
  "type_of_activity",
  "organizing_office_unit",
  "co_organizing_office_unit",
  "project",
  "gad_activity",
  "event_poster",
];

/* Mirrors app/api/events/public/[id]/route.js. */
const PUBLIC_EVENT_FIELDS =
  "_id title description start_date end_date start_dates end_dates venue type_of_activity organizing_office_unit status event_poster.url";

/* Office arrays this route stores in their canonical spelling — colleges always
   use "and", so a stale client cannot put the legacy "&" form back on a record. */
const OFFICE_FIELDS = ["organizing_office_unit", "co_organizing_office_unit"];

export async function GET(req, { params }) {
  const { user, error, status } = await optionalAuth(req);
  if (error) return NextResponse.json({ error }, { status });

  const { id } = await params;

  if (!id)
    return NextResponse.json(
      { status: "error", message: "Missing event id" },
      { status: 400 },
    );

  if (!mongoose.isValidObjectId(id))
    return NextResponse.json(
      { status: "error", message: "Event not found" },
      { status: 404 },
    );

  try {
    await connectDB();

    /* Anonymous callers get the same whitelist as /api/events/public/[id]:
       excluding only the attendee list still exposed the cancel reason, who
       cancelled it and the creator's account. */
    if (!user) {
      const publicEvent = await Event.findById(id)
        .select(PUBLIC_EVENT_FIELDS)
        .lean();
      if (!publicEvent)
        return NextResponse.json(
          { status: "error", message: "Event not found" },
          { status: 404 },
        );
      return NextResponse.json({ status: "success", data: publicEvent });
    }

    const event = await Event.findById(id)
      .populate({
        path: "created_by",
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

    /* Names, birthdays and sex-at-birth live in the vault. The attendance modal
       reads `attended_users.user_id.personal_info_id.gadData.sexAtBirth` to fill
       its Sex column and `personal.birthday` for age, so without this the modal
       would come up blank once the legacy columns are stripped.
       This route is reachable anonymously (`optionalAuth`), so the role gate
       inside the hydrator is what stops an unauthenticated caller from reading a
       decrypted identity out of `created_by` and the attendance list. */
    await hydrateUserPopulate(event.attended_users, user?.role);
    await hydrateUserPopulate(event.created_by, user?.role);

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
  const { error, status, user } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });

  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { status: "error", message: "Missing event id" },
      { status: 400 },
    );
  }

  try {
    await connectDB();
    const body = await req.json();

    if (
      body.project === "" ||
      body.project === null ||
      body.project === undefined
    ) {
      body.project = null;
    }
    if (
      body.gad_activity === "" ||
      body.gad_activity === null ||
      body.gad_activity === undefined
    ) {
      body.gad_activity = "";
    }
    // Legacy audience fields were removed — ignore them if an old client sends them.
    delete body.eligibility_criteria;
    delete body.target_number_of_participants;

    const event = await Event.findById(id);
    if (!event) {
      return NextResponse.json(
        { status: "error", message: "Event not found" },
        { status: 404 },
      );
    }

    if (
      event.created_by.toString() !== user._id.toString() &&
      user.role !== "Admin"
    ) {
      return NextResponse.json(
        { status: "error", message: "You are not allowed to edit this event" },
        { status: 403 },
      );
    }

    if (
      body.event_poster !== undefined &&
      !isAcceptablePosterKey(body.event_poster?.key, {
        userId: user._id,
        existingKey: event.event_poster?.key,
      })
    ) {
      return NextResponse.json(
        { status: "error", message: "The poster file was not uploaded by you." },
        { status: 400 },
      );
    }

    const oldProjectId = event.project ? event.project.toString() : null;
    if (
      body.project !== null &&
      body.project !== undefined &&
      !mongoose.isValidObjectId(body.project)
    ) {
      return NextResponse.json(
        { status: "error", message: "Invalid project." },
        { status: 400 },
      );
    }
    const newProjectId =
      body.project === undefined ? oldProjectId : body.project;

    for (const field of EDITABLE_FIELDS) {
      if (body[field] === undefined) continue;

      event.set(
        field,
        OFFICE_FIELDS.includes(field)
          ? canonicalOfficeList(body[field])
          : body[field],
      );
    }

    // Enforce Project-based (GPB) vs Independent on update.
    const nextProjectId = event.project ? event.project.toString() : null;
    const nextGadActivity = String(event.gad_activity || "").trim();
    const nextType = event.type_of_activity;
    if (nextProjectId) {
      const linkError = await checkEventProjectLink({
        projectId: nextProjectId,
        gadActivity: nextGadActivity,
        user,
        existingProjectId: oldProjectId,
      });
      if (linkError) {
        return NextResponse.json(
          { status: "error", message: linkError },
          { status: 400 },
        );
      }
      if (nextType !== "GAD" || !nextGadActivity) {
        return NextResponse.json(
          {
            status: "error",
            message:
              "Project-based events require the GAD activity type plus a project and its GAD activity.",
          },
          { status: 400 },
        );
      }
    } else {
      if (nextType === "GAD") {
        return NextResponse.json(
          {
            status: "error",
            message:
              "GAD events must be project-based. Select Project-based (GPB) or choose another activity type.",
          },
          { status: 400 },
        );
      }
      if (nextGadActivity) {
        return NextResponse.json(
          {
            status: "error",
            message: "Independent events cannot be linked to a project.",
          },
          { status: 400 },
        );
      }
      event.set("gad_activity", "");
    }

    /* Reference numbers are normally assigned automatically from the type of
       activity; this allows an explicit correction while keeping them unique. */
    if (body.reference_number !== undefined) {
      const nextRef = normalizeRefNumber(body.reference_number);

      if (nextRef && nextRef !== event.reference_number) {
        const clash = await Event.exists({
          reference_number: nextRef,
          _id: { $ne: event._id },
        });

        if (clash) {
          return NextResponse.json(
            {
              status: "error",
              message: `Reference number ${nextRef} is already used by another event.`,
            },
            { status: 409 },
          );
        }
      }

      event.set("reference_number", nextRef || null);
    }

    /* The legacy start_dates/end_dates mirrors used to be rewritten here on
       every edit. They are no longer maintained: eventSpan() in
       lib/eventStatus.js reads the scalars first and falls back to the arrays
       only for rows saved before the change. */

    event.updated_by = user._id;

    await event.save();

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

    cacheDelPrefix("events:list:");

    /* Same populate + vault hydration as GET: the hand-written populate here
       returned the whole GemsProfile (including its vaultRef) and a blank
       creator name. */
    const populated = await Event.findById(id)
      .populate({ path: "created_by", ...USER_POPULATE_BASE })
      .lean();
    await hydrateUserPopulate(populated?.created_by, user?.role);

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
    /* Schema validation and bad casts are the caller's fault (400); anything
       else is ours and must not leak internals. */
    const clientError =
      error?.name === "ValidationError" || error?.name === "CastError";
    return NextResponse.json(
      {
        status: "error",
        message: clientError ? error.message : "Unable to update event.",
      },
      { status: clientError ? 400 : 500 },
    );
  }
}

export async function DELETE(req, { params }) {
  const { error, status, user } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });

  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { status: "error", message: "Missing event id" },
      { status: 400 },
    );
  }

  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json(
      { status: "error", message: "Event not found" },
      { status: 404 },
    );
  }

  try {
    await connectDB();

    const event = await Event.findById(id);

    if (!event) {
      return NextResponse.json(
        { status: "error", message: "Event not found" },
        { status: 404 },
      );
    }

    /* Same rule as PUT: only the creator or an Admin may remove an event,
       since the cascade also deletes its report and stored files. */
    if (
      String(event.created_by) !== String(user._id) &&
      user.role !== "Admin"
    ) {
      return NextResponse.json(
        {
          status: "error",
          message: "You are not allowed to delete this event",
        },
        { status: 403 },
      );
    }

    const { title } = await deleteEventCascade(event);

    // Event deleted - invalidate cached event lists.
    cacheDelPrefix("events:list:");

    await logActivity({
      user_id: user._id,
      action: "EVENT_DELETE",
      description: `Deleted event: ${title || event.title}`,
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
      { status: "error", message: "Unable to delete event." },
      { status: 500 },
    );
  }
}
