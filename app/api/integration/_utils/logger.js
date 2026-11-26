import SyncLog from "@/models/syncLog";

export async function writeSyncLog({
  batchId,
  stagingRecordId,
  level = "info",
  action,
  message,
  details = {},
  executedBy,
  executedByUsername,
  targetProfileId,
  targetProfileTermId,
}) {
  await SyncLog.create({
    batch_id: batchId,
    staging_record_id: stagingRecordId,
    level,
    action,
    message,
    details,
    executed_by: executedBy,
    executed_by_username: executedByUsername,
    target_profile_id: targetProfileId,
    target_profile_term_id: targetProfileTermId,
  });
}

/* Rows of sync log for a long loop: entries are held and inserted in
   chunks, one insert per FLUSH_AT rows instead of one per row. Call
   flush() when the loop ends. */
const FLUSH_AT = 200;

export function createSyncLogBuffer() {
  let pending = [];
  async function flush() {
    if (!pending.length) return;
    const docs = pending;
    pending = [];
    await SyncLog.insertMany(docs, { ordered: false });
  }
  async function push({
    batchId,
    stagingRecordId,
    level = "info",
    action,
    message,
    details = {},
    executedBy,
    executedByUsername,
    targetProfileId,
    targetProfileTermId,
  }) {
    pending.push({
      batch_id: batchId,
      staging_record_id: stagingRecordId,
      level,
      action,
      message,
      details,
      executed_by: executedBy,
      executed_by_username: executedByUsername,
      target_profile_id: targetProfileId,
      target_profile_term_id: targetProfileTermId,
    });
    if (pending.length >= FLUSH_AT) await flush();
  }
  return { push, flush };
}
