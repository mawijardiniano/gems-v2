import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import SystemSetting from "@/models/systemSetting";
import { requireIntegrationAccess } from "@/app/api/integration/_utils/auth";

const CONFIG_KEY = "hrmis_integration";
const SENSITIVE_HEADER_KEYS = [
  "authorization",
  "x-api-key",
  "api-key",
  "apikey",
  "token",
  "cookie",
];

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
    const endpoint = typeof body.endpoint === "string" ? body.endpoint.trim() : "";
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

    const existing = await SystemSetting.findOne({ key: CONFIG_KEY }).lean();
    const previous = existing?.value || {};

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
      school_year: body.school_year || previous.school_year || "",
      semester: body.semester || previous.semester || "",
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

    return NextResponse.json({
      status: "success",
      data: {
        endpoint: value.endpoint,
        headers: maskHeaders(value.headers),
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