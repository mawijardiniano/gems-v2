/* ── Retention ──────────────────────────────────────────────────────────────
 *
 * NIST AU-11 requires that audit records be retained for a defined period and
 * that the period be a documented decision rather than whatever the disk
 * happens to allow. This module is that decision, expressed so it can be
 * enforced and tested.
 *
 * The rule deliberately has three separate bands:
 *
 *   - Security-relevant events (logins, permission and config changes, deletions)
 *     are kept the longest. They are the records an auditor asks for first and
 *     the ones whose loss is hardest to explain.
 *   - Routine informational activity expires sooner. It is valuable for
 *     reconstructing a term's work, not for a multi-year review.
 *   - Anything redacted or marked critical is never expired automatically.
 *     Redacted records are subject to a legal requirement we were told about,
 *     and critical ones are the residue of an incident; neither should be
 *     swept by a scheduled job.
 *
 * Nothing here deletes by default. `planRetention()` reports what would go, and
 * only `applyRetention()` — called explicitly by an operator — acts on it. An
 * audit log that prunes itself on a schedule nobody set is a liability.
 */
import ActivityLog from "@/models/activity_log";
import { logActivity } from "@/lib/activityLog";

export const DEFAULT_RETENTION_DAYS = 365 * 7;

/* ── Why seven years, and what it is not ────────────────────────────────────
 *
 * Seven years is a *provisional* figure, not a legal determination. It is the
 * common floor for records where financial or personnel accountability applies,
 * and erring long is the safer direction: keeping an audit record one year too
 * long is a storage cost, deleting it one year too early is unrecoverable and
 * may breach an obligation nobody checked.
 *
 * It is provisional because the actual period depends on what this system is
 * accountable under — a government retention schedule, the institution's
 * records policy, or the DPO's view. Nobody has made that determination yet.
 *
 * Action required: when the DPO or records officer rules on this, replace this
 * comment with the decision, who made it, and on what basis. Do not let a
 * placeholder become policy by silence — that is how "we keep everything for
 * seven years" turns out to be something nobody ever decided.
 *
 * Both bands are environment-overridable, so the policy can be changed without
 * a code change:
 *
 *   AUDIT_RETENTION_DAYS_SECURITY   long band  (default: this constant)
 *   AUDIT_RETENTION_DAYS_ACTIVITY   short band (default: the long band)
 *
 * `retentionPolicy().source` reports whether the long band came from the
 * environment or the default, so a deployment can tell which is in force.
 */

/* Actions kept for the long period.
 *
 * This is an explicit list rather than a pattern like "anything with DELETE in
 * it", because a pattern would silently classify a future action nobody thought
 * about, and the failure mode of guessing wrong is deleting evidence early.
 * An action absent from this list is treated as routine activity and expires
 * sooner — so the default is the *shorter* period, and anything consequential
 * must be named here deliberately.
 *
 * tests/auditRetention.test.mjs fails if a security-relevant action is used in a
 * route but missing from this list, which is how it stays complete. */
export const LONG_RETENTION_ACTIONS = [
  /* Authentication and account lifecycle — who could act, and when. */
  "LOGIN",
  "LOGIN_FAILED",
  "LOGOUT",
  "CHANGE_PASSWORD",
  "RESET_PASSWORD",
  "ROLE_CHANGE",
  "STATUS_CHANGE",
  "USER_DELETE",
  "USER_DELETE_ALL",
  "AUDIT_REDACT",

  /* Authority and configuration — changes to the rules themselves. */
  "SETTINGS_UPDATE",
  "INTEGRATION_CONFIG_UPDATE",

  /* Destructive acts on records and membership. */
  "PROFILE_BULK_DELETE",
  "BULK_PROFILE_DELETE",
  "PROJECT_BULK_DELETE",
  "GFP_MEMBER_ADD",
  "GFP_MEMBER_REMOVE",
  "GFP_MEMBER_UPDATE",
  "OFFICIAL_VACATE",
  "OFFICIAL_ASSIGN",

  /* The integration pipeline: migration writes into the register of record. */
  "IMPORT_BATCH_FETCH",
  "IMPORT_BATCH_APPROVE",
  "IMPORT_BATCH_REJECT",
  "IMPORT_BATCH_DELETE",
  "IMPORT_BATCH_MIGRATE",

  /* Access to unmasked personal data. Kept longest of all, because the question
     it answers — who looked at whom — is the one a data-protection review
     must be able to answer years later. */
  "PII_ACCESS",
];

const DAY_MS = 24 * 60 * 60 * 1000;

function daysFromEnv(name, fallback) {
  const raw = process.env[name];
  if (raw == null || raw === "") return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

export function retentionPolicy() {
  const longDays = daysFromEnv("AUDIT_RETENTION_DAYS_SECURITY", DEFAULT_RETENTION_DAYS);
  const shortDays = daysFromEnv("AUDIT_RETENTION_DAYS_ACTIVITY", longDays);
  return {
    security_days: longDays,
    activity_days: shortDays,
    /* Periods are read from the environment so a policy change is a deployment
       change, recorded in history, rather than a silent edit to a query. */
    source: process.env.AUDIT_RETENTION_DAYS_SECURITY ? "env" : "default",
  };
}

/* Builds the query for records that have outlived their band. Shared by the
   planner and the applier so a report can never describe a different set of
   records from the one an apply would touch. */
export function expiryFilter({ now = new Date() } = {}) {
  const policy = retentionPolicy();
  const longCutoff = new Date(now.getTime() - policy.security_days * DAY_MS);
  const shortCutoff = new Date(now.getTime() - policy.activity_days * DAY_MS);

  return {
    policy,
    longCutoff,
    shortCutoff,
    filter: {
      redacted: { $ne: true },
      severity: { $ne: "critical" },
      $or: [
        { action: { $in: LONG_RETENTION_ACTIONS }, createdAt: { $lt: longCutoff } },
        { action: { $nin: LONG_RETENTION_ACTIONS }, createdAt: { $lt: shortCutoff } },
      ],
    },
  };
}

/* Reports what expiry would remove, without removing it. */
export async function planRetention({ now = new Date() } = {}) {
  const { policy, longCutoff, shortCutoff, filter } = expiryFilter({ now });

  const [expired, remaining, oldest] = await Promise.all([
    ActivityLog.countDocuments(filter),
    ActivityLog.countDocuments({}),
    ActivityLog.findOne({}).sort({ createdAt: 1 }).select("createdAt").lean(),
  ]);

  return {
    expired,
    total: remaining,
    kept: Math.max(0, remaining - expired),
    oldest: oldest?.createdAt || null,
    policy,
    cutoffs: {
      security: longCutoff.toISOString(),
      activity: shortCutoff.toISOString(),
    },
  };
}

/* ── Archival ───────────────────────────────────────────────────────────────
 *
 * Expiry and disposal are different acts. AU-11 wants records *retained* for a
 * period, not merely kept on a disk until a job removes them; deleting an
 * expired audit record outright would discard material a review may still
 * lawfully demand. So expired records are exported to durable storage first,
 * and the write is verified before anything is removed from the database.
 *
 * The export is JSON Lines rather than a Mongo dump: it must stay readable in
 * ten years by someone with no copy of this application, which rules out
 * anything whose meaning depends on a schema we might have since changed.
 */
export function archiveKey({ now = new Date(), count }) {
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  const prefix = process.env.AUDIT_ARCHIVE_PREFIX || "audit-archive";
  return `${prefix}/${stamp}-${count}.jsonl`;
}

function s3Config() {
  const region = process.env.AWS_REGION;
  const bucket = process.env.AWS_BUCKET_NAME;
  if (!region || !bucket) return null;
  return {
    bucket,
    region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  };
}

/**
 * Writes expired records to object storage.
 *
 * Returns `{ archived: false, reason }` rather than throwing when no bucket is
 * configured — the caller needs to distinguish "nothing to archive" from
 * "archiving was skipped", because only the latter must block disposal.
 */
export async function archiveExpired({ now = new Date(), records }) {
  const config = s3Config();
  if (!config) {
    return { archived: false, reason: "AWS_REGION or AWS_BUCKET_NAME is not set" };
  }

  /* Imported lazily so the app and every other audit feature still work in a
     deployment that has no archive bucket configured. */
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
  const client = new S3Client({ region: config.region, credentials: config.credentials });
  const key = archiveKey({ now, count: records.length });
  const body = records.map((r) => JSON.stringify(r)).join("\n") + "\n";

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: body,
      ContentType: "application/x-ndjson",
      Metadata: { "audit-archive": "true", "record-count": String(records.length) },
    }),
  );

  return { archived: true, key, bucket: config.bucket, count: records.length, body };
}

/* ── Disposal ───────────────────────────────────────────────────────────────
 *
 * Removes expired records from the live collection *after* they are safely
 * archived elsewhere. Two properties are deliberate:
 *
 *   1. It refuses to run when the archive did not happen. Losing audit records
 *      because a bucket was unreachable is worse than a collection that grows.
 *   2. It removes by explicit `_id`, not by re-evaluating the expiry query. Rows
 *      written between planning and disposal are never in scope, and the set
 *      that was archived is exactly the set that is removed — otherwise the
 *      archive would not be a complete record of what was destroyed.
 *
 * The disposal is itself recorded as an `AUDIT_RETENTION_DISPOSE` entry naming
 * the archive object, so the trail states where the removed material now lives.
 */
export async function applyRetention({ now = new Date(), dryRun = true, batchSize = 5000 } = {}) {
  const { policy, longCutoff, shortCutoff, filter } = expiryFilter({ now });

  if (dryRun) {
    return { dryRun: true, planned: await planRetention({ now }) };
  }

  const records = await ActivityLog.find(filter)
    .sort({ createdAt: 1 })
    .limit(batchSize)
    .lean();

  if (records.length === 0) {
    return { dryRun: false, disposed: 0, archived: null, reason: "nothing expired" };
  }

  const archive = await archiveExpired({ now, records });
  if (!archive.archived) {
    return {
      dryRun: false,
      disposed: 0,
      archived: null,
      blocking_reason:
        `Refused to dispose ${records.length} record(s): archiving is unavailable (${archive.reason}). ` +
        "Configure AWS_REGION/AWS_BUCKET_NAME or raise the retention period.",
    };
  }

  /* The archive must contain every record before any is removed: a partial
     write would leave the trail with a hole no verification could interpret. */
  const archivedIds = new Set(
    archive.body
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => {
        try {
          return String(JSON.parse(line)._id);
        } catch {
          return null;
        }
      }),
  );
  const missing = records.filter((r) => !archivedIds.has(String(r._id)));
  if (missing.length > 0) {
    return {
      dryRun: false,
      disposed: 0,
      archived: { key: archive.key, bucket: archive.bucket, count: archive.count },
      blocking_reason:
        `Refused to dispose: ${missing.length} record(s) did not appear in the archive object.`,
    };
  }

  /* Writes through the raw collection. Model.deleteMany is blocked by the
     append-only guard, and that guard must stay absolute — disposal is an
     administrative act with its own record, not an exception to immutability. */
  const ids = records.map((r) => r._id);

  /* Recorded *before* the removal, because the entry has to survive the act it
     describes: if we wrote it afterwards and the process died in between, the
     trail would show a hole with no explanation. It is an ordinary inserted
     record, so it links into the chain normally.

     `disposed_through` is the last removed record's hash. Verification uses it
     to recognise the resulting link break as an archival boundary rather than
     tampering — see the boundary check in app/api/activity/verify/route.js. */
  await logActivity({
    user_id: null,
    action: "AUDIT_RETENTION_DISPOSE",
    severity: "critical",
    resource_type: "AUDIT_LOG",
    description:
      `Retention disposed ${records.length} record(s) after archiving to ` +
      `${archive.bucket}/${archive.key}`,
    outcome: { result: "success" },
    metadata: {
      archive_bucket: archive.bucket,
      archive_key: archive.key,
      archive_count: archive.count,
      count: records.length,
      oldest: records[0]?.createdAt ?? null,
      newest: records[records.length - 1]?.createdAt ?? null,
      disposed_through: records[records.length - 1]?.hash_self ?? null,
      lookback_days: retentionPolicy().security_days,
    },
  });

  const result = await ActivityLog.collection.deleteMany({ _id: { $in: ids } });

  return {
    dryRun: false,
    disposed: result.deletedCount,
    archived: { key: archive.key, bucket: archive.bucket, count: archive.count },
    policy,
    cutoffs: {
      security: longCutoff.toISOString(),
      activity: shortCutoff.toISOString(),
    },
  };
}
