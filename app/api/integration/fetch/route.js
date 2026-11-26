import { NextResponse } from "next/server";
import { loadFieldMapping } from "@/app/api/integration/_utils/fieldMapping";
import { connectDB } from "@/data/lib/db";
import SystemSetting from "@/models/systemSetting";
import { requireIntegrationAccess } from "@/app/api/integration/_utils/auth";
import { stageRows } from "@/app/api/integration/_utils/staging";
import {
  fetchHrmisRows,
  safeHost,
} from "@/app/api/integration/_utils/hrmisFetch";
import { writeSyncLog } from "@/app/api/integration/_utils/logger";
import { logActivity } from "@/data/lib/activityLog";

const CONFIG_KEY = "hrmis_integration";

/* A refused or unreachable external system is a fact worth keeping: repeated
   failures here are how a misconfigured — or deliberately sabotaged — sync is
   recognised. Severity is `warning` so the write is awaited and visible. */
async function logFetchFailure(
  req,
  auth,
  { endpoint, sourceName, errorCode, statusCode, message },
) {
  /* Record the failure on the stored config too, so the page stops showing
     the previous successful sync as the latest state. */
  await SystemSetting.findOneAndUpdate(
    { key: CONFIG_KEY },
    {
      $set: {
        "value.last_sync_at": new Date(),
        "value.last_sync_status": "failed",
        "value.last_sync_message": String(message || "Sync failed").slice(0, 300),
      },
    },
  );

  await logActivity({
    req,
    user_id: auth.user._id,
    action: "IMPORT_BATCH_FETCH_FAILED",
    description: `Fetch from ${sourceName} failed: ${message}`,
    severity: "warning",
    resource_type: "integration_config",
    module: "integration",
    metadata: {
      source_name: sourceName,
      endpoint_host: safeHost(endpoint),
      fetched: 0,
    },
    outcome: {
      result: "failure",
      status_code: statusCode,
      error_code: errorCode,
      message,
    },
  });
}

export async function POST(req) {
  try {
    await connectDB();

    const auth = await requireIntegrationAccess(req);
    if (auth.error) {
      return NextResponse.json(
        { status: "error", message: auth.error },
        { status: auth.status, headers: auth.headers },
      );
    }

    const body = await req.json().catch(() => ({}));
    const sourceName = body.source_name || "HRMIS API";

    /* Endpoint and headers come only from the stored config, which is
       validated and audited on save. Accepting them from the request body
       would let a caller point the server at any URL, unaudited. */
    const setting = await SystemSetting.findOne({ key: CONFIG_KEY }).lean();
    const storedConfig = setting?.value || null;
    const endpoint = storedConfig?.endpoint || "";
    const headers = storedConfig?.headers || {};
    const defaultSchoolYear =
      body.school_year || storedConfig?.school_year || "";
    const defaultSemester = body.semester || storedConfig?.semester || "";

    if (!endpoint) {
      return NextResponse.json(
        {
          status: "error",
          message:
            "No HRMIS endpoint configured. Save the integration config first.",
        },
        { status: 400 },
      );
    }

    const result = await fetchHrmisRows(endpoint, headers);
    if (result.error) {
      await logFetchFailure(req, auth, {
        endpoint,
        sourceName,
        errorCode: result.error.code,
        statusCode: result.error.status,
        message: result.error.logMessage,
      });
      return NextResponse.json(
        { status: "error", message: result.error.message },
        { status: result.error.status },
      );
    }
    const { rows } = result;

    const { batch, insertedCount, duplicateCount, sameAs, headerReport } =
      await stageRows({
        rows,
        sourceType: "hrmis_api",
        sourceName,
        createdBy: auth.user._id,
        createdByUsername: auth.user.username,
        customHeaders: await loadFieldMapping(),
        defaults: {
          school_year: defaultSchoolYear,
          semester: defaultSemester,
        },
      });

    if (storedConfig) {
      await SystemSetting.findOneAndUpdate(
        { key: CONFIG_KEY },
        {
          $set: {
            "value.last_sync_at": new Date(),
            "value.last_sync_status": "success",
            "value.last_sync_message": `Fetched ${rows.length} row(s)`,
          },
        },
      );
    }

    await writeSyncLog({
      batchId: batch._id,
      action: "sync",
      message: `Fetched ${rows.length} row(s) from HRMIS API (${insertedCount} staged, ${duplicateCount} duplicates flagged)`,
      details: {
        /* Host only: the endpoint's query string may carry a token. */
        endpoint_host: safeHost(endpoint),
        fetched: rows.length,
        staged: insertedCount,
        duplicates_flagged: duplicateCount,
      },
      executedBy: auth.user._id,
      executedByUsername: auth.user.username,
    });

    /* A fetch is the unvetted half of the pipeline: it pulls an external
       system's view of staff and students into a batch nobody has approved yet.
       Audited because it is *not* the same act as the upload route's — this one
       is triggered from inside the app against a configured live endpoint, at a
       time of the operator's choosing, which is exactly the pattern an
       investigation asks about later. The endpoint host is recorded, never the
       configured headers: those carry credentials. */
    await logActivity({
      req,
      user_id: auth.user._id,
      action: "IMPORT_BATCH_FETCH",
      description: `Fetched ${rows.length} row(s) from ${sourceName} into a new batch`,
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
      },
      outcome: { result: "success", status_code: 201 },
    });

    return NextResponse.json(
      {
        status: "success",
        data: {
          batch_id: batch._id,
          fetched: rows.length,
          staged: insertedCount,
          duplicates_flagged: duplicateCount,
          same_as: sameAs,
          header_problems: headerReport.problems,
          unused_columns: headerReport.unrecognized,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 },
    );
  }
}
