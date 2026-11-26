import { NextResponse } from "next/server";
import { connectDB } from "@/data/lib/db";
import ImportBatch from "@/models/importBatch";
import { requireAdmin } from "@/app/api/integration/_utils/auth";
import { logActivity } from "@/data/lib/activityLog";
import { applyUndo, planUndo } from "@/app/api/integration/_utils/importUndo";
import { emitToRoles, disconnectUser, PROFILE_WATCHER_ROLES } from "@/data/lib/realtime";
import { invalidateUserCache } from "@/data/lib/auth";
import { cacheDelPrefix } from "@/data/lib/cache";

/* Only a finished import can be undone. */
const UNDOABLE_STATUSES = ["completed", "failed"];
/* An undo lock older than this belongs to a run that stopped. */
const STALE_LOCK_MS = 10 * 60 * 1000;

async function load(req, params) {
  await connectDB();
  /* Undo deletes people and accounts; like deleting profiles elsewhere, it
     is for Admins only (ICTU Directors can import but not undo). */
  const auth = await requireAdmin(req);
  if (auth.error) {
    return {
      response: NextResponse.json(
        { status: "error", message: auth.error },
        { status: auth.status, headers: auth.headers },
      ),
    };
  }
  const { id } = await params;
  const batch = await ImportBatch.findById(id).lean();
  if (!batch) {
    return {
      response: NextResponse.json(
        { status: "error", message: "Batch not found" },
        { status: 404 },
      ),
    };
  }
  if (!UNDOABLE_STATUSES.includes(batch.status)) {
    return {
      response: NextResponse.json(
        {
          status: "error",
          message: `Batch is ${batch.status}; only an imported batch can be undone.`,
        },
        { status: 409 },
      ),
    };
  }
  return { auth, batch };
}

const summarize = (plan) => ({
  remove: plan.remove.length,
  keep: plan.keep.length,
  updated: plan.updated.length,
  terms: plan.terms.length,
  keep_rows: plan.keep.map((r) => ({ row_number: r.row_number, reason: r.reason })),
  updated_rows: plan.updated.map((r) => r.row_number),
});

/** What undo would remove and keep, without changing anything. */
export async function GET(req, { params }) {
  try {
    const { batch, response } = await load(req, params);
    if (!batch) return response;
    const plan = await planUndo(batch._id);
    return NextResponse.json({ status: "success", data: summarize(plan) });
  } catch (error) {
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 },
    );
  }
}

/** Undoes the import. Body: { confirm: true }. */
export async function POST(req, { params }) {
  let lockedId = null;
  try {
    const { auth, batch, response } = await load(req, params);
    if (!batch) return response;
    const body = await req.json().catch(() => ({}));
    if (body.confirm !== true) {
      return NextResponse.json(
        { status: "error", message: "Confirm the undo to continue." },
        { status: 400 },
      );
    }

    const now = new Date();
    const locked = await ImportBatch.findOneAndUpdate(
      {
        _id: batch._id,
        status: { $in: UNDOABLE_STATUSES },
        $or: [
          { "undo.running": { $ne: true } },
          { "undo.started_at": { $lt: new Date(now.getTime() - STALE_LOCK_MS) } },
        ],
      },
      { $set: { "undo.running": true, "undo.started_at": now } },
      { new: true },
    );
    if (!locked) {
      return NextResponse.json(
        { status: "error", message: "An undo of this batch is already running." },
        { status: 409 },
      );
    }
    lockedId = locked._id;

    const out = await applyUndo(batch._id);

    await ImportBatch.updateOne(
      { _id: batch._id },
      {
        $set: {
          "undo.running": false,
          "undo.at": new Date(),
          "undo.by": auth.user._id,
          "undo.by_username": auth.user.username,
          "undo.removed": (batch.undo?.removed || 0) + out.removed_profiles.length,
          "undo.kept": out.kept.length,
          "undo.terms_removed":
            (batch.undo?.terms_removed || 0) + out.removed_terms.length,
        },
      },
    );
    lockedId = null;

    out.removed_accounts.forEach((id) => {
      invalidateUserCache(id);
      disconnectUser(id);
    });
    cacheDelPrefix("profile:list:");
    out.removed_profiles.forEach((p) =>
      emitToRoles(PROFILE_WATCHER_ROLES, "profile:deleted", { id: p.profile_id }),
    );

    /* People and accounts are deleted here, and the batch's own records
       only say "undone". This entry is what shows later who was removed
       (by ID, no names) and why others were kept. */
    await logActivity({
      req,
      actor: {
        user_id: auth.user._id,
        username: auth.user.username,
        role: auth.user.role,
        auth_method: "session",
      },
      action: "IMPORT_BATCH_UNDO",
      description: `Undid import batch ${batch.source_name || batch._id}: ${out.removed_profiles.length} person(s) removed, ${out.kept.length} kept, ${out.removed_terms.length} term(s) removed`,
      severity: "critical",
      resource_type: "import_batch",
      resource_id: batch._id,
      module: "integration",
      metadata: {
        source_name: batch.source_name || null,
        removed_profiles: out.removed_profiles,
        removed_accounts: out.removed_accounts,
        removed_terms: out.removed_terms,
        vault_rows_deleted: out.vault_rows,
        kept: out.kept,
        updated_rows_not_reverted: out.updated_rows,
      },
    });

    return NextResponse.json({
      status: "success",
      data: {
        removed: out.removed_profiles.length,
        kept: out.kept.length,
        terms_removed: out.removed_terms.length,
        updated_not_reverted: out.updated_rows,
      },
    });
  } catch (error) {
    if (lockedId) {
      await ImportBatch.updateOne(
        { _id: lockedId },
        { $set: { "undo.running": false } },
      ).catch(() => {});
    }
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 },
    );
  }
}
