/* One HRMIS sync: fetch the configured endpoint and stage the rows as a
   batch. Shared by Sync Now (the fetch route) and the daily scheduled sync,
   so both record the same sync status, sync log and audit entry. */
import SystemSetting from "@/models/systemSetting";
import { stageRows } from "@/app/api/integration/_utils/staging";
import {
  fetchHrmisRows,
  safeHost,
} from "@/app/api/integration/_utils/hrmisFetch";
import { loadFieldMapping } from "@/app/api/integration/_utils/fieldMapping";
import { writeSyncLog } from "@/app/api/integration/_utils/logger";
import { logActivity } from "@/data/lib/activityLog";

export const HRMIS_CONFIG_KEY = "hrmis_integration";

async function recordSyncStatus(status, message) {
  await SystemSetting.findOneAndUpdate(
    { key: HRMIS_CONFIG_KEY },
    {
      $set: {
        "value.last_sync_at": new Date(),
        "value.last_sync_status": status,
        "value.last_sync_message": String(message || "").slice(0, 300),
      },
    },
  );
}

/**
 * @param actor { user_id, username, role, auth_method } — who the batch is
 *   staged for: the signed-in user, or for a scheduled run the admin who
 *   turned the schedule on.
 * @param req the request, for the audit trail's IP; null for a scheduled run.
 * @param scheduled true for the daily run: an unchanged feed stages nothing.
 * @returns { error: { status, message } } or { data } (the fetch route's
 *   response body), with data.skipped when nothing was staged.
 */
export async function runHrmisSync({
  actor,
  req = null,
  sourceName = "HRMIS API",
  schoolYear = "",
  semester = "",
  scheduled = false,
}) {
  /* Endpoint and headers come only from the stored config, which is
     validated and audited on save. */
  const setting = await SystemSetting.findOne({ key: HRMIS_CONFIG_KEY }).lean();
  const storedConfig = setting?.value || null;
  const endpoint = storedConfig?.endpoint || "";
  const headers = storedConfig?.headers || {};
  const defaultSchoolYear = schoolYear || storedConfig?.school_year || "";
  const defaultSemester = semester || storedConfig?.semester || "";
  const how = scheduled ? "Scheduled sync" : "Fetch";

  if (!endpoint) {
    return {
      error: {
        status: 400,
        message:
          "No HRMIS endpoint configured. Save the integration config first.",
      },
    };
  }

  const result = await fetchHrmisRows(endpoint, headers);
  if (result.error) {
    /* A refused or unreachable external system is a fact worth keeping:
       repeated failures are how a misconfigured — or deliberately
       sabotaged — sync is recognised. Recorded on the config too, so the
       page stops showing the previous success as the latest state. */
    await recordSyncStatus("failed", result.error.logMessage || "Sync failed");
    await logActivity({
      req,
      actor,
      action: "IMPORT_BATCH_FETCH_FAILED",
      description: `${how} from ${sourceName} failed: ${result.error.logMessage}`,
      severity: "warning",
      resource_type: "integration_config",
      module: "integration",
      metadata: {
        source_name: sourceName,
        endpoint_host: safeHost(endpoint),
        fetched: 0,
        scheduled,
      },
      outcome: {
        result: "failure",
        status_code: result.error.status,
        error_code: result.error.code,
        message: result.error.logMessage,
      },
    });
    return {
      error: { status: result.error.status, message: result.error.message },
    };
  }
  const { rows } = result;

  const staged = await stageRows({
    rows,
    sourceType: "hrmis_api",
    sourceName,
    createdBy: actor.user_id,
    createdByUsername: scheduled
      ? `${actor.username || "admin"} (scheduled)`
      : actor.username,
    customHeaders: await loadFieldMapping(),
    skipUnchanged: scheduled,
    defaults: {
      school_year: defaultSchoolYear,
      semester: defaultSemester,
    },
  });
  const { batch, insertedCount, duplicateCount, sameAs, headerReport } = staged;

  if (staged.skipped) {
    const message = `${how}: ${rows.length} row(s), unchanged since batch "${sameAs.source_name || sameAs.batch_id}"; nothing staged`;
    await recordSyncStatus("success", message);
    await logActivity({
      req,
      actor,
      action: "IMPORT_BATCH_FETCH",
      /* Warning level is awaited; a scheduled run has no request to outlive. */
      ...(scheduled ? { severity: "warning" } : {}),
      description: message,
      resource_type: "integration_config",
      module: "integration",
      metadata: {
        source_name: sourceName,
        endpoint_host: safeHost(endpoint),
        fetched: rows.length,
        staged: 0,
        same_content_as: String(sameAs.batch_id),
        scheduled,
      },
      outcome: { result: "success", status_code: 200 },
    });
    return {
      data: {
        batch_id: null,
        fetched: rows.length,
        staged: 0,
        duplicates_flagged: 0,
        same_as: sameAs,
        skipped: true,
      },
    };
  }

  if (storedConfig) {
    await recordSyncStatus(
      "success",
      `${scheduled ? "Scheduled sync: fetched" : "Fetched"} ${rows.length} row(s)`,
    );
  }

  await writeSyncLog({
    batchId: batch._id,
    action: "sync",
    message: `${scheduled ? "Scheduled sync fetched" : "Fetched"} ${rows.length} row(s) from HRMIS API (${insertedCount} staged, ${duplicateCount} duplicates flagged)`,
    details: {
      /* Host only: the endpoint's query string may carry a token. */
      endpoint_host: safeHost(endpoint),
      fetched: rows.length,
      staged: insertedCount,
      duplicates_flagged: duplicateCount,
      scheduled,
    },
    executedBy: actor.user_id,
    executedByUsername: actor.username,
  });

  /* A fetch is the unvetted half of the pipeline: it pulls an external
     system's view of staff and students into a batch nobody has approved
     yet. The endpoint host is recorded, never the configured headers: those
     carry credentials. */
  await logActivity({
    req,
    actor,
    action: "IMPORT_BATCH_FETCH",
    /* Warning level is awaited; a scheduled run has no request to outlive. */
    ...(scheduled ? { severity: "warning" } : {}),
    description: `${scheduled ? "Scheduled sync fetched" : "Fetched"} ${rows.length} row(s) from ${sourceName} into a new batch`,
    resource_type: "import_batch",
    resource_id: batch._id,
    module: "integration",
    metadata: {
      batch_id: String(batch._id),
      source_name: sourceName,
      source_type: "hrmis_api",
      endpoint_host: safeHost(endpoint),
      school_year: defaultSchoolYear || null,
      semester: defaultSemester || null,
      fetched: rows.length,
      staged: insertedCount,
      duplicates_flagged: duplicateCount,
      same_content_as: sameAs ? String(sameAs.batch_id) : null,
      scheduled,
    },
    outcome: { result: "success", status_code: 201 },
  });

  return {
    data: {
      batch_id: batch._id,
      fetched: rows.length,
      staged: insertedCount,
      duplicates_flagged: duplicateCount,
      same_as: sameAs,
      header_problems: headerReport.problems,
      unused_columns: headerReport.unrecognized,
    },
  };
}
