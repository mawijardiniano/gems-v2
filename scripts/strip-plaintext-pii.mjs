import "dotenv/config";
import mongoose from "mongoose";

/*
 * Step 5: remove the plaintext PII blocks from gemsprofiles.
 *
 * After this runs, `personal` / `gadData` / `contact` are gone and the
 * IdentityVault is the only copy of a person's name, birthday and contact
 * details. That is the point of the whole migration, and it is also why this
 * script is the most dangerous one in the repo: `$unset` is not covered by
 * git and cannot be reverted with a tag. The only recovery is a backup.
 *
 * Preconditions it refuses to run without:
 *   1. Every profile has a vaultRef (otherwise that row loses its identity).
 *   2. The vault is a superset of the plaintext blocks - every field holding
 *      data has a vault counterpart, with at least as many populated rows.
 *      scripts/census-strip-gap.mjs answers this; this re-checks it inline so
 *      the strip cannot be run against a moved goalpost.
 *   3. --apply was passed. Default is a dry run.
 *   4. --backup-to was passed. An $unset has no git rollback.
 *
 * Usage:
 *   node scripts/strip-plaintext-pii.mjs                     # dry run
 *   node scripts/strip-plaintext-pii.mjs --apply --backup-to scripts/backups
 *
 * This deliberately does NOT touch `models/profile.js`. Dropping the columns
 * while the schema still declares them is safe (Mongoose ignores absent
 * fields), but the reverse - removing the schema fields while the columns are
 * still read somewhere - is not. Schema and data change together, in the same
 * deploy, and the code change is reviewed separately.
 */

const APPLY = process.argv.includes("--apply");
const BACKUP_DIR = (() => {
  const i = process.argv.indexOf("--backup-to");
  return i !== -1 ? process.argv[i + 1] : null;
})();
/* Point the run at another database on the same cluster. This exists because
   building a URI in the shell proved fragile: the wrapper mangles the escaped
   `$` sequences, and stderr handling made capturing stdout unreliable. Taking
   a plain database name keeps the rehearsal to one safe, inspectable argument
   and removes any chance of the strip running against the live database when
   staging was intended. */
const DB_NAME = (() => {
  const i = process.argv.indexOf("--db");
  return i !== -1 ? process.argv[i + 1] : null;
})();

/*
 * Rebuilds the connection string against `name`, without regex - the escaping
 * needed for a regex here is exactly what the shell kept corrupting. The
 * database is the segment between the first "/" after the scheme's "://" and
 * the "?" that starts the options.
 */
function withDatabase(uri, name) {
  const schemeEnd = uri.indexOf("://");
  const pathStart = uri.indexOf("/", schemeEnd + 3);
  if (pathStart === -1) throw new Error("MONGODB_URI has no database path");
  const queryStart = uri.indexOf("?", pathStart);
  const tail = queryStart === -1 ? "" : uri.slice(queryStart);
  return `${uri.slice(0, pathStart + 1)}${name}${tail}`;
}

/* A staging target must never be the live database. The counter-check that
   matters is precondition 1 (every row has a vaultRef) plus the census, both of
   which the live database passes - so this name check is the only thing
   standing between a rehearsal and production. */
if (DB_NAME && /(^|_)prod($|_)/i.test(DB_NAME)) {
  console.error(`[strip] refusing --db "${DB_NAME}": looks like production`);
  process.exit(1);
}

/* The three blocks the Vault replaces. `affiliation` is deliberately absent:
   it holds GEMS-owned organisational data, not identity data, and survives. */
const BLOCKS = ["personal", "gadData", "contact"];

/* Plaintext path -> vault key. Mirrors scripts/census-strip-gap.mjs; kept in
   step so a field added to one without the other fails the parity check in
   tests/piiStrip.test.mjs. Both lists cover the vault's whole PII_FIELDS
   contract: a field the vault owns but this omits is a field the strip would
   delete without confirming the vault holds it. */
const COUNTERPARTS = {
  "personal.first_name": "first_name",
  "personal.middle_name": "middle_name",
  "personal.last_name": "last_name",
  "personal.birthday": "birthday",
  "personal.civil_status": "civil_status",
  "personal.religion": "religion",
  "personal.religion_other": "religion_other",
  "personal.nationality": "nationality",
  "personal.bloodType": "bloodType",
  "gadData.sexAtBirth": "sexAtBirth",
  "gadData.gender_preference": "gender_preference",
  "gadData.isPWD": "isPWD",
  "gadData.isIndigenousPerson": "isIndigenousPerson",
  "gadData.pwd_type": "pwd_type",
  "gadData.socioEconomicStatus": "socioEconomicStatus",
  "gadData.headOfHousehold": "headOfHousehold",
  "contact.email": "email",
  "contact.mobileNumber": "mobileNumber",
  "contact.permanentAddress": "permanentAddress",
  "contact.currentAddress": "currentAddress",
};

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = DB_NAME
    ? mongoose.connection.client.db(DB_NAME)
    : mongoose.connection.db;
  const profiles = db.collection("gemsprofiles");
  const vault = db.collection("identityvaults");

  console.log(`[strip] mode    : ${APPLY ? "APPLY (deleting)" : "DRY RUN (read-only)"}`);
  console.log(`[strip] cluster : ${(/@([^/?]+)/.exec(process.env.MONGODB_URI)?.[1]) || "?"}`);
  /* Which database is being modified, stated explicitly. Batch scripts that
     destroy data should say out loud where they are pointed. */
  console.log(`[strip] database: ${db.databaseName}${DB_NAME ? "  (--db override)" : ""}`);
  console.log("");

  /* ---- Precondition 1: every profile is linked to a vault row ---------- */
  const total = await profiles.countDocuments({});
  const unlinked = await profiles.countDocuments({
    $or: [{ vaultRef: null }, { vaultRef: { $exists: false } }],
  });
  console.log("[strip] precondition 1 - vault linkage");
  console.log(`  profiles            : ${total}`);
  console.log(`  without vaultRef    : ${unlinked}`);
  if (unlinked > 0) {
    console.error("");
    console.error(`[strip] ABORT: ${unlinked} profile(s) have no vaultRef.`);
    console.error("        Stripping would delete their only copy of the identity.");
    await mongoose.disconnect();
    process.exit(1);
  }
  console.log("  OK");
  console.log("");

  /* ---- Precondition 2: vault is a superset of the plaintext blocks ----- */
  const coverage = new Map();
  for (const row of await vault
    .aggregate([
      { $project: { ks: { $objectToArray: "$fields" } } },
      { $unwind: "$ks" },
      { $group: { _id: "$ks.k", n: { $sum: 1 } } },
    ])
    .toArray()) {
    coverage.set(row._id, row.n);
  }

  console.log("[strip] precondition 2 - vault covers every populated field");
  const orphans = [];
  const parity = [];
  for (const [path, key] of Object.entries(COUNTERPARTS)) {
    const populated = await profiles.countDocuments({
      [path]: { $nin: [null, "", undefined] },
    });
    const inVault = coverage.get(key) || 0;
    /* Nothing in the vault at all means the column has no home after strip. */
    if (populated > 0 && inVault === 0) orphans.push({ path, key, populated });
    /* The vault must hold at least as many rows as the column being deleted:
       fewer means some rows would lose a value the plaintext still has. */
    if (populated > inVault) parity.push({ path, key, populated, inVault });
  }

  if (orphans.length) {
    console.error("");
    console.error("[strip] ABORT: fields exist only in plaintext:");
    for (const o of orphans) console.error(`        ${o.path} (${o.populated} rows)`);
    await mongoose.disconnect();
    process.exit(1);
  }
  if (parity.length) {
    console.error("");
    console.error("[strip] ABORT: vault holds fewer rows than the column being deleted:");
    for (const p of parity) {
      console.error(`        ${p.path}: ${p.populated} plaintext vs ${p.inVault} vault`);
    }
    await mongoose.disconnect();
    process.exit(1);
  }
  console.log(`  ${Object.keys(COUNTERPARTS).length} field(s) checked, no gaps`);
  console.log("");

  /* ---- What is actually about to be deleted ---------------------------- */
  console.log("[strip] blocks to remove");
  let anyPresent = 0;
  for (const block of BLOCKS) {
    const n = await profiles.countDocuments({ [block]: { $exists: true } });
    anyPresent += n;
    console.log(`  ${block.padEnd(10)} present on ${n} row(s)`);
  }
  console.log("");
  if (anyPresent === 0) {
    console.log("[strip] nothing to do - the blocks are already absent.");
    await mongoose.disconnect();
    return;
  }

  if (APPLY && !BACKUP_DIR) {
    console.error("[strip] ABORT: --apply requires --backup-to <dir>.");
    console.error("        An $unset has no git-based rollback; only a dump does.");
    await mongoose.disconnect();
    process.exit(1);
  }

  if (!APPLY) {
    console.log("[strip] DRY RUN - nothing written. Re-run with --apply --backup-to <dir>.");
    await mongoose.disconnect();
    return;
  }

  /* ---- Backup, then delete -------------------------------------------- */
  const fs = await import("node:fs");
  const path = await import("node:path");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const file = path.join(BACKUP_DIR, `gemsprofiles-prestrip-${stamp}.json`);

  console.log(`[strip] writing backup -> ${file}`);
  const docs = await profiles
    .find({}, { projection: { personal: 1, gadData: 1, contact: 1 } })
    .toArray();
  fs.writeFileSync(file, JSON.stringify(docs));
  console.log(`  backed up ${docs.length} row(s)`);
  console.log("");

  const unset = {};
  for (const block of BLOCKS) unset[block] = "";

  console.log("[strip] applying $unset ...");
  const result = await profiles.updateMany({}, { $unset: unset });
  console.log(`  matched : ${result.matchedCount}`);
  console.log(`  modified: ${result.modifiedCount}`);
  console.log("");

  /* Deleting the blocks is only half the strip. `migrationStatus` is what every
     reader uses to decide whether to look for plaintext at all, and the first
     strip left it at "dual" on all 10,846 rows - so rows that had no blocks
     still advertised themselves as mid-migration. Writers moved to "vaulted"
     long ago and the schema default is "vaulted", but a default only applies
     to documents written after it changes; it never rewrites existing rows.
     Any reader that branches on this field would still take the dual path.

     Mongoose defaults are also why this is invisible from the model: hydration
     fills "vaulted" for a row that stores nothing, so the field must be read
     with the native driver to see what is actually there. */
  console.log("[strip] stamping migrationStatus ...");
  const statusResult = await profiles.updateMany(
    { migrationStatus: { $ne: "vaulted" } },
    { $set: { migrationStatus: "vaulted" } },
  );
  console.log(`  matched : ${statusResult.matchedCount}`);
  console.log(`  modified: ${statusResult.modifiedCount}`);
  console.log("");

  /* ---- Confirm the blocks are gone ------------------------------------ */
  console.log("[strip] post-check");
  let remaining = 0;
  for (const block of BLOCKS) {
    const n = await profiles.countDocuments({ [block]: { $exists: true } });
    remaining += n;
    console.log(`  ${block.padEnd(10)} still present on ${n} row(s)`);
  }
  /* affiliation must survive: the strip is not allowed to touch it. */
  const affiliation = await profiles.countDocuments({
    affiliation: { $exists: true },
  });
  console.log(`  affiliation preserved on ${affiliation} row(s)`);

  /* Checked here as well as in verify-no-pii.mjs: the two scripts have to agree
     on what "stripped" means, and this is the field that was missed once. */
  const stillDual = await profiles.countDocuments({
    migrationStatus: { $ne: "vaulted" },
  });
  console.log(`  migrationStatus != vaulted on ${stillDual} row(s)`);

  console.log("");
  if (remaining > 0) {
    console.error("[strip] STATUS: INCOMPLETE - blocks still present");
    await mongoose.disconnect();
    process.exit(1);
  }
  console.log("[strip] STATUS: OK - plaintext blocks removed");
  console.log("[strip] run scripts/verify-no-pii.mjs --strict to confirm 0 legacy rows");

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("[strip] failed:", err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
