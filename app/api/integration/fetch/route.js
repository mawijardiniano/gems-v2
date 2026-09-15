import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import SystemSetting from "@/models/systemSetting";
import { requireIntegrationAccess } from "@/app/api/integration/_utils/auth";
import { stageRows } from "@/app/api/integration/_utils/staging";
import { writeSyncLog } from "@/app/api/integration/_utils/logger";

const CONFIG_KEY = "hrmis_integration";
const FETCH_TIMEOUT_MS = 30000;

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
        return NextResponse.json(
          {
            status: "error",
            message: `Fetch timed out after ${FETCH_TIMEOUT_MS / 1000}s`,
          },
          { status: 504 },
        );
      }
      return NextResponse.json(
        { status: "error", message: `Failed to reach endpoint: ${err.message}` },
        { status: 502 },
      );
    }
    clearTimeout(timeout);

    if (!response.ok) {
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
