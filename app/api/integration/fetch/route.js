import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import SystemSetting from "@/models/systemSetting";
import { requireIntegrationAccess } from "@/app/api/integration/_utils/auth";
import { stageRows } from "@/app/api/integration/_utils/staging";
import { writeSyncLog } from "@/app/api/integration/_utils/logger";
import { logActivity } from "@/lib/activityLog";

const CONFIG_KEY = "hrmis_integration";
const FETCH_TIMEOUT_MS = 30000;

/* An endpoint URL may carry a token in its query string. Only the host is ever
   written to the log — enough to name the external system, not enough to leak
   the credential used to reach it. */
function safeHost(endpoint) {
  try {
    return new URL(endpoint).host || null;
  } catch {
    return null;
  }
}

/* A refused or unreachable external system is a fact worth keeping: repeated
   failures here are how a misconfigured — or deliberately sabotaged — sync is
   recognised. Severity is `warning` so the write is awaited and visible. */
async function logFetchFailure(req, auth, { endpoint, sourceName, errorCode, statusCode, message }) {
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
    outcome: { result: "failure", status_code: statusCode, error_code: errorCode, message },
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

    let endpoint = body.endpoint || "";
    let headers = body.headers || {};
    let storedConfig = null;
    if (!endpoint || Object.keys(headers).length === 0) {
      const setting = await SystemSetting.findOne({ key: CONFIG_KEY }).lean();
      storedConfig = setting?.value || null;
      if (!endpoint && storedConfig?.endpoint) endpoint = storedConfig.endpoint;
      if (Object.keys(headers).length === 0 && storedConfig?.headers) {
        headers = storedConfig.headers;
      }
    }
    const defaultSchoolYear = body.school_year || storedConfig?.school_year || "";
    const defaultSemester = body.semester || storedConfig?.semester || "";

    if (!endpoint) {
      return NextResponse.json(
        { status: "error", message: "endpoint is required (no stored config found)" },
        { status: 400 },
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let response;
    try {
      response = await fetch(endpoint, {
        headers,
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeout);
      if (err?.name === "AbortError") {
        await logFetchFailure(req, auth, {
          endpoint,
          sourceName,
          errorCode: "FETCH_TIMEOUT",
          statusCode: 504,
          message: `Fetch timed out after ${FETCH_TIMEOUT_MS / 1000}s`,
        });
        return NextResponse.json(
          {
            status: "error",
            message: `Fetch timed out after ${FETCH_TIMEOUT_MS / 1000}s`,
          },
          { status: 504 },
        );
      }
      await logFetchFailure(req, auth, {
        endpoint,
        sourceName,
        errorCode: "FETCH_UNREACHABLE",
        statusCode: 502,
        message: err.message,
      });
      return NextResponse.json(
        { status: "error", message: `Failed to reach endpoint: ${err.message}` },
        { status: 502 },
      );
    }
    clearTimeout(timeout);

    if (!response.ok) {
      await logFetchFailure(req, auth, {
        endpoint,
        sourceName,
        errorCode: "FETCH_REJECTED",
        statusCode: 400,
        message: `Endpoint responded ${response.status}`,
      });
      return NextResponse.json(
        {
          status: "error",
          message: `Failed to fetch endpoint: ${response.status}`,
        },
        { status: 400 },
      );
    }

    const payload = await response.json();
    const rows = Array.isArray(payload)
      ? payload
      : Array.isArray(payload.data)
        ? payload.data
        : [];

    const { batch, insertedCount, duplicateCount } = await stageRows({
      rows,
      sourceType: "hrmis_api",
      sourceName,
      createdBy: auth.user._id,
      createdByUsername: auth.user.username,
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
        endpoint,
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
