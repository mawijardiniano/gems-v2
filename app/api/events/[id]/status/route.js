import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Event from "@/models/event";
import { logActivity } from "@/lib/activityLog";
import { requireAuth } from "@/lib/auth";
import { cacheDelPrefix } from "@/lib/cache";
import { canTransition, requiresCancelReason } from "@/lib/eventStatus";
import {
  createNotifications,
  getEventStatusRecipientIds,
} from "@/lib/notifications";

export async function PATCH(req, context) {
  try {
    const { error, status: authStatus, user } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status: authStatus });

    await connectDB();

    const params = await context.params;
    const { id } = params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Invalid event ID" },
        { status: 400 },
      );
    }

    const userId = user._id;

    const { status, cancelReason } = await req.json();
    const allowedStatus = ["active", "cancelled", "completed"];

    if (!allowedStatus.includes(status)) {
      return NextResponse.json(
        { message: "Invalid status value" },
        { status: 400 },
      );
    }

    const event = await Event.findById(id);
    if (!event) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 });
    }
    if (
      event.created_by.toString() !== userId.toString() &&
      user.role !== "Admin"
    ) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    /* The lifecycle rules live in lib/eventStatus so the API and the badges
       cannot disagree. Without this check every move was allowed, which let a
       cancelled event be marked completed (opposite meanings on a report) and a
       finished event be quietly called off. */
    if (!canTransition(event.status, status)) {
      return NextResponse.json(
        {
          message: `An event that is ${event.status || "active"} cannot be marked ${status}.`,
          code: "INVALID_STATUS_TRANSITION",
          current_status: event.status || "active",
        },
        { status: 409 },
      );
    }

    /* Cancelling is the one move that has to be explained. */
    if (requiresCancelReason(event.status, status) && !String(cancelReason || "").trim()) {
      return NextResponse.json(
        { message: "A reason is required to cancel an event.", code: "CANCEL_REASON_REQUIRED" },
        { status: 400 },
      );
    }

    const previousStatus = event.status || "active";

    event.status = status;
    event.status_updated_by = userId;
    event.status_updated_at = new Date();

    if (status === "cancelled") {
      event.cancelled_by = userId;
      event.cancelled_at = new Date();
      event.cancel_reason = cancelReason || "";
    }

    /* Reinstating clears the cancellation trail so the event does not keep
       claiming it was called off. */
    if (previousStatus === "cancelled" && status !== "cancelled") {
      event.cancelled_by = null;
      event.cancelled_at = null;
      event.cancel_reason = "";
    }

    await event.save();
    cacheDelPrefix("events:list:");

    const action =
      status === "cancelled"
        ? "EVENT_CANCEL"
        : status === "completed"
          ? "EVENT_COMPLETE"
          : previousStatus === "cancelled"
            ? "EVENT_REINSTATE"
            : "EVENT_UPDATE";

    await logActivity({
      user_id: userId,
      action,
      description: `Updated event status to "${status}" for: ${event.title}`,
      req,
      metadata: {
        event_id: event._id,
        previous_status: previousStatus,
        new_status: status,
        cancelReason: cancelReason || "",
      },
      resource_type: "event",
      resource_id: event._id,
      severity: status === "cancelled" ? "warning" : "info",
    });

    /* Tell the people who have to act on this. Guarded on an actual change so
       re-saving the same status cannot ring the bell again. The status change is
       already committed, so a notification failure must never turn it into a
       500 — the organiser would retry and cancel twice. */
    if (previousStatus !== status) {
      const verb =
        status === "cancelled"
          ? "cancelled"
          : status === "completed"
            ? "marked completed"
            : "reinstated";

      try {
        const recipientIds = await getEventStatusRecipientIds(
          userId,
          event.created_by,
        );

        await createNotifications({
          recipientIds,
          senderId: userId,
          type: "event_status_updated",
          title: `Event ${verb}: ${event.title}`,
          message:
            status === "cancelled"
              ? `"${event.title}" was cancelled${
                  cancelReason ? `: ${cancelReason}` : "."
                }`
              : `"${event.title}" was ${verb}.`,
          projectId: event.project || null,
          metadata: {
            event_id: String(event._id),
            previous_status: previousStatus,
            new_status: status,
          },
        });
      } catch (notifyError) {
        console.error("Event status notification failed:", notifyError);
      }
    }

    return NextResponse.json({
      message: `Event status updated to ${status}`,
      event,
    });
  } catch (error) {
    console.error("Update status error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
