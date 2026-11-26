import { NextResponse } from "next/server";
import { loadFieldMapping } from "@/app/api/integration/_utils/fieldMapping";
import { connectDB } from "@/data/lib/db";
import SystemSetting from "@/models/systemSetting";
import { requireIntegrationAccess } from "@/app/api/integration/_utils/auth";
import {
  fetchHrmisRows,
  safeHost,
} from "@/app/api/integration/_utils/hrmisFetch";
import { logActivity } from "@/data/lib/activityLog";
import {
  buildHeaderMap,
  headerReport,
} from "@/app/api/integration/_utils/headerMap";

const CONFIG_KEY = "hrmis_integration";
const TEST_TIMEOUT_MS = 15000;

/**
 * Calls the saved HRMIS endpoint and reports whether it answers with rows,
 * without staging anything or changing the last-sync status. Uses the stored
 * config only, like the fetch route, so it cannot be pointed at another URL.
 * Returns the row count and the first row's column names; never row values,
 * which hold personal data.
 */
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

    const setting = await SystemSetting.findOne({ key: CONFIG_KEY }).lean();
    const endpoint = setting?.value?.endpoint || "";
    const headers = setting?.value?.headers || {};
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

    const started = Date.now();
    const result = await fetchHrmisRows(endpoint, headers, {
      timeoutMs: TEST_TIMEOUT_MS,
    });
    const elapsedMs = Date.now() - started;

    const first = result.rows?.[0];
    const columns =
      first && typeof first === "object" && !Array.isArray(first)
        ? Object.keys(first)
        : [];
    /* Same column matching as a real sync, so "missing" here means a sync
       would fail those rows too. */
    const missing = result.rows?.length
      ? headerReport(columns, buildHeaderMap(columns, await loadFieldMapping()))
          .missing
      : [];

    await logActivity({
      req,
      user_id: auth.user._id,
      action: "INTEGRATION_CONNECTION_TEST",
      description: result.error
        ? `HRMIS connection test failed: ${result.error.logMessage}`
        : `HRMIS connection test returned ${result.rows.length} row(s)`,
      resource_type: "integration_config",
      module: "integration",
      metadata: {
        endpoint_host: safeHost(endpoint),
        rows: result.rows?.length ?? 0,
        elapsed_ms: elapsedMs,
      },
      outcome: result.error
        ? {
            result: "failure",
            status_code: result.error.status,
            error_code: result.error.code,
            message: result.error.logMessage,
          }
        : { result: "success", status_code: 200 },
    });

    if (result.error) {
      return NextResponse.json(
        { status: "error", message: result.error.message },
        { status: result.error.status },
      );
    }

    return NextResponse.json({
      status: "success",
      data: {
        rows: result.rows.length,
        columns,
        missing_columns: missing,
        elapsed_ms: elapsedMs,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 },
    );
  }
}
