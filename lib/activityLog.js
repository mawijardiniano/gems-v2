import ActivityLog from "@/models/activity_log";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { canViewPII } from "@/lib/profileBroker";

const JWT_SECRET = process.env.JWT_SECRET;

/* ── Actor resolution ───────────────────────────────────────────────────────
 *
 * The old version returned a bare id and fell back to `null` on any failure,
 * which is how invalid-session events vanished: a null actor then failed the
 * schema's `required` rule and the insert was swallowed by writeLog's catch.
 *
 * Resolution now returns a *snapshot* (id, username, role) taken at write time.
 * It never throws: an unreadable session is itself an auditable fact, so it
 * downgrades the entry to an anonymous actor with a failed outcome instead of
 * dropping the write.
 */
async function resolveActor({ user_id, req, actor }) {
  if (actor?.user_id || actor?.username) {
    return {
      user_id: actor.user_id || null,
      username: actor.username || null,
      role: actor.role || null,
      name: actor.name || null,
      auth_method: actor.auth_method || "system",
    };
  }

  if (!req && user_id) {
    return {
      user_id,
      username: null,
      role: null,
      name: null,
      auth_method: "system",
    };
  }

  if (!req) {
    return { user_id: null, username: null, role: null, name: null, auth_method: null };
  }

  const token = req.cookies?.get?.("auth_token")?.value;
  if (!token) {
    return { user_id: user_id || null, username: null, role: null, name: null, auth_method: null };
  }

  try {
    if (!JWT_SECRET) throw new Error("JWT_SECRET is not configured");
    const decoded = jwt.verify(token, JWT_SECRET);
    return {
      user_id: decoded?.id || user_id || null,
      username: decoded?.username || null,
      /* Role is copied from the token, not re-read from the database: an
         account downgraded mid-session must not have its past entries
         retroactively relabelled with the new role. */
      role: decoded?.role || null,
      name: decoded?.name || null,
      auth_method: "session",
    };
  } catch {
    return {
      user_id: user_id || null,
      username: null,
      role: null,
      name: null,
      auth_method: "invalid_session",
    };
  }
}

/* ── Source address ─────────────────────────────────────────────────────────
 *
 * `x-forwarded-for` is caller-controlled unless something in front of the app
 * rewrites it, and `proxy.js` only covers /api/auth and /api/profile. So the
 * left-most XFF hop is recorded, but it is not presented as a verified fact.
 */
function resolveIp(req) {
  if (!req) return null;
  const headers = req.headers;
  const cf = headers?.get?.("cf-connecting-ip");
  if (cf) return cf;
  const real = headers?.get?.("x-real-ip");
  if (real) return real;
  const xff = headers?.get?.("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim() || "unknown";
  return "unknown";
}

/* ── Why failures are counted, not merely printed ───────────────────────────
 *
 * Every previous failure mode of this module had the same shape: the write
 * threw, the catch logged to stdout, and the request carried on as though the
 * record existed. A dead audit logger looked exactly like a quiet day. We keep
 * the "never break the business operation" behaviour, but make it *visible*:
 * failures are recorded and surfaced by /api/activity/health so monitoring can
 * alarm on them. See NIST AU-5.
 *
 * WHY A WINDOW, AND NOT A SINCE-BOOT COUNTER
 *
 * A counter that only ever increments makes the probe answer the wrong
 * question. After one transient failure it reports "degraded" forever, so an
 * operator either pages indefinitely or mutes the check — and a muted alarm is
 * indistinguishable from no alarm, which is the exact failure this module was
 * written to end. Reporting failures within a recent window answers "is the
 * writer failing *now*?" while still surfacing a recent failure long enough to
 * be seen.
 *
 * The window is deliberately generous (15 minutes by default). A narrower one
 * would let a failing writer look healthy between polls, which is how an alarm
 * becomes decorative.
 */
export const AUDIT_FAILURE_WINDOW_MS = 15 * 60 * 1000;

/* Timestamps only: the volume is bounded by pruning, and a count derived from
 * them can always be re-read over a different window without re-instrumenting. */
const recentFailures = [];

let lastError = null;
let lastFailedAtMs = null;
let lastAction = null;
/* Attempted writes since boot. Lets a caller tell "no failures because the
 * writer is healthy" from "no failures because nothing was ever attempted". */
let attempted = 0;
/* Failures since boot, kept for diagnostics even after they age out of the
 * window, so a burst does not disappear from the record entirely. */
let failedTotal = 0;

function pruneFailures(nowMs) {
  const cutoff = nowMs - AUDIT_FAILURE_WINDOW_MS;
  while (recentFailures.length && recentFailures[0] < cutoff) {
    recentFailures.shift();
  }
}

/**
 * Failure statistics, as a monitor needs them.
 *
 * `count` is failures inside the window, not since boot: that is what the probe
 * alarms on. `total` keeps the since-boot figure for diagnostics, so a fleet of
 * failures does not vanish from the record just because they aged out.
 */
export function getAuditFailureStats({ now = Date.now() } = {}) {
  pruneFailures(now);
  return {
    count: recentFailures.length,
    total: failedTotal,
    attempted,
    window_ms: AUDIT_FAILURE_WINDOW_MS,
    last_error: lastError,
    last_failed_at: lastFailedAtMs ? new Date(lastFailedAtMs).toISOString() : null,
    last_action: lastAction,
  };
}

function recordFailure(entry, err) {
  const nowMs = Date.now();
  recentFailures.push(nowMs);
  failedTotal += 1;
  lastError = err?.message || String(err);
  lastFailedAtMs = nowMs;
  lastAction = entry?.action || null;
  pruneFailures(nowMs);
  console.error("Activity log failed:", err);
}

async function writeLog(entry) {
  attempted += 1;
  try {
    await ActivityLog.create(entry);
    return true;
  } catch (err) {
    recordFailure(entry, err);
    return false;
  }
}


/* The hash is computed over a deliberately explicit projection rather than the
   raw document: `_id` and server-added fields differ between a dry run and the
   insert, which would make every entry's hash unverifiable. */
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

async function linkHash(entry) {
  try {
    const prev = await ActivityLog.findOne({ hash_self: { $ne: null } })
      .sort({ createdAt: -1 })
      .select("hash_self")
      .lean();
    const hashPrev = prev?.hash_self || null;
    const hashSelf = crypto
      .createHash("sha256")
      .update(`${hashPrev || ""}|${canonical(entry)}`)
      .digest("hex");
    return { hash_prev: hashPrev, hash_self: hashSelf };
  } catch (err) {
    /* A broken chain must not cost us the record itself: store it unlinked and
       let verification report the gap.
     *
     * The reason is persisted, not just logged, because an unlinked row has two
     * very different meanings and the reader must be able to tell them apart:
     * a row written before the chain existed is history, while a row whose
     * linking failed is evidence that the writer was degraded at that moment.
     * Without this marker both look identical in the trail, and an auditor
     * reading "N unlinked" cannot tell old data from a broken writer. */
    recordFailure(entry, err);
    return {
      hash_prev: null,
      hash_self: null,
      metadata: {
        ...(entry.metadata || {}),
        link_error: err?.message || String(err),
      },
    };
  }
}

export function logActivity({
  user_id = null,
  actor = null,
  action,
  description = "",
  req = null,
  metadata = {},
  severity = "info",
  resource_type = null,
  resource_id = null,
  changes = null,
  outcome = null,
  route = null,
  module = null,
  request_id = null,
  session_id = null,
}) {
  const task = (async () => {
    const resolved = await resolveActor({ user_id, req, actor });

    const entry = {
      user_id: resolved.user_id,
      actor: resolved,
      action,
      description,
      severity,
      resource_type,
      resource_id,
      route,
      module,
      changes: changes || undefined,
      outcome: {
        result: outcome?.result || "success",
        status_code: outcome?.status_code ?? null,
        error_code: outcome?.error_code ?? null,
        message: outcome?.message ?? null,
      },
      request_id,
      session_id,
      ip_address: resolveIp(req),
      user_agent: req?.headers?.get?.("user-agent") || "unknown",
      metadata,
      /* Stamped here rather than left to Mongoose's `timestamps`, because the
         hash must cover the same instant that ends up stored. */
      created_at: new Date().toISOString(),
    };

    const hashes = await linkHash(entry);
    return writeLog({ ...entry, ...hashes });
  })();

  /* Info-level successes stay fire-and-forget so a log write never adds latency
     to an ordinary request. Anything that could matter in an investigation is
     awaited, so the caller cannot report success before the record exists. */
  const failed = (outcome?.result || "success") !== "success";
  if (severity === "info" && !failed) {
    return;
  }

  return task;
}

/* ── Field-level diff ───────────────────────────────────────────────────────
 *
 * Turns "someone saved this" into "this field went from A to B". Values are
 * normalised before comparison so that a round-trip through MongoDB does not
 * register a change on every save (ObjectId vs string, Date vs ISO string).
 *
 * `redactedFields` lists dotted paths whose real values must never be copied
 * into the log — the vaulted PII. Those still produce a change entry with the
 * value withheld, because *that* a field changed is itself the audit fact.
 */
function normalise(value) {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && typeof value.toHexString === "function") {
    return value.toString();
  }
  if (Array.isArray(value)) return value.map(normalise);
  return value;
}

function sameValue(a, b) {
  return JSON.stringify(normalise(a)) === JSON.stringify(normalise(b));
}

function readPath(obj, path) {
  return path.split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

export function diffFields(before, after, fields, { redactedFields = [] } = {}) {
  const changes = [];
  for (const field of fields) {
    const prev = readPath(before, field);
    const next = readPath(after, field);

    /* Absent from both sides: this update never touched the field. */
    if (prev === undefined && next === undefined) continue;
    if (sameValue(prev, next)) continue;

    if (redactedFields.includes(field)) {
      changes.push({ field, before: "[vaulted]", after: "[vaulted]", redacted: true });
    } else {
      changes.push({
        field,
        before: normalise(prev),
        after: normalise(next),
        redacted: false,
      });
    }
  }
  return changes;
}

/* ── PII access ─────────────────────────────────────────────────────────────
 *
 * Records that someone viewed unmasked PII.
 *
 * Runs at `warning` severity so it is always awaited and always visible in
 * the activity log — a breach investigation needs a complete record of who
 * looked at whom, and when.
 *
 * `metadata` deliberately stores only identifiers (profile id, public id,
 * which field groups were revealed). The PII itself is never copied into the
 * log, because an activity entry has far weaker protection than the vault.
 */
export async function logPiiAccess({
  req = null,
  user_id = null,
  role = null,
  profileId = null,
  gemsPublicId = null,
  fields = [],
  context = "view",
}) {
  if (!canViewPII(role)) return;

  return logActivity({
    user_id,
    req,
    action: "PII_ACCESS",
    description: `Viewed full personal information${
      gemsPublicId ? ` for ${gemsPublicId}` : ""
    } (${context})`,
    severity: "warning",
    resource_type: "profile",
    resource_id: profileId,
    metadata: {
      role,
      profile_id: profileId,
      gems_public_id: gemsPublicId,
      fields,
      context,
    },
    module: "profile",
  });
}

/* ── Redaction: the only sanctioned mutation of a stored record ─────────────
 *
 * A statute or a registrar sometimes requires that particular detail be
 * removed. Deleting the record satisfies the request and destroys the evidence;
 * blanking the *content* while keeping the actor, action, timestamp and hash
 * link satisfies both. It writes through the raw driver collection because the
 * schema's append-only guards exist precisely to block everything else — see
 * the note in models/activity_log.js.
 */
export async function redactActivityLog({ id, reason, req = null }) {
  const mongoose = (await import("mongoose")).default;
  const resolved = await resolveActor({ req, user_id: null, actor: null });
  const _id = mongoose.Types.ObjectId.isValid(id)
    ? new mongoose.Types.ObjectId(id)
    : id;

  return ActivityLog.collection.updateOne(
    { _id },
    {
      $set: {
        description: `[redacted]${reason ? ` ${reason}` : ""}`,
        metadata: null,
        changes: null,
        redacted: true,
        redacted_at: new Date().toISOString(),
        redacted_by: resolved.user_id ? String(resolved.user_id) : null,
      },
    },
  );
}

