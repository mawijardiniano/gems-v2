import "dotenv/config";
import { registerHooks } from "node:module";
import { pathToFileURL, fileURLToPath } from "node:url";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

/*
 * Empties raw_payload and mapped_payload of staging rows whose import is
 * finished: batch status "completed" AND row status "migrated". Those people
 * are in the encrypted vault; the plain-text copy here (names, birthdays,
 * HR fields, faculty names) is redundant personal data.
 *
 * Kept on every row: batch, row number, status, identity ids, school year,
 * semester, migration_result (what was created, profile id), review info.
 * Rows of batches that are not completed (ready, failed, ...) are untouched.
 *
 *   node scripts/clear-staging-payloads.mjs            dry run, counts only
 *   node scripts/clear-staging-payloads.mjs --apply    back up, then clear
 *
 * --failed targets batches with status "failed" instead (every row in them):
 * imports that were abandoned and will never be migrated, whose plain-text
 * rows would otherwise be kept forever.
 *   node scripts/clear-staging-payloads.mjs --failed [--apply]
 *
 * --apply writes every affected row in full to scripts/backups/ (gitignored)
 * first. That file holds the plain text: delete it once the result is checked.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..") + "/";
registerHooks({
  resolve(spec, ctx, next) {
    if (spec.startsWith("@/")) {
      let p = ROOT + spec.slice(2);
      if (!existsSync(p) && existsSync(p + ".js")) p += ".js";
      return next(pathToFileURL(p).href, ctx);
    }
    return next(spec, ctx);
  },
});

const APPLY = process.argv.includes("--apply");
const FAILED = process.argv.includes("--failed");
const BATCH_STATUS = FAILED ? "failed" : "completed";
const { connectDB } = await import("@/data/lib/db");
const { logActivity } = await import("@/data/lib/activityLog");
const m = await connectDB();
const db = m.connection.db;
const recs = db.collection("stagingrecords");
console.log(`[clear] database: ${db.databaseName}  mode: ${APPLY ? "APPLY" : "dry run"}  batches: ${BATCH_STATUS}`);

const batches = await db
  .collection("importbatches")
  .find({ status: BATCH_STATUS }, { projection: { source_name: 1, createdAt: 1 } })
  .sort({ createdAt: 1 })
  .toArray();
const filter = {
  batch_id: { $in: batches.map((b) => b._id) },
  ...(FAILED ? {} : { status: "migrated" }),
  payload_cleared_at: { $in: [null, undefined] },
};

let total = 0;
for (const b of batches) {
  const n = await recs.countDocuments({ ...filter, batch_id: b._id });
  const notMigrated = FAILED ? 0 : await recs.countDocuments({ batch_id: b._id, status: { $ne: "migrated" } });
  total += n;
  console.log(
    `   ${b.createdAt?.toISOString().slice(0, 10)}  ${String(b.source_name).padEnd(28)} to clear: ${n}` +
      (notMigrated ? `  (left alone, not migrated: ${notMigrated})` : ""),
  );
}
console.log(`[clear] rows to clear: ${total}`);

if (!APPLY || !total) {
  console.log(APPLY ? "[clear] nothing to clear." : "[clear] dry run - nothing changed. Add --apply to clear.");
  await m.disconnect();
  process.exit(0);
}

const rows = await recs.find(filter).toArray();
if (rows.length !== total) {
  console.error(`[clear] count changed (${total} -> ${rows.length}) - nothing changed.`);
  process.exit(1);
}
const dir = path.join(ROOT, "scripts", "backups");
mkdirSync(dir, { recursive: true });
const file = path.join(
  dir,
  `staging-payloads-${db.databaseName}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
);
writeFileSync(file, JSON.stringify(rows));
console.log(`[clear] backup written: ${path.relative(ROOT, file)} (plain text - delete after checking)`);

const clearedAt = new Date();
const res = await recs.updateMany(
  { _id: { $in: rows.map((r) => r._id) } },
  { $set: { raw_payload: {}, mapped_payload: {}, payload_cleared_at: clearedAt } },
);
console.log(`[clear] cleared: ${res.modifiedCount}`);

await logActivity({
  actor: { user_id: null, username: "script:clear-staging-payloads", role: "system", auth_method: "script" },
  action: "STAGING_PAYLOAD_CLEAR",
  description: `Cleared personal data from ${res.modifiedCount} ${FAILED ? "" : "migrated "}staging row(s) in ${batches.length} ${BATCH_STATUS} batch(es)`,
  severity: "warning",
  resource_type: "import_batch",
  module: "integration",
  metadata: {
    batches: batches.map((b) => String(b._id)),
    rows_cleared: res.modifiedCount,
    batch_status: BATCH_STATUS,
  },
});

const left = await recs.countDocuments({ ...filter });
console.log(`[clear] remaining uncleared rows in ${BATCH_STATUS} batches: ${left}`);
await m.disconnect();
