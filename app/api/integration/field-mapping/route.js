import { NextResponse } from "next/server";
import { connectDB } from "@/data/lib/db";
import SystemSetting from "@/models/systemSetting";
import { requireIntegrationAccess } from "@/app/api/integration/_utils/auth";
import { logActivity } from "@/data/lib/activityLog";
import {
  FIELD_MAPPING_KEY,
  loadFieldMapping,
  parseFieldMapping,
} from "@/app/api/integration/_utils/fieldMapping";

function toList(columns) {
  return Object.entries(columns).map(([column, field]) => ({ column, field }));
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
    const columns = await loadFieldMapping();
    return NextResponse.json({
      status: "success",
      data: { mappings: toList(columns) },
    });
  } catch (error) {
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 },
    );
  }
}

/**
 * Replaces the saved column mapping. Body: { mappings: [{ column, field }] }.
 * Applies to batches staged after the save; staged rows keep how they were
 * read.
 */
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
    const parsed = parseFieldMapping(body.mappings);
    if (parsed.error) {
      return NextResponse.json(
        { status: "error", message: parsed.error },
        { status: 400 },
      );
    }

    const before = await loadFieldMapping();
    await SystemSetting.findOneAndUpdate(
      { key: FIELD_MAPPING_KEY },
      {
        key: FIELD_MAPPING_KEY,
        value: {
          columns: parsed.columns,
          updated_by: auth.user._id,
          updated_by_username: auth.user.username,
          updated_at: new Date(),
        },
      },
      { upsert: true, new: true },
    );

    /* The mapping decides which column becomes a person's ID or name on
       import, so a change is recorded with the full before and after.
       Column and field names only; no row data. */
    await logActivity({
      req,
      actor: {
        user_id: auth.user._id,
        username: auth.user.username,
        role: auth.user.role,
        auth_method: "session",
      },
      action: "INTEGRATION_FIELD_MAPPING_UPDATE",
      description: `Updated the import field mapping (${Object.keys(parsed.columns).length} column(s))`,
      severity: "warning",
      resource_type: "integration_config",
      module: "integration",
      metadata: { before, after: parsed.columns },
    });

    return NextResponse.json({
      status: "success",
      data: { mappings: toList(parsed.columns) },
    });
  } catch (error) {
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 },
    );
  }
}
