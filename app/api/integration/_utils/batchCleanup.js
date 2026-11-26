/* Automatic removal of import batches that were never imported and have
   not been touched for a set number of days. Their staging rows hold a
   plain copy of personal data, so an abandoned batch should not stay
   forever. Off until an admin sets the number of days. Batches with any
   imported row are history and are never removed here. */
import ImportBatch from "@/models/importBatch";
import StagingRecord from "@/models/stagingRecord";
import SyncLog from "@/models/syncLog";
import SystemSetting from "@/models/systemSetting";
import { logActivity } from "@/data/lib/activityLog";
import { appDateInput } from "@/data/lib/appTime";
import { connectDB } from "@/data/lib/db";

export const CLEANUP_KEY = "integration_cleanup";
export const MIN_CLEANUP_DAYS = 7;
export const MAX_CLEANUP_DAYS = 365;
/* Statuses a batch can sit in without anything having been imported.
   "migrating" and "completed" are never removed. */
const REMOVABLE_STATUSES = ["pending", "validating", "ready", "failed"];
const DAY_MS = 24 * 60 * 60 * 1000;

export async function loadCleanupSettings() {
  const setting = await SystemSetting.findOne({ key: CLEANUP_KEY }).lean();
  const value = setting?.value || {};
  return {
    after_days: Number(value.after_days) || 0,
    last_run_on: value.last_run_on || "",
    updated_by: value.updated_by || null,
    updated_by_username: value.updated_by_username || "",
  };
}

/** 0 (off) or a whole number of days in range; otherwise an error message. */
export function parseCleanupDays(input) {
  const days = Number(input);
  if (days === 0) return { days: 0 };
  if (!Number.isInteger(days) || days < MIN_CLEANUP_DAYS || days > MAX_CLEANUP_DAYS) {
    return {
      error: `Days must be 0 (off) or a whole number from ${MIN_CLEANUP_DAYS} to ${MAX_CLEANUP_DAYS}.`,
    };
  }
  return { days };
}

/**
 * Batches that would be removed now: removable status, not updated for
 * `afterDays`, and no imported row. Returns summaries, no row data.
 */
export async function findStaleBatches({ afterDays, now = new Date() }) {
  if (!afterDays) return [];
  const cutoff = new Date(now.getTime() - afterDays * DAY_MS);
  const candidates = await ImportBatch.find({
    status: { $in: REMOVABLE_STATUSES },
    updatedAt: { $lt: cutoff },
  })
    .select("source_name source_type status createdAt updatedAt created_by_username totals")
    .sort({ updatedAt: 1 })
    .lean();
  if (!candidates.length) return [];

  const ids = candidates.map((b) => b._id);
  const withImported = new Set(
    (
      await StagingRecord.distinct("batch_id", {
        batch_id: { $in: ids },
        status: "migrated",
      })
    ).map(String),
  );
  return candidates
    .filter((b) => !withImported.has(String(b._id)))
    .map((b) => ({
      batch_id: b._id,
      source_name: b.source_name || "",
      source_type: b.source_type,
      status: b.status,
      created_by_username: b.created_by_username || "",
      created_at: b.createdAt,
      updated_at: b.updatedAt,
      rows: b.totals?.fetched ?? 0,
    }));
}

/**
 * Removes the stale batches with their staging rows and sync logs. Returns
 * `audit`, one activity-log entry naming every removed batch, for the
 * caller to write.
 */
export async function removeStaleBatches({ afterDays, now = new Date(), actor, trigger }) {
  const stale = await findStaleBatches({ afterDays, now });
  const cutoff = new Date(now.getTime() - afterDays * DAY_MS);
  const removed = [];
  let deletedRecords = 0;
  let deletedLogs = 0;

  for (const b of stale) {
    /* Re-checked in the delete itself: a batch someone opened or changed
       since the list was made is left alone. */
    const gone = await ImportBatch.findOneAndDelete({
      _id: b.batch_id,
      status: { $in: REMOVABLE_STATUSES },
      updatedAt: { $lt: cutoff },
    });
    if (!gone) continue;
    const [records, logs] = await Promise.all([
      StagingRecord.deleteMany({ batch_id: b.batch_id }),
      SyncLog.deleteMany({ batch_id: b.batch_id }),
    ]);
    deletedRecords += records.deletedCount || 0;
    deletedLogs += logs.deletedCount || 0;
    removed.push(b);
  }

  /* One audit entry naming every removed batch (their own logs are gone).
     Written by the caller, which has the request. */
  const audit = removed.length
    ? {
        actor,
        action: "IMPORT_BATCH_CLEANUP",
        description: `Removed ${removed.length} import batch(es) not imported and untouched for ${afterDays} day(s) (${trigger})`,
        severity: "critical",
        resource_type: "import_batch",
        module: "integration",
        metadata: {
          trigger,
          after_days: afterDays,
          deleted_records: deletedRecords,
          deleted_logs: deletedLogs,
          batches: removed.map((b) => ({
            batch_id: String(b.batch_id),
            source_name: b.source_name,
            source_type: b.source_type,
            status: b.status,
            created_by_username: b.created_by_username,
            created_at: b.created_at,
            updated_at: b.updated_at,
            rows: b.rows,
          })),
        },
      }
    : null;

  return {
    removed,
    deleted_records: deletedRecords,
    deleted_logs: deletedLogs,
    audit,
  };
}

/**
 * Daily run from the integration scheduler: once per Manila day, when
 * cleanup is on. The day is claimed atomically, like the scheduled sync.
 */
export async function runCleanupIfDue(now = new Date()) {
  await connectDB();
  const settings = await loadCleanupSettings();
  if (!settings.after_days) return { ran: false, reason: "off" };
  if (!settings.updated_by) return { ran: false, reason: "no_owner" };
  const today = appDateInput(now);
  if (settings.last_run_on === today) return { ran: false, reason: "done_today" };

  const claimed = await SystemSetting.findOneAndUpdate(
    { key: CLEANUP_KEY, "value.last_run_on": { $ne: today } },
    { $set: { "value.last_run_on": today } },
    { new: true },
  );
  if (!claimed) return { ran: false, reason: "claimed_elsewhere" };

  const result = await removeStaleBatches({
    afterDays: settings.after_days,
    now,
    trigger: "daily",
    actor: {
      user_id: settings.updated_by,
      username: settings.updated_by_username || null,
      role: null,
      auth_method: "system",
    },
  });
  if (result.audit) await logActivity(result.audit);
  return { ran: true, result };
}
