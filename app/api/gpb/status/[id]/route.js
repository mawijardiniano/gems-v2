import { connectDB } from "@/data/lib/db";
import GPB from "@/models/gpb";
import { logActivity } from "@/data/lib/activityLog";
import { requireAuth } from "@/data/lib/auth";
import {
  createNotifications,
  getGpbStatusRecipientIds,
  normalizeRole,
} from "@/data/lib/notifications";
import { canSetGpbStatus, GPB_STATUS_ROLES } from "@/data/lib/gpbStatus";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { buildObjectUrl } from "@/data/lib/storage";
import { isAcceptableKey } from "@/data/lib/eventFileKeys";
import { canAccessGpb } from "@/data/lib/roleAccess";
import { clearProjectReportCaches } from "@/data/lib/cache";

const SCANNED_FOLDER = "status/scanned";
const MAX_REASON_LENGTH = 500;

export async function GET(req, { params }) {
  const { error, status, user } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });
  /* The reason and the scanned copy are for the GPB roles only. */
  if (!canAccessGpb(user?.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await connectDB();

  try {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return Response.json({ error: "Invalid GPB id" }, { status: 400 });
    }

    const gpb = await GPB.findById(id).select("status_of_gpb").lean();

    if (!gpb) {
      return Response.json({ error: "GPB Status not found" }, { status: 404 });
    }

    return Response.json({
      success: true,
      data: gpb.status_of_gpb,
    });
  } catch (error) {
    console.error("GPB status route failed:", error);
    return Response.json(
      { error: "Unable to process the GPB status." },
      { status: 500 },
    );
  }
}

export async function POST(req, { params }) {
  const { error, status, user } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });

  if (!GPB_STATUS_ROLES.includes(normalizeRole(user?.role))) {
    return NextResponse.json(
      { error: "You are not allowed to update the GPB status" },
      { status: 403 },
    );
  }

  await connectDB();

  try {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return Response.json({ error: "GPB not found" }, { status: 404 });
    }
    const { status, reason, scanned_copy } =
      (await req.json().catch(() => null)) || {};

    const gpb = await GPB.findById(id);

    if (!gpb) {
      return Response.json({ error: "GPB not found" }, { status: 404 });
    }

    /* An approved plan is final: it may be disapproved, but never sent back to
       draft, however stale the client that posts the update. */
    const currentStatus = gpb.status_of_gpb?.status || "draft";
    /* Stored lower case: "APPROVED" passed the transition check and then
       failed the schema enum. */
    const nextStatus = status
      ? String(status).trim().toLowerCase()
      : currentStatus;
    /* Only a real transition is worth telling people about: re-saving the same
       status with a new reason or scanned copy is not news. */
    const statusChanged = currentStatus !== nextStatus;

    if (!canSetGpbStatus(currentStatus, nextStatus)) {
      return Response.json(
        {
          error: ["draft", "approved", "disapproved"].includes(nextStatus)
            ? "An approved GPB cannot be set back to draft."
            : "Unknown GPB status.",
        },
        { status: 400 },
      );
    }

    /* A reason that is sent replaces the old one — sending "" clears it, so
       an approved plan no longer shows the reason it was once disapproved. */
    const nextReason =
      reason === undefined
        ? gpb.status_of_gpb?.reason || ""
        : String(reason ?? "").trim().slice(0, MAX_REASON_LENGTH);

    /* The scanned copy must be the caller's own upload (or the file already
       attached), and its link is built here from the key: a client-supplied
       URL could be `javascript:`, which ran for every viewer who clicked
       Download. */
    const existingKey = gpb.status_of_gpb?.scanned_copy?.key || "";
    const nextKey = scanned_copy?.key ? String(scanned_copy.key) : existingKey;
    if (
      !isAcceptableKey(nextKey, {
        folder: SCANNED_FOLDER,
        userId: user._id,
        existingKeys: new Set(existingKey ? [existingKey] : []),
      })
    ) {
      return Response.json(
        { error: "The scanned copy was not uploaded by you." },
        { status: 400 },
      );
    }

    /* Write only if the status is still the one checked above. Two updates
       sent together (draft and approve) both passed the check, and the last
       save won. A plan saved before the default existed has no status, which
       reads as "draft". */
    const updated = await GPB.findOneAndUpdate(
      {
        _id: id,
        "status_of_gpb.status":
          currentStatus === "draft" ? { $in: ["draft", null] } : currentStatus,
      },
      {
        $set: {
          status_of_gpb: {
            status: nextStatus,
            reason: nextReason,
            scanned_copy: {
              url: nextKey ? buildObjectUrl(nextKey) : "",
              key: nextKey,
            },
          },
        },
      },
      { new: true, runValidators: true },
    );
    if (!updated) {
      return Response.json(
        {
          error:
            "The GPB status was changed by someone else. Reload and try again.",
        },
        { status: 409 },
      );
    }

    clearProjectReportCaches();

    await logActivity({
      req,
      action: "GPB_STATUS",
      description: `GPB status updated to "${nextStatus}"`,
      resource_type: "gpb",
      resource_id: id,
      severity: "info",
    });

    /* Tell the roles that own and review the plan. `metadata.year` is what
       components/NotificationBell.jsx deep-links on (`/gpb/<year>`); projectId
       is left alone because it refs a Project, not a GPB. The update itself is
       already persisted, so a notification failure must not fail the request. */
    if (statusChanged && user?._id) {
      try {
        const recipientIds = await getGpbStatusRecipientIds(user._id);

        await createNotifications({
          recipientIds,
          senderId: user._id,
          type: "gpb_status_updated",
          title: `GPB ${gpb.year} ${nextStatus}`,
          message: `The GPB for year ${gpb.year} was marked "${nextStatus}"${nextReason ? `: ${nextReason}` : "."}`,
          metadata: {
            year: gpb.year,
            status: nextStatus,
            previousStatus: currentStatus,
            reason: nextReason,
          },
        });
      } catch (notifyError) {
        console.error("GPB status notification failed:", notifyError);
      }
    }

    return Response.json({
      success: true,
      data: updated.status_of_gpb,
    });
  } catch (error) {
    console.error("GPB status route failed:", error);
    return Response.json(
      { error: "Unable to process the GPB status." },
      { status: 500 },
    );
  }
}
