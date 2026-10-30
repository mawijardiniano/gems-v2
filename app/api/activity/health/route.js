import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";
import { getAuditFailureStats } from "@/lib/activityLog";
import { planRetention, retentionPolicy } from "@/lib/auditRetention";

const JWT_SECRET = process.env.JWT_SECRET;

/* Liveness of the audit writer itself (NIST AU-5).
 *
 * An audit subsystem whose failures are only visible in stdout looks identical
 * to one with nothing to report. This turns "writes are failing" into a number
 * a monitor can poll, and reports an error status once failures have occurred
 * in the current process so a probe fails loudly rather than silently.
 */
export async function GET(req) {
  try {
    await connectDB();

    const token = req.cookies.get("auth_token")?.value;
    let decoded = null;
    try {
      decoded = token ? jwt.verify(token, JWT_SECRET) : null;
    } catch {
      decoded = null;
    }
    if (!decoded) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (decoded.role !== "Admin") {
      return NextResponse.json(
        { message: "Forbidden: Admin access required" },
        { status: 403 },
      );
    }

    const stats = getAuditFailureStats();
    const policy = retentionPolicy();

    /* Retention is reported but does not by itself mark the system degraded:
       a growing backlog of expired records is an operational task for an
       administrator, not a fault in the audit writer. `due` is what a dashboard
       watches; `failures` is what pages someone. */
    let retention = { policy, due: null };
    try {
      const plan = await planRetention();
      retention = {
        policy,
        due: plan.expired,
        total: plan.total,
        oldest: plan.oldest,
        cutoffs: plan.cutoffs,
      };
    } catch (err) {
      /* A retention report that cannot be computed must not break the health
         signal about write failures — that is the more urgent fact. */
      retention = { policy, due: null, error: err.message };
    }

    /* `count` is failures inside the recent window, so the probe recovers once
       the writer does. `total` keeps the since-boot figure: a recovered writer
       still discloses that it failed, rather than erasing the evidence by
       turning green again. */
    const degraded = stats.count > 0;

    return NextResponse.json(
      {
        status: degraded ? "degraded" : "healthy",
        failures: stats,
        retention,
      },
      { status: degraded ? 503 : 200 },
    );
  } catch (err) {
    console.error("Audit health check error:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
