import "dotenv/config";
import mongoose from "mongoose";
import fs from "node:fs";

/*
 * Loads a pre-strip backup into a scratch database so a census can be re-run
 * against the plaintext after production has already been stripped.
 *
 * Why this exists: the strip is irreversible, so once it runs there is no live
 * copy left to audit. If a field turns out to have been missing from the
 * census (a real risk here - the vault owns more fields than the first pass
 * listed), the backup is the only remaining evidence of what was deleted. This
 * turns that evidence back into queryable data instead of a 2 MB JSON file
 * that has to be reasoned about by eye.
 *
 * Writes only into the named scratch database, never into production.
 *
 * Usage:
 *   node scripts/restore-backup-for-audit.mjs <backup.json> <scratch-db-name>
 */

const [backupFile, target] = process.argv.slice(2);
if (!backupFile || !target) {
  console.error("[restore] usage: node scripts/restore-backup-for-audit.mjs <backup.json> <db-name>");
  process.exit(1);
}
if (!fs.existsSync(backupFile)) {
  console.error(`[restore] backup not found: ${backupFile}`);
  process.exit(1);
}
/* The scratch database must not be the live one: this inserts documents, and
   inserting the pre-strip copies into production would restore the PII. */
if (/^gems$/i.test(target) || /prod/i.test(target)) {
  console.error(`[restore] refusing target "${target}" - looks like production`);
  process.exit(1);
}

/* Optional `--drop`: clear a target left half-written by an interrupted run.
   Guarded to non-production names in the same way as the target itself. */
const DROP = process.argv.includes("--drop");

const raw = JSON.parse(fs.readFileSync(backupFile, "utf8"));
const docs = Array.isArray(raw) ? raw : raw.documents || [];
if (!docs.length) {
  console.error("[restore] backup holds no documents");
  process.exit(1);
}

await mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection.client.db(target);
const profiles = db.collection("gemsprofiles");

if (DROP) {
  /* `dropDatabase` is what clears a half-written target; dropping only the
     collection would leave a stray vault behind and skew the next census. */
  const before = await db.listCollections().toArray();
  await db.dropDatabase();
  console.log(`[restore] dropped : ${target} (${before.length} collection(s))`);
}

console.log(`[restore] target : ${target}`);
console.log(`[restore] docs   : ${docs.length}`);

/* A fresh database only: merging into one that already holds rows would blend
   pre-strip and post-strip copies and make the census meaningless. */
const existingBlocks = await profiles.countDocuments({ personal: { $exists: true } });
if (existingBlocks > 0) {
  console.error(`[restore] ABORT: target already holds ${existingBlocks} row(s) with a personal block.`);
  console.error("         Drop it first so the census reads a clean copy.");
  await mongoose.disconnect();
  process.exit(1);
}

/* Batched replace, not one call per document: 10k sequential round trips take
   minutes and can time out. `bulkWrite` sends them in groups of 500. */
let written = 0;
const BATCH = 500;
for (let i = 0; i < docs.length; i += BATCH) {
  const slice = docs.slice(i, i + BATCH);
  await profiles.bulkWrite(
    slice.map((doc) => ({
      replaceOne: { filter: { _id: doc._id }, replacement: doc, upsert: true },
    })),
    { ordered: false },
  );
  written += slice.length;
}

const total = await profiles.countDocuments({});
console.log(`[restore] loaded : ${total} row(s) (${written} written)`);

/* The vault must come along too, or every counterpart count reads zero and the
   census would call every field an orphan. */
const vaults = await db.collection("identityvaults").countDocuments({});
if (vaults === 0) {
  console.error("");
  console.error("[restore] WARNING: target has no identityvaults rows.");
  console.error("          The census compares plaintext against the vault, so it");
  console.error("          needs the vault copied in too, or every field is an orphan.");
  console.error("          Use scripts/clone-for-staging.mjs for the vault, or restore");
  console.error("          scripts/backups/identityvaults-backup-*.json the same way.");
}

await mongoose.disconnect();
