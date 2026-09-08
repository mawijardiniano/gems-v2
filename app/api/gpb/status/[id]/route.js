import { connectDB } from "@/lib/db";
import GPB from "@/models/gpb";
import { logActivity } from "@/lib/activityLog";
 import { requireAuth } from "@/lib/auth";
import { normalizeRole } from "@/lib/notifications";
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

    gpb.status_of_gpb = {
      status: status || gpb.status_of_gpb?.status || "draft",
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

    return Response.json({
      success: true,
      data: gpb.status_of_gpb,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
