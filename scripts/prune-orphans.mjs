import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";

/*
 * Finds rows left behind by deleted profiles:
 *   - profileterms   whose profile_id matches no gemsprofiles row
 *   - identityvaults whose vaultRef is referenced by no gemsprofiles row
 *                    (encrypted PII of people who no longer exist)
 *
 * Two delete routes used to remove profiles without these rows (fixed in
 * data/lib/profileDelete.js); this clears what they left.
 *
 * Dry run by default: counts only, nothing is written.
 *   node scripts/prune-orphans.mjs
 * Delete, after writing every row to scripts/backups/ first:
 *   node scripts/prune-orphans.mjs --apply
 *
 * Vault rows younger than one hour are never touched: a profile save writes
 * its vault row a moment before the profile itself.
 */

const APPLY = process.argv.includes("--apply");
const VAULT_MIN_AGE_MS = 60 * 60 * 1000;

const conn = await mongoose.createConnection(process.env.MONGODB_URI).asPromise();
const db = conn.db;
console.log(`[prune] database: ${db.databaseName}  mode: ${APPLY ? "APPLY" : "dry run"}`);

const profiles = db.collection("gemsprofiles");
const terms = db.collection("profileterms");
const vaults = db.collection("identityvaults");

const liveProfileIds = new Set(
  (await profiles.find({}, { projection: { _id: 1 } }).toArray()).map((p) => String(p._id)),
);
const liveVaultRefs = new Set(
  (await profiles.find({ vaultRef: { $ne: null } }, { projection: { vaultRef: 1 } }).toArray())
    .map((p) => String(p.vaultRef)),
);

const allTerms = await terms
  .find({}, { projection: { _id: 1, profile_id: 1, school_year: 1, semester: 1 } })
  .toArray();
const orphanTerms = allTerms.filter((t) => !liveProfileIds.has(String(t.profile_id)));

const cutoff = new Date(Date.now() - VAULT_MIN_AGE_MS);
const allVaults = await vaults
  .find({}, { projection: { _id: 1, vaultRef: 1, createdAt: 1 } })
  .toArray();
const orphanVaults = allVaults.filter(
  (v) => !liveVaultRefs.has(String(v.vaultRef)) && (!v.createdAt || v.createdAt < cutoff),
);

const byTerm = {};
for (const t of orphanTerms) {
  const k = `${t.school_year} ${t.semester}`;
  byTerm[k] = (byTerm[k] || 0) + 1;
}
console.log(`[prune] profiles: ${liveProfileIds.size}`);
console.log(`[prune] term rows: ${allTerms.length}, orphaned: ${orphanTerms.length}`, byTerm);
console.log(`[prune] vault rows: ${allVaults.length}, orphaned: ${orphanVaults.length}`);

if (!APPLY) {
  console.log("[prune] dry run - nothing deleted. Re-run with --apply to delete.");
  await conn.close();
  process.exit(0);
}

if (!orphanTerms.length && !orphanVaults.length) {
  console.log("[prune] nothing to delete.");
  await conn.close();
  process.exit(0);
}

/* Full rows, not just ids, so a mistaken delete can be put back. Vault rows
   are stored still encrypted. */
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const dir = path.join("scripts", "backups");
fs.mkdirSync(dir, { recursive: true });
const file = path.join(dir, `orphans-${db.databaseName}-${stamp}.json`);
const backup = {
  database: db.databaseName,
  taken_at: new Date().toISOString(),
  profileterms: await terms.find({ _id: { $in: orphanTerms.map((t) => t._id) } }).toArray(),
  identityvaults: await vaults.find({ _id: { $in: orphanVaults.map((v) => v._id) } }).toArray(),
};
fs.writeFileSync(file, JSON.stringify(backup));
if (
  backup.profileterms.length !== orphanTerms.length ||
  backup.identityvaults.length !== orphanVaults.length
) {
  console.error("[prune] backup row count mismatch - aborting, nothing deleted.");
  await conn.close();
  process.exit(1);
}
console.log(`[prune] backup written: ${file}`);

const tRes = await terms.deleteMany({ _id: { $in: orphanTerms.map((t) => t._id) } });
const vRes = await vaults.deleteMany({ _id: { $in: orphanVaults.map((v) => v._id) } });
console.log(`[prune] deleted term rows: ${tRes.deletedCount}, vault rows: ${vRes.deletedCount}`);
await conn.close();
