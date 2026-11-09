import { connectDB } from "@/lib/db";
import GPB from "@/models/gpb";
import { logActivity } from "@/lib/activityLog";
 import { requireAuth } from "@/lib/auth";
import {
  createNotifications,
  getGpbStatusRecipientIds,
  normalizeRole,
} from "@/lib/notifications";
import { canSetGpbStatus } from "@/lib/gpbStatus";
import {NextResponse} from "next/server"

const GPB_STATUS_ROLES = [
  "planning director",
  "suc president",
  "gad focal person",
];


export async function GET(req, { params }) {
  const { error, status } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });
  await connectDB();

  try {
    const { id } = await params;

    const gpb = await GPB.findById(id);

    if (!gpb) {
      return Response.json(
        { error: "GPB Status not found" },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      data: gpb.status_of_gpb,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  const { error, status, user } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });

  if (!GPB_STATUS_ROLES.includes(normalizeRole(user?.role))) {
    return NextResponse.json(
      { error: "You are not allowed to update the GPB status" },
      { status: 403 }
    );
  }

  await connectDB();

  try {
    const { id } = await params;
    const { status, reason, scanned_copy } = await req.json();

    const gpb = await GPB.findById(id);

    if (!gpb) {
      return Response.json({ error: "GPB not found" }, { status: 404 });
    }

    /* An approved plan is final: it may be disapproved, but never sent back to
       draft, however stale the client that posts the update. */
    const currentStatus = gpb.status_of_gpb?.status || "draft";
    const nextStatus = status || currentStatus;
    /* Only a real transition is worth telling people about: re-saving the same
       status with a new reason or scanned copy is not news. */
    const statusChanged = currentStatus !== nextStatus;

    if (!canSetGpbStatus(currentStatus, nextStatus)) {
      return Response.json(
        { error: "An approved GPB cannot be set back to draft." },
        { status: 400 },
      );
    }

    gpb.status_of_gpb = {
      status: nextStatus,
      reason: reason || gpb.status_of_gpb?.reason || "",
      scanned_copy: {
        // Fall back to the existing scanned copy so an update without a new
        // file never wipes the previously attached one.
        url: scanned_copy?.url || gpb.status_of_gpb?.scanned_copy?.url || "",
        key: scanned_copy?.key || gpb.status_of_gpb?.scanned_copy?.key || "",
      },
    };

    await gpb.save();

    await logActivity({
      req,
      action: "GPB_STATUS",
      description: `GPB status updated to "${gpb.status_of_gpb?.status}"`,
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
          message: `The GPB for year ${gpb.year} was marked "${nextStatus}"${reason ? `: ${reason}` : "."}`,
          metadata: {
            year: gpb.year,
            status: nextStatus,
            previousStatus: currentStatus,
            reason: reason || "",
          },
        });
      } catch (notifyError) {
        console.error("GPB status notification failed:", notifyError);
      }
    }

    return Response.json({
      success: true,
      data: gpb.status_of_gpb,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
