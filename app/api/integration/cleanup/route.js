import { NextResponse } from "next/server";
import { connectDB } from "@/data/lib/db";
import SystemSetting from "@/models/systemSetting";
import { requireIntegrationAccess } from "@/app/api/integration/_utils/auth";
import { logActivity } from "@/data/lib/activityLog";
import {
  CLEANUP_KEY,
  findStaleBatches,
  loadCleanupSettings,
  parseCleanupDays,
  removeStaleBatches,
} from "@/app/api/integration/_utils/batchCleanup";

async function authorize(req) {
  await connectDB();
  const auth = await requireIntegrationAccess(req);
  if (auth.error) {
    return {
      response: NextResponse.json(
        { status: "error", message: auth.error },
        { status: auth.status, headers: auth.headers },
      ),
    };
  }
  return { auth };
}

const actorOf = (auth) => ({
  user_id: auth.user._id,
  username: auth.user.username,
  role: auth.user.role,
  auth_method: "session",
});

/** The cleanup setting and the batches it would remove now. */
export async function GET(req) {
  try {
    const { auth, response } = await authorize(req);
    if (!auth) return response;
    const settings = await loadCleanupSettings();
    const preview = await findStaleBatches({ afterDays: settings.after_days });
    return NextResponse.json({
      status: "success",
      data: {
        after_days: settings.after_days,
        last_run_on: settings.last_run_on,
        updated_by_username: settings.updated_by_username,
        preview,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 },
    );
  }
}

/** Saves the number of days (0 turns cleanup off). Body: { after_days }. */
export async function PUT(req) {
  try {
    const { auth, response } = await authorize(req);
    if (!auth) return response;
    const body = await req.json().catch(() => ({}));
    const parsed = parseCleanupDays(body.after_days);
    if (parsed.error) {
      return NextResponse.json(
        { status: "error", message: parsed.error },
        { status: 400 },
      );
    }
    const before = await loadCleanupSettings();
    await SystemSetting.findOneAndUpdate(
      { key: CLEANUP_KEY },
      {
        $set: {
          "value.after_days": parsed.days,
          /* The daily run acts in the name of whoever last saved this. */
          "value.updated_by": auth.user._id,
          "value.updated_by_username": auth.user.username,
          "value.updated_at": new Date(),
        },
        $setOnInsert: { key: CLEANUP_KEY },
      },
      { upsert: true },
    );

    /* This setting decides when batches are deleted without anyone pressing
       Delete, so who changed it, and from what, is kept. */
    await logActivity({
      req,
      actor: actorOf(auth),
      action: "INTEGRATION_CLEANUP_UPDATE",
      description:
        parsed.days > 0
          ? `Set import batch cleanup to ${parsed.days} day(s)`
          : "Turned import batch cleanup off",
      severity: "warning",
      resource_type: "integration_config",
      module: "integration",
      metadata: { before_days: before.after_days, after_days: parsed.days },
    });

    const preview = await findStaleBatches({ afterDays: parsed.days });
    return NextResponse.json({
      status: "success",
      data: { after_days: parsed.days, preview },
    });
  } catch (error) {
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 },
    );
  }
}

/** Removes the batches the saved setting covers now, without waiting for the daily run. */
export async function POST(req) {
  try {
    const { auth, response } = await authorize(req);
    if (!auth) return response;
    const settings = await loadCleanupSettings();
    if (!settings.after_days) {
      return NextResponse.json(
        {
          status: "error",
          message: "Cleanup is off. Set the number of days and save first.",
        },
        { status: 400 },
      );
    }
    const result = await removeStaleBatches({
      afterDays: settings.after_days,
      actor: actorOf(auth),
      trigger: "manual",
    });
    /* Batches deleted without anyone pressing Delete on each: the entry
       names every one (their own sync logs are gone with them). */
    if (result.audit) await logActivity({ ...result.audit, req });
    return NextResponse.json({
      status: "success",
      data: {
        removed: result.removed.length,
        deleted_records: result.deleted_records,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 },
    );
  }
}
