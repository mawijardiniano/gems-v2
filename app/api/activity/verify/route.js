import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";
import ActivityLog from "@/models/activity_log";

const JWT_SECRET = process.env.JWT_SECRET;

/* Chain verification (NIST AU-9(2) — verification of audit record integrity).
 *
 * Walks the trail oldest-first and recomputes each hash, reporting the first
 * place the chain fails. Three outcomes matter, and they are distinguished
 * rather than collapsed into one boolean:
 *
 *   - `link_broken`  — hash_prev does not match the previous record's hash_self.
 *                      A record was deleted or its content edited.
 *   - `hash_mismatch` — the record's own content no longer produces hash_self.
 *                      A record was edited in place (via the driver, bypassing
 *                      the schema guards).
 *   - `unlinked`     — hash_self is null. Legacy rows written before the chain
 *                      existed, or entries whose linking failed.
 *   - `archived`     — the chain breaks here, but an `AUDIT_RETENTION_DISPOSE`
 *                      entry in the run names this exact predecessor hash as
 *                      disposed. Retention removing expired records is a
 *                      documented policy act, not tampering, and reporting it as
 *                      tampering would fire the alarm on our own scheduled job.
 *                      The break is still surfaced — an operator can see where
 *                      the tail of the trail now lives — but it does not mark
 *                      the record set unfaithful.
 *
 * Paginated by count because the tail is what matters after an incident, but
 * the head is what matters for a gap — so the default is the whole chain up to
 * a sane cap, and callers narrow with `since`.
 */
function canonical(entry) {
  const ordered = {
    action: entry.action,
    changes: entry.changes ?? null,
    created_at: entry.created_at,
    description: entry.description ?? "",
    metadata: entry.metadata ?? null,
    outcome: entry.outcome ?? null,
    resource_id: entry.resource_id ? String(entry.resource_id) : null,
    resource_type: entry.resource_type ?? null,
    severity: entry.severity,
    user_id: entry.user_id ? String(entry.user_id) : null,
  };
  return JSON.stringify(ordered);
}

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

    const url = new URL(req.url);
    const limit = Math.min(
      parseInt(url.searchParams.get("limit") || "5000", 10) || 5000,
      20000,
    );
    const since = url.searchParams.get("since");

    const query = since ? { createdAt: { $gte: new Date(since) } } : {};
    const records = await ActivityLog.find(query)
      .sort({ createdAt: 1, _id: 1 })
      .limit(limit)
      .select(
        "_id user_id action severity resource_type resource_id description outcome changes metadata createdAt hash_prev hash_self",
      )
      .lean();

    const problems = [];
    let unlinked = 0;
    let archived = 0;
    let prevHash = null;

    /* An unlinked row has two meanings that must not be conflated:
     *
     *   legacy   — written before the chain existed. History, and nothing can
     *              honestly be done about it: hashing it now would attach an
     *              integrity claim to data nobody verified.
     *   degraded — linking failed when the record was written (`link_error` is
     *              set by the writer). This is evidence the audit subsystem was
     *              not functioning at that moment, which is exactly what an
     *              auditor needs to know and what a bare total hides.
     *
     * They are counted separately and `degraded` is reported as a problem type
     * rather than silently folded into `unlinked`.
     */
    let legacyUnlinked = 0;
    let degradedUnlinked = 0;

    /* Hashes that a retention run declared it had disposed. A link break that
       lands on one of these is the boundary, not a gap in the record. */
    const disposedThrough = new Set(
      records
        .filter((r) => r.action === "AUDIT_RETENTION_DISPOSE")
        .map((r) => r?.metadata?.disposed_through)
        .filter(Boolean),
    );

    for (const record of records) {
      if (!record.hash_self) {
        if (record?.metadata?.link_error) {
          degradedUnlinked += 1;
          problems.push({
            type: "writer_degraded",
            id: String(record._id),
            createdAt: record.createdAt,
            detail: record.metadata.link_error,
          });
        } else {
          legacyUnlinked += 1;
        }
        continue;
      }

      if ((record.hash_prev || null) !== prevHash) {
        const boundary = record.hash_prev && disposedThrough.has(record.hash_prev);
        if (boundary) {
          archived += 1;
        } else {
          problems.push({
            type: "link_broken",
            id: String(record._id),
            createdAt: record.createdAt,
            expected_prev: prevHash,
            actual_prev: record.hash_prev || null,
          });
        }
      }

      const { createHash } = await import("node:crypto");
      const expected = createHash("sha256")
        .update(`${record.hash_prev || ""}|${canonical(record)}`)
        .digest("hex");

      if (expected !== record.hash_self) {
        problems.push({
          type: "hash_mismatch",
          id: String(record._id),
          createdAt: record.createdAt,
          expected_self: expected,
          actual_self: record.hash_self,
        });
      }

      prevHash = record.hash_self;
    }

    return NextResponse.json(
      {
        status: problems.length === 0 ? "intact" : "tampered",
        checked: records.length,
        /* `unlinked` stays the total, so existing callers keep working; the
           split says which part is benign history and which is a broken
           writer. */
        unlinked: legacyUnlinked + degradedUnlinked,
        unlinked_legacy: legacyUnlinked,
        unlinked_degraded: degradedUnlinked,
        archived,
        problems: problems.slice(0, 100),
        truncated: records.length === limit,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("Audit verification error:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
