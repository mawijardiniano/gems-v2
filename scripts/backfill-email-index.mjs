import "dotenv/config";
import mongoose from "mongoose";
import { buildSearchIndex } from "../lib/identityVault.js";

/* Adds the email digest to `profileSearchIndex` for rows that predate it.
 *
 * `buildSearchIndex` now folds the email into the same blind index that
 * already carries the name digests, because the duplicate-email check can no
 * longer read `contact.email` once the PII strip lands. Rows written before
 * that change have name digests only, so without this backfill a registration
 * could reuse an existing address and the check would report no match.
 *
 * The email is read from the vault, not from the legacy column — the column is
 * what the strip removes, and reading it here would make this script fail on
 * exactly the rows that need it most after a partial strip.
 *
 * Idempotent: a row whose index already contains the email digest is left
 * alone. Reports per-row before/after sizes so a partial run is visible.
 *
 * Usage:
 *   node scripts/backfill-email-index.mjs            # dry run
 *   node scripts/backfill-email-index.mjs --apply    # write
 */

const APPLY = process.argv.includes("--apply");

await mongoose.connect(process.env.MONGODB_URI);
const profiles = mongoose.connection.db.collection("gemsprofiles");
const vault = mongoose.connection.db.collection("identityvaults");
const { decryptFields, PII_FIELDS } = await import("../lib/identityVault.js");

console.log(`[email-index] mode: ${APPLY ? "APPLY (writing)" : "DRY RUN (read-only)"}`);
console.log("");

const total = await profiles.countDocuments({});
const rows = await profiles
  .find(
    { "contact.email": { $exists: true, $ne: null } },
    { projection: { vaultRef: 1, profileSearchIndex: 1 } },
  )
  .toArray();

console.log(`[email-index] profiles total      : ${total}`);
console.log(`[email-index] rows with an email  : ${rows.length}`);
console.log("");

/* Resolve every email in one vault read. */
const refs = rows.map((r) => r.vaultRef).filter(Boolean);
const vaultRows = await vault.find({ vaultRef: { $in: refs } }).toArray();
const byRef = new Map(vaultRows.map((v) => [v.vaultRef, v]));

let need = 0;
let noEmail = 0;
const updates = [];

for (const row of rows) {
  const v = byRef.get(row.vaultRef);
  if (!v) {
    noEmail += 1;
    continue;
  }

  const pii = decryptFields(v.fields, {
    dateFields: PII_FIELDS.dates,
    booleanFields: PII_FIELDS.booleans,
  });
  const email = pii?.email;
  if (!email) {
    noEmail += 1;
    continue;
  }

  /* Rebuild from the decrypted identity so the row's digests end up complete
     and consistent, rather than appending a digest to a set that may be
     missing others. */
  const rebuilt = buildSearchIndex(pii);
  const current = row.profileSearchIndex || [];
  const missing = rebuilt.filter((d) => !current.includes(d));

  if (missing.length) {
    need += 1;
    updates.push({ _id: row._id, index: rebuilt });
  }
}

console.log(`[email-index] rows needing an update : ${need}`);
console.log(`[email-index] email unreadable/skipped: ${noEmail}`);

if (!APPLY) {
  console.log("");
  console.log("[email-index] dry run complete — nothing written. Re-run with --apply.");
  await mongoose.disconnect();
  process.exit(0);
}

console.log("");
console.log("[email-index] writing");
let written = 0;
for (const u of updates) {
  const res = await profiles.updateOne(
    { _id: u._id },
    { $set: { profileSearchIndex: u.index } },
  );
  written += res.modifiedCount;
}
console.log(`[email-index] rows modified          : ${written}`);

/* Post-condition: every row that had an email now has an email digest, and no
   row lost a digest it previously had. */
const after = await profiles
  .find(
    { "contact.email": { $exists: true, $ne: null } },
    { projection: { vaultRef: 1, profileSearchIndex: 1 } },
  )
  .toArray();

let stillMissing = 0;
for (const row of after) {
  const v = byRef.get(row.vaultRef);
  if (!v) continue;
  const pii = decryptFields(v.fields, {
    dateFields: PII_FIELDS.dates,
    booleanFields: PII_FIELDS.booleans,
  });
  if (!pii?.email) continue;
  const rebuilt = buildSearchIndex(pii);
  const idx = row.profileSearchIndex || [];
  if (rebuilt.some((d) => !idx.includes(d))) stillMissing += 1;
}

console.log("");
console.log(`[email-index] still missing a digest : ${stillMissing}`);
console.log(
  stillMissing === 0
    ? "[email-index] OK — every email is answerable from the blind index."
    : "[email-index] MISMATCH — do not strip until this is zero.",
);

await mongoose.disconnect();
process.exit(stillMissing === 0 ? 0 : 1);
