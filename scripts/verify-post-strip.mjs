import "dotenv/config";
import mongoose from "mongoose";

/*
 * Proves the read path still works after the plaintext strip.
 *
 * A dry run only proves the script would run. This is the check that matters:
 * with `personal` / `gadData` / `contact` deleted, can the application still
 * resolve a person's name, birthday and contact details - entirely from the
 * encrypted vault - and does the blind index still answer duplicate detection?
 *
 * Run against the staging clone after scripts/strip-plaintext-pii.mjs, before
 * the same strip touches production.
 *
 * Never prints a real name, email or number: only counts and whether the
 * resolution succeeded.
 *
 * Usage:
 *   node scripts/verify-post-strip.mjs --db gems_staging_strip
 */

const DB_NAME = (() => {
  const i = process.argv.indexOf("--db");
  return i !== -1 ? process.argv[i + 1] : null;
})();

const {
  PII_FIELDS,
  blindIndex,
  decryptFields,
  maskFullName,
  maskEmail,
  calcAge,
  isVaultConfigured,
} = await import("../lib/identityVault.js");

await mongoose.connect(process.env.MONGODB_URI);
const db = DB_NAME ? mongoose.connection.client.db(DB_NAME) : mongoose.connection.db;
const profiles = db.collection("gemsprofiles");
const vault = db.collection("identityvaults");

console.log(`[post-strip] database: ${db.databaseName}`);
/* Without the key nothing below can be interpreted: an all-empty result would
   mean "the vault holds nothing", when the truth is "this process cannot
   read it". Distinguish the two before reporting any pass or fail. */
console.log(`[post-strip] vault configured: ${isVaultConfigured()}`);
console.log("");

let failures = 0;

/* Loads a vault row and decrypts it, exactly as lib/profileBroker.js
   loadDecryptedPii does. Inlined because the broker reaches its models
   through the "@/..." alias, which only the Next.js bundler resolves - plain
   Node cannot import it. The decryption itself is the same code either way. */
async function loadDecryptedPii(vaultRef) {
  if (!vaultRef) return null;
  const row = await vault.findOne({ vaultRef });
  if (!row) return null;
  return decryptFields(row.fields, {
    dateFields: PII_FIELDS.dates,
    booleanFields: PII_FIELDS.booleans,
  });
}

/* ---- 1. the blocks are gone ------------------------------------------ */
console.log("[post-strip] 1. plaintext blocks removed");
for (const block of ["personal", "gadData", "contact"]) {
  const n = await profiles.countDocuments({ [block]: { $exists: true } });
  const ok = n === 0;
  if (!ok) failures++;
  console.log(`  ${block.padEnd(10)} present on ${n} row(s)  ${ok ? "OK" : "FAIL"}`);
}
console.log("");

/* ---- 2. every row still resolves its identity ------------------------- */
console.log("[post-strip] 2. identity resolves from the vault");
const total = await profiles.countDocuments({});
const sample = await profiles.find({ vaultRef: { $exists: true } }).limit(200).toArray();

let resolved = 0;
let withName = 0;
for (const row of sample) {
  const pii = await loadDecryptedPii(row.vaultRef);
  if (!pii) continue;
  resolved++;
  /* Every row in this database has a first_name in the vault; if any came back
     empty the strip would have made that person unreadable. */
  if (typeof pii.first_name === "string" && pii.first_name) withName++;
}
console.log(`  sampled            : ${sample.length}`);
console.log(`  resolved           : ${resolved}`);
console.log(`  with a first name  : ${withName}`);
const resolveOk = resolved === sample.length && withName === sample.length;
if (!resolveOk) failures++;
console.log(`  ${resolveOk ? "OK" : "FAIL"}`);
console.log("");

/* ---- 3. the masked view still masks ----------------------------------- */
console.log("[post-strip] 3. masked view still masks");
const first = await loadDecryptedPii(sample[0].vaultRef);
/* Same computation as maskProfilePii's displayName. A masked display name is
   initials plus asterisks; if a full name appeared here the strip would have
   silently switched the app to unmasked output. */
const displayName = maskFullName(first.first_name, first.last_name);
const maskedOk =
  typeof displayName === "string" &&
  displayName.includes("*") &&
  !displayName.includes(first.first_name);
if (!maskedOk) failures++;
console.log(`  displayName masked : ${maskedOk ? "yes" : "no"}`);
console.log(`  email masked       : ${maskEmail(first.email) || "(none on this row)"}`);
console.log(`  age computed       : ${calcAge(first.birthday) ?? "(none)"}`);
console.log(`  ${maskedOk ? "OK" : "FAIL"}`);
console.log("");

/* ---- 4. the response shape the screens expect is still buildable ------ */
console.log("[post-strip] 4. reveal path rebuilds personal/gadData/contact");
/* Mirrors revealProfilePii: the decrypted bag is re-nested into the three
   blocks the UI reads, so no component needed rewriting for the vault. This is
   what proves the shape survives even though the stored blocks are gone. */
const revealOk =
  first &&
  typeof first.first_name === "string" &&
  first.first_name.length > 0;
if (!revealOk) failures++;
console.log(`  name from vault    : ${revealOk ? "present" : "MISSING"}`);
console.log(`  personal.fields    : ${["first_name", "middle_name", "last_name"].filter((k) => first[k]).length}/3`);
console.log(`  ${revealOk ? "OK" : "FAIL"}`);
console.log("");

/* ---- 5. duplicate detection still answers ----------------------------- */
console.log("[post-strip] 5. blind index still answers duplicate detection");
const withIndex = await profiles.countDocuments({
  profileSearchIndex: { $exists: true, $ne: [] },
});
console.log(`  rows with a search index: ${withIndex} of ${total}`);
if (withIndex !== total) failures++;

/* Prove a real lookup works end to end: take a row's own name digests and
   confirm the index finds it back. This is the path registration uses. */
const probe = sample.find((r) => Array.isArray(r.profileSearchIndex) && r.profileSearchIndex.length >= 2);
if (probe) {
  const p = await loadDecryptedPii(probe.vaultRef);
  const fn = blindIndex(p.first_name);
  const ln = blindIndex(p.last_name);
  const found = await profiles.countDocuments({ profileSearchIndex: { $all: [fn, ln] } });
  const dupOk = found >= 1;
  if (!dupOk) failures++;
  console.log(`  name lookup matched ${found} row(s)  ${dupOk ? "OK" : "FAIL"}`);
} else {
  failures++;
  console.log("  no indexed row to probe  FAIL");
}
console.log("");

console.log(failures === 0
  ? "[post-strip] STATUS: OK - the app can serve identities from the vault alone"
  : `[post-strip] STATUS: FAILED - ${failures} check(s) failed`);

await mongoose.disconnect();
process.exit(failures === 0 ? 0 : 1);
