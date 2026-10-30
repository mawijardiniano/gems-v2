import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import ActivityLog from "@/models/activity_log";
import { logActivity, redactActivityLog } from "@/lib/activityLog";
import jwt from "jsonwebtoken";
import { cacheOrSet, cacheDelPrefix } from "@/lib/cache";

const JWT_SECRET = process.env.JWT_SECRET;
const ACTIVITY_CACHE_TTL = 15 * 1000; // 15 seconds

function authenticate(req) {
  const token = req.cookies.get("auth_token")?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export async function GET(req) {
  try {
    await connectDB();

    const decoded = authenticate(req);
    if (!decoded) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 },
      );
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = parseInt(url.searchParams.get("limit") || "50", 10);

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
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
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

    const decoded = authenticate(req);
    if (!decoded || decoded.role !== "Admin") {
      return NextResponse.json(
        { message: "Forbidden: Admin access required" },
        { status: 403 },
      );
    }

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

    return NextResponse.json(
      { message: "Redacted", id },
      { status: 200 },
    );
  } catch (err) {
    console.error("Activity redact error:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}