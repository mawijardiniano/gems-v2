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
