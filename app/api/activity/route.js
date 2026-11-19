import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/data/lib/db";
import ActivityLog from "@/models/activity_log";
import { logActivity, redactActivityLog } from "@/data/lib/activityLog";
import { cacheOrSet, cacheDelPrefix } from "@/data/lib/cache";
import { requireAuth } from "@/data/lib/auth";
import { requireAdmin } from "@/app/api/integration/_utils/auth";
import { appStartOfDay, appEndOfDay } from "@/data/lib/appTime";

const ACTIVITY_CACHE_TTL = 15 * 1000; // 15 seconds
const MAX_LIMIT = 200;

function toInt(value, fallback) {
  const n = parseInt(value ?? "", 10);
  return Number.isFinite(n) ? n : fallback;
}

export async function GET(req) {
  try {
    /* requireAuth, not a bare jwt.verify: the role and active state come
       from the database, so a demoted or deactivated admin's unexpired token
       no longer reads every user's activity. */
    const { user, error, status, headers } = await requireAuth(req);
    if (error) {
      return NextResponse.json({ message: error }, { status, headers });
    }
    const decoded = { id: String(user._id), role: user.role };

    await connectDB();

    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const page = Math.max(1, toInt(url.searchParams.get("page"), 1));
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, toInt(url.searchParams.get("limit"), 50)),
    );

    const filter = {};

    if (decoded.role === "Admin") {
      const user_id = url.searchParams.get("user_id");
      if (user_id && mongoose.Types.ObjectId.isValid(user_id)) {
        filter.user_id = user_id;
      }
    } else {
      // Non-admins can only view their own activity
      filter.user_id = decoded.id;
    }

    if (action) filter.action = action;
    if (from || to) {
      /* A bare "YYYY-MM-DD" is a Manila calendar day: `from` starts at its
         00:00, `to` ends at its 23:59:59.999. new Date("YYYY-MM-DD") is UTC
         midnight — 08:00 in Manila — which cut eight hours off both ends. */
      const isDay = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || "").trim());
      const fromDate = from
        ? isDay(from)
          ? new Date(appStartOfDay(`${from.trim()}T12:00:00+08:00`))
          : new Date(from)
        : null;
      const toDate = to
        ? isDay(to)
          ? new Date(appEndOfDay(`${to.trim()}T12:00:00+08:00`))
          : new Date(to)
        : null;
      if (
        (fromDate && Number.isNaN(fromDate.getTime())) ||
        (toDate && Number.isNaN(toDate.getTime()))
      ) {
        return NextResponse.json(
          { message: "Invalid from/to date" },
          { status: 400 },
        );
      }
      filter.createdAt = {};
      if (fromDate) filter.createdAt.$gte = fromDate;
      if (toDate) filter.createdAt.$lte = toDate;
    }

    // Build a cache key from the authenticated user + query params so
    // each user/filter combination gets its own cached result. The role is
    // part of the identity here: an Admin asking for another user's activity
    // must never be served a non-Admin's own-activity page, and vice versa,
    // since the same filter string can be reached by both.
    const cacheKey = `activity:${decoded.id}:${decoded.role || "anon"}:${JSON.stringify(filter)}:${page}:${limit}`;

    const result = await cacheOrSet(
      cacheKey,
      async () => {
        const total = await ActivityLog.countDocuments(filter);
        const totalPages = Math.max(1, Math.ceil(total / limit));
        const activities = await ActivityLog.find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit);

        return {
          activities,
          pagination: { total, totalPages, page, limit },
        };
      },
      ACTIVITY_CACHE_TTL,
    );

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("Activity fetch error:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

/* Redaction, not deletion.
 *
 * This endpoint used to call findByIdAndDelete. An audit trail that its own
 * administrators can erase is not an audit trail: it cannot answer "who
 * removed the record of what happened", which is the first question an
 * investigation asks. NIST AU-9 requires that audit information be protected
 * from unauthorised deletion, and an Admin holding this permission *is* the
 * threat model.
 *
 * The replacement preserves the record's identity, actor, timestamp and hash
 * chain, and nulls only the free-text detail. A lawful erasure request is
 * therefore satisfiable without destroying the evidence that the act occurred.
 * The redaction itself is audited, so a reader can see who blanked what.
 */
export async function DELETE(req) {
  try {
    await connectDB();

    /* Database role, active account, current password — not the token. */
    const auth = await requireAdmin(req);
    if (auth.error) {
      return NextResponse.json(
        { message: auth.error },
        { status: auth.status, headers: auth.headers },
      );
    }
    const decoded = {
      id: auth.user._id,
      username: auth.user.username,
      role: auth.user.role,
    };

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const reason = url.searchParams.get("reason") || "";
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Valid id is required" },
        { status: 400 },
      );
    }

    const target = await ActivityLog.findById(id)
      .select("_id action resource_type resource_id redacted")
      .lean();
    if (!target) {
      return NextResponse.json({ message: "Log not found" }, { status: 404 });
    }
    if (target.redacted) {
      return NextResponse.json(
        { message: "Log entry is already redacted" },
        { status: 409 },
      );
    }

    await redactActivityLog({ id, reason, req });

    /* The redaction is itself an auditable act — recorded after the redaction
       so the hash chain covers the record in its final state. */
    await logActivity({
      actor: {
        user_id: decoded.id,
        username: decoded.username || null,
        role: decoded.role,
        auth_method: "session",
      },
      action: "AUDIT_REDACT",
      description: `Redacted activity log entry ${id}${reason ? `: ${reason}` : ""}`,
      severity: "critical",
      resource_type: "activity_log",
      resource_id: id,
      module: "audit",
      req,
      metadata: {
        target_action: target.action,
        target_resource_type: target.resource_type,
        reason: reason || null,
      },
    });

    // Invalidate cached activity lists so the next fetch is fresh.
    cacheDelPrefix("activity:");

    return NextResponse.json({ message: "Redacted", id }, { status: 200 });
  } catch (err) {
    console.error("Activity redact error:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
