import { connectDB } from "@/lib/db";
import Event from "@/models/event";
import EventGuest from "@/models/eventGuest";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/auth";
import { logActivity } from "@/lib/activityLog";
import { cacheDelPrefix } from "@/lib/cache";

/* Organizers who may validate guest check-ins (same set that may record
   attendance for somebody else). The event creator is always allowed. */
const ORGANIZER_ROLES = [
  "Admin",
  "GAD Focal Person",
  "GAD Coordinator",
  "Dean",
];

const STATUSES = ["pending", "approved", "rejected"];

/* Rows created before manual validation existed have no status. They are
   treated as approved so historical reports keep their numbers. */
const APPROVED_OR_LEGACY = {
  $or: [
    { validation_status: "approved" },
    { validation_status: { $exists: false } },
    { validation_status: null },
  ],
};

export function legacySafeStatusFilter(status) {
  if (status === "approved") return APPROVED_OR_LEGACY;
  if (status === "pending" || status === "rejected")
    return { validation_status: status };
  return null;
}

export async function GET(req) {
  const { error, status } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const event_id = searchParams.get("event_id");
    if (!event_id || !mongoose.Types.ObjectId.isValid(event_id))
      return NextResponse.json({ message: "Valid event_id is required" }, { status: 400 });
    const requested = searchParams.get("validation_status") || "all";
    if (requested !== "all" && !STATUSES.includes(requested))
      return NextResponse.json(
        { message: "validation_status must be pending, approved, rejected, or all" },
        { status: 400 },
      );
    const statusFilter = legacySafeStatusFilter(requested);
    const query = statusFilter ? { event_id, ...statusFilter } : { event_id };
    const guests = await EventGuest.find(query).sort({ attended_at: -1 }).lean();
    const counts = { pending: 0, approved: 0, rejected: 0 };
    const countAgg = await EventGuest.aggregate([
      { $match: { event_id: new mongoose.Types.ObjectId(event_id) } },
      {
        $group: {
          _id: {
            $ifNull: ["$validation_status", "approved"],
          },
          n: { $sum: 1 },
        },
      },
    ]);
    countAgg.forEach((row) => {
      if (STATUSES.includes(row._id)) counts[row._id] = row.n;
    });
    return NextResponse.json({ status: "success", data: guests, counts });
  } catch (err) {
    return NextResponse.json({ message: "Unable to load guests." }, { status: 500 });
  }
}

export async function PATCH(req) {
  const { error, status, user } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });
  try {
    await connectDB();
    const body = await req.json();
    const event_id = body?.event_id;
    if (!event_id || !mongoose.Types.ObjectId.isValid(event_id))
      return NextResponse.json({ message: "Valid event_id is required" }, { status: 400 });

    const action = body?.action;
    if (!["approve", "reject", "reset"].includes(action))
      return NextResponse.json(
        { message: "action must be approve, reject, or reset" },
        { status: 400 },
      );

    const rawIds = Array.isArray(body?.guest_ids)
      ? body.guest_ids
      : [body?.guest_id ?? body?.guest_ids];
    const ids = [...new Set(rawIds.filter(Boolean).map(String))];
    if (ids.length === 0 || ids.some((id) => !mongoose.Types.ObjectId.isValid(id)))
      return NextResponse.json(
        { message: "Valid guest_id or guest_ids is required" },
        { status: 400 },
      );

    const event = await Event.findById(event_id).select("created_by title").lean();
    if (!event) return NextResponse.json({ message: "Event not found" }, { status: 404 });

    const isCreator =
      event.created_by && String(event.created_by) === String(user._id);
    if (!ORGANIZER_ROLES.includes(user.role) && !isCreator)
      return NextResponse.json(
        { message: "You are not allowed to validate guest check-ins for this event." },
        { status: 403 },
      );

    const note = String(body?.note || "").trim().slice(0, 500);
    const nextStatus =
      action === "approve" ? "approved" : action === "reject" ? "rejected" : "pending";

    const update = {
      validation_status: nextStatus,
      validated_by: action === "reset" ? null : user._id,
      validated_at: action === "reset" ? null : new Date(),
      validation_note: action === "reset" ? "" : note,
    };

    const result = await EventGuest.updateMany(
      { _id: { $in: ids }, event_id },
      { $set: update },
    );

    if (result.matchedCount === 0)
      return NextResponse.json(
        { message: "No matching guest records found for this event." },
        { status: 404 },
      );

    cacheDelPrefix("events:list:");
    await logActivity({
      req,
      action:
        action === "approve"
          ? "GUEST_ATTENDANCE_APPROVE"
          : action === "reject"
            ? "GUEST_ATTENDANCE_REJECT"
            : "GUEST_ATTENDANCE_RESET",
      description:
        action === "approve"
          ? "Guest check-in(s) approved"
          : action === "reject"
            ? "Guest check-in(s) rejected"
            : "Guest check-in(s) returned to pending",
      resource_type: "event",
      resource_id: event_id,
      severity: "info",
      metadata: { guest_ids: ids, count: result.matchedCount, note },
    });

    return NextResponse.json({
      status: "success",
      validation_status: nextStatus,
      updated: result.matchedCount,
      modified: result.modifiedCount,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { message: "Unable to update guest validation." },
      { status: 500 },
    );
  }
}
