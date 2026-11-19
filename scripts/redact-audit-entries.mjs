import "dotenv/config";
import { registerHooks } from "node:module";
import { pathToFileURL, fileURLToPath } from "node:url";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

/*
 * Redacts specific audit-log entries exactly as the Activity Log's Redact
 * action does (DELETE /api/activity): blank the content with
 * redactActivityLog, then write an AUDIT_REDACT entry naming the row so the
 * chain verifier accepts the blanked row as an audited redaction.
 *
 * Each entry is backed up whole to scripts/backups/ (gitignored) first.
 *
 *   node scripts/redact-audit-entries.mjs --reason "<why>" <id> [<id> ...]
 *   add --apply to write; without it, only shows what would be redacted.
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

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const reasonAt = args.indexOf("--reason");
const reason = reasonAt >= 0 ? args[reasonAt + 1] : "";
const ids = args.filter((a, i) => /^[0-9a-f]{24}$/i.test(a) && i !== reasonAt + 1);
if (!ids.length || !reason) {
  console.error('usage: node scripts/redact-audit-entries.mjs --reason "<why>" <id> [...] [--apply]');
  process.exit(1);
}

const { connectDB } = await import("@/data/lib/db");
const { redactActivityLog, logActivity } = await import("@/data/lib/activityLog");
const m = await connectDB();
const db = m.connection.db;
const logs = db.collection("activitylogs");
const mongoose = m;
console.log(`[redact] database: ${db.databaseName}  mode: ${APPLY ? "APPLY" : "dry run"}`);

const targets = await logs.find({ _id: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) } }).toArray();
const missing = ids.filter((id) => !targets.some((t) => String(t._id) === id));
if (missing.length) {
  console.error(`[redact] not found: ${missing.join(", ")} - nothing done.`);
  process.exit(1);
}
const already = targets.filter((t) => t.redacted);
if (already.length) {
  console.error(`[redact] already redacted: ${already.map((t) => t._id).join(", ")} - nothing done.`);
  process.exit(1);
}
for (const t of targets) console.log(`   ${t._id}  ${t.action}  ${t.createdAt?.toISOString?.() || ""}`);

if (!APPLY) {
  console.log("[redact] dry run - nothing changed. Add --apply to redact.");
  await m.disconnect();
  process.exit(0);
}

const dir = path.join(ROOT, "scripts", "backups");
mkdirSync(dir, { recursive: true });
const file = path.join(dir, `audit-redact-${db.databaseName}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
writeFileSync(file, JSON.stringify(targets, null, 1));
console.log(`[redact] backup written: ${path.relative(ROOT, file)}`);

for (const t of targets) {
  const id = String(t._id);
  const res = await redactActivityLog({ id, reason });
  if (!res.modifiedCount) throw new Error(`redaction did not apply to ${id}`);
  await logActivity({
    actor: { user_id: null, username: "script:redact-audit-entries", role: "system", auth_method: "script" },
    action: "AUDIT_REDACT",
    description: `Redacted activity log entry ${id}: ${reason}`,
    severity: "critical",
    resource_type: "activity_log",
    resource_id: id,
    module: "audit",
    metadata: { target_action: t.action, target_resource_type: t.resource_type || null, reason },
  });
  console.log(`[redact] redacted ${id} (${t.action})`);
}
await m.disconnect();
