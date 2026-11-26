import { NextResponse } from "next/server";
import { connectDB } from "@/data/lib/db";
import { requireIntegrationAccess } from "@/app/api/integration/_utils/auth";
import { runHrmisSync } from "@/app/api/integration/_utils/hrmisSync";
import { logActivity } from "@/data/lib/activityLog";

/* Sync Now: fetch the configured HRMIS endpoint and stage the rows. The
   work (and its audit trail) is in runHrmisSync, shared with the daily
   scheduled sync. Endpoint and headers come only from the stored config;
   accepting them from the request body would let a caller point the server
   at any URL, unaudited. */
export async function POST(req) {
  try {
    await connectDB();

    const auth = await requireIntegrationAccess(req);
    if (auth.error) {
      return NextResponse.json(
        { status: "error", message: auth.error },
        { status: auth.status, headers: auth.headers },
      );
    }

    const body = await req.json().catch(() => ({}));
    const result = await runHrmisSync({
      actor: {
        user_id: auth.user._id,
        username: auth.user.username,
        role: auth.user.role,
        auth_method: "session",
      },
      sourceName: body.source_name || "HRMIS API",
      schoolYear: body.school_year || "",
      semester: body.semester || "",
    });

    /* A fetch pulls an external system's view of staff and students into a
       batch nobody has approved yet, at a time of the operator's choosing;
       a failed one is how a misconfigured or sabotaged sync is noticed.
       Both are recorded (endpoint host only, never the credentials). */
    if (result.audit) await logActivity({ ...result.audit, req });

    if (result.error) {
      return NextResponse.json(
        { status: "error", message: result.error.message },
        { status: result.error.status },
      );
    }
    return NextResponse.json(
      { status: "success", data: result.data },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 },
    );
  }
}
