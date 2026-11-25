import { NextResponse } from "next/server";
import { connectDB } from "@/data/lib/db";
import SystemSetting from "@/models/systemSetting";
import { requireIntegrationAccess } from "@/app/api/integration/_utils/auth";
import { logActivity } from "@/data/lib/activityLog";

const CONFIG_KEY = "hrmis_integration";
const SENSITIVE_HEADER_KEYS = [
  "authorization",
  "x-api-key",
  "api-key",
  "apikey",
  "token",
  "cookie",
];

/* Hosts the server must never be pointed at: itself, link-local (cloud
   metadata at 169.254.169.254) and unspecified addresses. Private LAN ranges
   are allowed on purpose — HRMIS may live on the campus network. Only the
   literal hostname is checked; a DNS name resolving to these is not caught. */
function isBlockedHost(hostname) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host === "0.0.0.0" || host === "::" || host === "::1") return true;
  if (/^127\./.test(host)) return true;
  if (/^169\.254\./.test(host)) return true;
  if (/^fe[89ab][0-9a-f]:/.test(host)) return true;
  /* IPv4-mapped IPv6: URL parsing rewrites ::ffff:127.0.0.1 to hex
     (::ffff:7f00:1), so no prefix check on the dotted form is reliable. */
  if (/^::ffff:/.test(host)) return true;
  return false;
}

function maskValue(value) {
  if (!value) return "";
  if (value.length <= 8) return "••••••••";
  return `${value.slice(0, 4)}••••••••${value.slice(-4)}`;
}

function maskHeaders(headers = {}) {
  const masked = {};
  for (const [key, value] of Object.entries(headers)) {
    masked[key] = SENSITIVE_HEADER_KEYS.includes(key.toLowerCase())
      ? maskValue(value)
      : value;
  }
  return masked;
}

export async function GET(req) {
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
    if (!setting) {
      return NextResponse.json({ status: "success", data: null });
    }

    const value = setting.value || {};
    return NextResponse.json({
      status: "success",
      data: {
        endpoint: value.endpoint || "",
        headers: maskHeaders(value.headers || {}),
        school_year: value.school_year || "",
        semester: value.semester || "",
        last_sync_at: value.last_sync_at || null,
        last_sync_status: value.last_sync_status || null,
        last_sync_message: value.last_sync_message || "",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 },
    );
  }
}

export async function PUT(req) {
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
    const endpoint =
      typeof body.endpoint === "string" ? body.endpoint.trim() : "";
    const headers =
      body.headers && typeof body.headers === "object" ? body.headers : {};

    if (!endpoint) {
      return NextResponse.json(
        { status: "error", message: "endpoint is required" },
        { status: 400 },
      );
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(endpoint);
    } catch {
      return NextResponse.json(
        { status: "error", message: "endpoint must be a valid URL" },
        { status: 400 },
      );
    }
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return NextResponse.json(
        { status: "error", message: "endpoint must use http or https" },
        { status: 400 },
      );
    }
    if (isBlockedHost(parsedUrl.hostname)) {
      return NextResponse.json(
        {
          status: "error",
          message: "endpoint cannot point to localhost or a link-local address",
        },
        { status: 400 },
      );
    }

    const existing = await SystemSetting.findOne({ key: CONFIG_KEY }).lean();
    const previous = existing?.value || {};

    /* Default term for rows that carry none. A key sent as "" clears the
       default; a key left out keeps the saved one. */
    const schoolYear =
      typeof body.school_year === "string"
        ? body.school_year.trim()
        : previous.school_year || "";
    const semester =
      typeof body.semester === "string"
        ? body.semester.trim()
        : previous.semester || "";
    if (schoolYear) {
      const m = schoolYear.match(/^(\d{4})-(\d{4})$/);
      if (!m || Number(m[2]) !== Number(m[1]) + 1) {
        return NextResponse.json(
          {
            status: "error",
            message: "Default school year must look like 2025-2026.",
          },
          { status: 400 },
        );
      }
    }
    if (!["", "1st", "2nd", "Summer"].includes(semester)) {
      return NextResponse.json(
        {
          status: "error",
          message: "Default semester must be 1st, 2nd or Summer.",
        },
        { status: 400 },
      );
    }

    const mergedHeaders = { ...previous.headers, ...headers };
    for (const [key, value] of Object.entries(headers)) {
      if (
        SENSITIVE_HEADER_KEYS.includes(key.toLowerCase()) &&
        typeof value === "string" &&
        value.includes("••••")
      ) {
        mergedHeaders[key] = previous.headers?.[key] ?? "";
      }
    }

    const value = {
      endpoint,
      headers: mergedHeaders,
      school_year: schoolYear,
      semester,
      last_sync_at: previous.last_sync_at || null,
      last_sync_status: previous.last_sync_status || null,
      last_sync_message: previous.last_sync_message || "",
      updated_by: auth.user._id,
      updated_by_username: auth.user.username,
      updated_at: new Date(),
    };

    await SystemSetting.findOneAndUpdate(
      { key: CONFIG_KEY },
      { key: CONFIG_KEY, value },
      { upsert: true, new: true },
    );

    /* The integration config carries the endpoint and auth headers used to pull
       staff records from HRMIS. Whoever can change it can redirect the import
       at a server of their choosing, so this is logged at critical — and the
       credentials themselves are recorded only as *which header names were
       set*, never their values. */
    await logActivity({
      req,
      actor: {
        user_id: auth.user._id,
        username: auth.user.username,
        role: auth.user.role,
        auth_method: "session",
      },
      action: "INTEGRATION_CONFIG_UPDATE",
      description: `Updated HRMIS integration configuration (endpoint: ${value.endpoint})`,
      severity: "critical",
      resource_type: "integration_config",
      module: "integration",
      metadata: {
        endpoint: value.endpoint,
        /* Header names only. Values are secrets and must not enter the log,
           which every Admin can read. */
        header_keys: Object.keys(value.headers || {}),
        school_year: value.school_year || null,
        semester: value.semester || null,
      },
    });

    return NextResponse.json({
      status: "success",
      data: {
        endpoint: value.endpoint,
        headers: maskHeaders(value.headers),
        school_year: value.school_year,
        semester: value.semester,
        last_sync_at: value.last_sync_at,
        last_sync_status: value.last_sync_status,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 },
    );
  }
}
