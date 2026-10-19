import "dotenv/config";
import mongoose from "mongoose";

/*
 * Reads one profile exactly as it is STORED, bypassing Mongoose.
 *
 * Written to settle a specific question: a live HTTP response from Postman
 * carried `personal` / `gadData` / `contact` and `migrationStatus: "dual"`,
 * which the post-strip state says should be impossible. Mongoose applies
 * schema defaults on hydration and would answer "what does the model expect"
 * rather than "what is on disk", so this uses the native driver - the same
 * technique as scripts/verify-post-strip.mjs.
 *
 * It reports field PRESENCE and the lifecycle fields, never a name, email or
 * number, so it is safe to run against production and safe to paste into a
 * ticket.
 *
 * Also counts `migrationStatus` across the whole collection, because
 * scripts/verify-no-pii.mjs checks whether the blocks hold VALUES but does not
 * check this field at all - a row could keep a stale "dual" and still pass.
 *
 * Read-only: connects, reads, disconnects.
 *
 * Usage:
 *   node scripts/lookup-profile.mjs GEMS-6FF337
 *   node scripts/lookup-profile.mjs 69ba03e2d491104724110e0f
 *   node scripts/lookup-profile.mjs LingonReynaldo --db gems_staging_strip
 */

const args = process.argv.slice(2);
const dbIndex = args.indexOf("--db");
const DB_NAME = dbIndex === -1 ? null : args[dbIndex + 1];
/* Only strip the flag's own indices when the flag is actually present.
   With no --db, `dbIndex` is -1 and `dbIndex + 1` is 0, which would silently
   discard the term at index 0 and make the script report its own usage. */
const terms =
  dbIndex === -1
    ? args
    : args.filter((_, i) => i !== dbIndex && i !== dbIndex + 1);

if (!terms.length) {
  console.error("[lookup] usage: node scripts/lookup-profile.mjs <gemsPublicId|_id|username> [--db name]");
  process.exit(1);
}
const term = terms[0];

/* Broad sweep first: a single-row answer is only interpretable against the
   collection-wide picture. */
await mongoose.connect(process.env.MONGODB_URI);
const db = DB_NAME ? mongoose.connection.client.db(DB_NAME) : mongoose.connection.db;
const profiles = db.collection("gemsprofiles");
const vault = db.collection("identityvaults");
const users = db.collection("userauths");

console.log(`[lookup] database: ${db.databaseName}`);
console.log(`[lookup] term    : ${term}`);
console.log("");

const LEGACY = ["personal", "gadData", "contact"];

console.log("[lookup] collection-wide markers");
console.log(`  gemsprofiles total       : ${await profiles.countDocuments({})}`);
for (const block of LEGACY) {
  const keyed = await profiles.countDocuments({ [block]: { $exists: true } });
  const filled = await profiles.countDocuments({ [block]: { $exists: true, $ne: {} } });
  console.log(`  ${block.padEnd(9)} key exists : ${keyed}   (non-empty: ${filled})`);
}
console.log(`  vaultRef exists          : ${await profiles.countDocuments({ vaultRef: { $exists: true } })}`);
console.log(`  vault rows               : ${await vault.countDocuments({})}`);

console.log("");
console.log("[lookup] migrationStatus distribution");
const byStatus = await profiles
  .aggregate([{ $group: { _id: "$migrationStatus", n: { $sum: 1 } } }, { $sort: { n: -1 } }])
  .toArray();
for (const row of byStatus) {
  console.log(`  ${String(row._id).padEnd(12)} : ${row.n}`);
}


/* --- the single record the response was about ------------------------------ */
console.log("");
async function findProfile() {
  if (/^[0-9a-fA-F]{24}$/.test(term)) {
    const doc = await profiles.findOne({ _id: new mongoose.Types.ObjectId(term) });
    if (doc) return { doc, via: "_id" };
  }
  const byPublic = await profiles.findOne({ gemsPublicId: term });
  if (byPublic) return { doc: byPublic, via: "gemsPublicId" };

  const user = await users.findOne({ username: term });
  if (user?.personal_info_id) {
    const doc = await profiles.findOne({ _id: user.personal_info_id });
    if (doc) return { doc, via: `username "${user.username}"` };
  }
  return null;
}

const found = await findProfile();
if (!found) {
  console.log("[lookup] NOT FOUND (checked _id, gemsPublicId, username)");
  await mongoose.disconnect();
  process.exit(0);
}

const { doc, via } = found;
console.log(`[lookup] matched via ${via}`);
console.log("");
console.log("[lookup] stored keys (raw, no schema defaults)");
for (const key of Object.keys(doc).filter((k) => !k.startsWith("_"))) {
  const bytes = JSON.stringify(doc[key] ?? null)?.length ?? 0;
  console.log(`  ${key.padEnd(22)} ${bytes} bytes`);
}

console.log("");
console.log("[lookup] the three stripped blocks");
let dirty = 0;
for (const block of LEGACY) {
  const present = Object.prototype.hasOwnProperty.call(doc, block);
  if (present) dirty++;
  console.log(`  ${block.padEnd(11)} ${present ? "PRESENT  <-- should be absent" : "absent   OK"}`);
}

console.log("");
console.log("[lookup] lifecycle");
console.log(`  gemsPublicId            : ${doc.gemsPublicId || "(missing)"}`);
console.log(`  vaultRef                : ${doc.vaultRef ? "present" : "(MISSING)"}`);
console.log(`  migrationStatus         : ${doc.migrationStatus || "(unset)"}`);
console.log(`  affiliation.person_type : ${doc.affiliation?.person_type || "(unset)"}`);
console.log(`  createdAt               : ${doc.createdAt?.toISOString?.() || doc.createdAt}`);
console.log(`  updatedAt               : ${doc.updatedAt?.toISOString?.() || doc.updatedAt}`);

console.log("");
console.log("[lookup] vault row");
if (doc.vaultRef) {
  const row = await vault.findOne({ vaultRef: doc.vaultRef });
  console.log(`  vault row exists        : ${row ? "yes" : "NO"}`);
  if (row) {
    const populated = Object.keys(row.fields || {}).filter(
      (k) => row.fields[k] !== undefined && row.fields[k] !== null,
    );
    console.log(`  encrypted fields        : ${populated.length}`);
    const { isVaultConfigured } = await import("../lib/identityVault.js");
    console.log(`  key configured locally  : ${isVaultConfigured()}`);
  }
} else {
  console.log("  (no vaultRef)");
}

console.log("");
console.log("[lookup] verdict");
if (dirty === 0 && doc.vaultRef) {
  console.log("  CLEAN - this row matches the post-strip state.");
} else if (dirty > 0) {
  console.log(`  DIRTY - ${dirty} stripped block(s) present on disk.`);
  console.log("  Compare updatedAt against the strip time: newer means a writer");
  console.log("  put plaintext back AFTER the strip.");
} else {
  console.log("  UNEXPECTED - no blocks, but vault linkage is missing.");
}

await mongoose.disconnect();
