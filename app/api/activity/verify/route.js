import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectDB } from "@/data/lib/db";
import ActivityLog from "@/models/activity_log";

const JWT_SECRET = process.env.JWT_SECRET;

/* When the one-at-a-time chain writer shipped (commit 0afa689). Forks dated
   before this are the known concurrent-write defect; any fork after it is
   reported as a break. Override with AUDIT_CHAIN_FORK_FIXED_AT (ISO time) if
   a server picked the fix up later than this. */
const CHAIN_FORK_FIXED_AT = new Date(
  process.env.AUDIT_CHAIN_FORK_FIXED_AT || "2026-11-19T04:50:46Z",
);

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

    const FIELDS =
      "_id user_id action severity resource_type resource_id description outcome changes metadata createdAt created_at hash_prev hash_self hash_version redacted";

    /* Without `since`, check the most recent rows: after an incident the tail
       is what matters, and checking the oldest N meant new tampering was never
       looked at once the trail outgrew the cap. One extra row is read to know
       whether older rows exist beyond the window. */
    const query = since ? { createdAt: { $gte: new Date(since) } } : {};
    const fetched = await ActivityLog.find(query)
      .sort(since ? { createdAt: 1, _id: 1 } : { createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .select(FIELDS)
      .lean();
    const byTime = (a, b) =>
      new Date(a.createdAt) - new Date(b.createdAt) ||
      String(a._id).localeCompare(String(b._id));
    fetched.sort(byTime);
    const truncated = fetched.length > limit;
    /* Truncated tail: drop the oldest extra row. Truncated `since` window:
       drop the newest extra row. */
    const records = truncated
      ? since
        ? fetched.slice(0, limit)
        : fetched.slice(fetched.length - limit)
      : fetched;

    /* A window that does not start at the beginning of the trail starts mid-
       chain: its first link points at a row outside the window, which is not
       a break. */
    const windowStartsMidChain = Boolean(since) || (truncated && !since);

    /* Redacted rows have had hashed content blanked by redactActivityLog, so
       their hash cannot be recomputed. They are accepted only when the
       redaction itself was audited (an AUDIT_REDACT entry naming the row) —
       otherwise "redacted: true" would be a free pass for tampering. */
    const redactedIds = records
      .filter((r) => r.redacted)
      .map((r) => String(r._id));
    const redactionEvidence = new Set();
    if (redactedIds.length) {
      const evidence = await ActivityLog.find({
        action: "AUDIT_REDACT",
        resource_id: { $in: redactedIds },
      })
        .select("action resource_id")
        .lean();
      for (const e of evidence) {
        if (e.action === "AUDIT_REDACT" && e.resource_id) {
          redactionEvidence.add(String(e.resource_id));
        }
      }
    }

    const problems = [];
    let redactedCount = 0;
    /* Chained rows written before hash_version 2: created_at was never stored,
       so their content cannot be re-hashed. Links are still checked. */
    let contentUnverifiable = 0;
    let seenCurrentVersion = false;
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

    /* Known forks. Until CHAIN_FORK_FIXED_AT, two log writes at the same
       moment could both read the same chain tip and both store it as
       hash_prev (fixed in data/lib/activityLog.js by writing one at a time).
       That leaves a row whose link does not match the row before it in time,
       but whose parent exists and is shared with exactly one sibling. Such a
       row is reported as `forked_pre_fix`, not as a break. A fork after the
       fix, a parent that does not exist, or a missing row still count as
       `link_broken`. The row's own content hash is checked as usual. */
    const childrenOf = new Map();
    for (const r of records) {
      if (r.hash_prev) childrenOf.set(r.hash_prev, (childrenOf.get(r.hash_prev) || 0) + 1);
    }
    const seenHashes = new Map();
    const forks = [];

    for (const record of records) {
      if (prevHash === null && windowStartsMidChain && record.hash_self) {
        prevHash = record.hash_prev || null;
      }
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
        const boundary =
          record.hash_prev && disposedThrough.has(record.hash_prev);
        const parent = record.hash_prev ? seenHashes.get(record.hash_prev) : null;
        const knownFork =
          parent &&
          new Date(record.createdAt) < CHAIN_FORK_FIXED_AT &&
          childrenOf.get(record.hash_prev) === 2;
        if (boundary) {
          archived += 1;
        } else if (knownFork) {
          forks.push({
            id: String(record._id),
            createdAt: record.createdAt,
            parent_id: String(parent._id),
          });
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

      if (record.redacted) {
        redactedCount += 1;
        if (!redactionEvidence.has(String(record._id))) {
          problems.push({
            type: "redaction_unrecorded",
            id: String(record._id),
            createdAt: record.createdAt,
          });
        }
      } else if ((record.hash_version || 0) >= 2) {
        seenCurrentVersion = true;
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
      } else if (seenCurrentVersion) {
        /* Every row written after the fix carries hash_version 2; a chained
           row without it after one that has it was altered to dodge the
           content check. */
        problems.push({
          type: "version_downgrade",
          id: String(record._id),
          createdAt: record.createdAt,
        });
      } else {
        contentUnverifiable += 1;
      }

      prevHash = record.hash_self;
      seenHashes.set(record.hash_self, record);
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
        redacted: redactedCount,
        /* Chained, links intact, but content not re-hashable (pre-fix rows). */
        content_unverifiable_legacy: contentUnverifiable,
        /* Concurrent-write forks from before the fix; not tampering. */
        forked_pre_fix: forks.length,
        forks: forks.slice(0, 100),
        problems: problems.slice(0, 100),
        truncated,
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
