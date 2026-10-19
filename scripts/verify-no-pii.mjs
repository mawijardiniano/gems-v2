import "dotenv/config";
import mongoose from "mongoose";
import GemsProfile from "../models/profile.js";
import IdentityVault from "../models/identityVault.js";
import {
  PII_FIELDS,
  decryptFields,
  extractPiiFromProfile,
  isVaultConfigured,
} from "../lib/identityVault.js";

/**
 * The gate that decides whether PII may be deleted from GemsProfile.
 *
 * Three questions, each of which must be answered "yes" for every profile:
 *
 *   1. COVERAGE  — does every profile have a gemsPublicId and a vaultRef, and
 *                  does a vault row actually exist for that ref?
 *   2. FIDELITY  — does the vault decrypt back to exactly the same values the
 *                  legacy fields hold? A migration that silently dropped the
 *                  birthday or mangled an email would pass a coverage check
 *                  and still lose data, so this compares value by value.
 *   3. LEAKAGE   — is anything in the operational collection still holding
 *                  plaintext PII? Today the answer is "yes by design" (dual
 *                  write), so this is reported as a count rather than a
 *                  failure — but `--strict` turns it into a failure, and that
 *                  is the mode to run once the legacy fields are stripped.
 *
 * Exit code is 0 only when every profile checks out. Any failure means the
 * legacy fields must NOT be dropped yet.
 *
 * Usage:
 *   node scripts/verify-no-pii.mjs [--sample N] [--strict] [--json]
 */

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("[verify-no-pii] MONGODB_URI is not defined in .env");
  process.exit(1);
}

const args = process.argv.slice(2);
const strict = args.includes("--strict");
const asJson = args.includes("--json");

function readNumberFlag(name, fallback) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  const value = Number(args[index + 1]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

/* How many mismatches to print in full before switching to counts only. */
const sampleLimit = readNumberFlag("--sample", 20);

/* Compares a vaulted value against the legacy value, treating "absent" and
   "empty string" as the same thing. Dates arrive as Date objects from mongo
   and as ISO strings after decryption, so they compare by timestamp. */
function sameValue(legacy, vaulted) {
  const left = legacy === undefined || legacy === null ? "" : legacy;
  const right = vaulted === undefined || vaulted === null ? "" : vaulted;

  if (left instanceof Date || right instanceof Date) {
    const l = left ? new Date(left).getTime() : 0;
    const r = right ? new Date(right).getTime() : 0;
    if (Number.isNaN(l) && Number.isNaN(r)) return true;
    return l === r;
  }

  if (typeof left === "boolean" || typeof right === "boolean") {
    return Boolean(left) === Boolean(right);
  }

  return (
    String(left).trim().toLowerCase() === String(right).trim().toLowerCase()
  );
}

/* Address fields are nested sub-documents, so they are flattened to their
   barangay/city/province/region names for comparison rather than compared as
   raw objects. */
function normalizeAddress(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return [
    value.barangay?.name,
    value.city?.name,
    value.province?.name,
    value.region?.name,
  ]
    .filter(Boolean)
    .join(", ");
}

/* Prints the human-readable report, or the raw object with --json. */
function emitReport(report) {
  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  const line = (label, value, bad = false) =>
    console.log(
      `  ${bad ? "x" : "+"} ${label.padEnd(34)} ${String(value).padStart(6)}`,
    );

  console.log("[verify-no-pii] coverage");
  line("profiles", report.totalProfiles);
  line(
    "without gemsPublicId",
    report.missingPublicId,
    report.missingPublicId > 0,
  );
  line("without vaultRef", report.missingVaultRef, report.missingVaultRef > 0);
  line("vault row missing", report.missingVaultRow, report.missingVaultRow > 0);
  console.log("");
  console.log("[verify-no-pii] fidelity");
  line("profiles checked", report.checked);
  line("undecryptable", report.undecryptable, report.undecryptable > 0);
  line("value mismatches", report.valueMismatches, report.valueMismatches > 0);
  console.log("");
  console.log("[verify-no-pii] leakage");
  line("vault rows", report.vaultRows);
  line(
    "profiles still holding legacy PII",
    report.profilesWithLegacyPii,
    strict && report.profilesWithLegacyPii > 0,
  );
  line(
    "profiles not marked vaulted",
    report.notVaulted,
    strict && report.notVaulted > 0,
  );
  if (report.migrationStatus) {
    const shown = Object.entries(report.migrationStatus)
      .map(([status, n]) => `${status}=${n}`)
      .join("  ");
    console.log(`    stored migrationStatus: ${shown}`);
  }

  if (report.samples.length > 0) {
    console.log("");
    console.log(`[verify-no-pii] first ${report.samples.length} issue(s)`);
    for (const sample of report.samples) {
      console.log(`  ${sample.profile} — ${sample.issue}`);
      if (sample.field) console.log(`    field : ${sample.field}`);
      if (sample.detail) console.log(`    detail: ${sample.detail}`);
      if (sample.legacy !== undefined)
        console.log(`    legacy: ${JSON.stringify(sample.legacy)}`);
      if (sample.vault !== undefined)
        console.log(`    vault : ${JSON.stringify(sample.vault)}`);
    }
  }

  if (report.profilesWithLegacyPii > 0) {
    console.log("");
    console.log(
      `[verify-no-pii] NOTE: ${report.profilesWithLegacyPii} profile(s) still ` +
        "carry plaintext PII in GemsProfile (expected during dual-write). " +
        "Drop those fields only after this check is clean with --strict.",
    );
  }
}

async function run() {
  if (!isVaultConfigured()) {
    console.error(
      "[verify-no-pii] PII_ENCRYPTION_KEY is not set — cannot decrypt the vault.",
    );
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  /* Collection names come from the models so the verifier can never check the
     wrong collection and report a false all-clear. */
  const profiles = mongoose.connection.collection(
    GemsProfile.collection.collectionName,
  );
  /* The per-row `migrationStatus` re-read uses this handle. The name is kept
     distinct from `profiles` above because that collection object is already
     consumed by the big `find({})` below, and a second cursor over the same
     collection is easier to reason about when it has its own name. */
  const profilesRaw = mongoose.connection.collection(
    GemsProfile.collection.collectionName,
  );
  const vault = mongoose.connection.collection(
    IdentityVault.collection.collectionName,
  );

  console.log(
    `[verify-no-pii] connected to ${mongoose.connection.db.databaseName}`,
  );
  console.log("");

  const report = {
    database: mongoose.connection.db.databaseName,
    totalProfiles: await profiles.countDocuments(),
    missingPublicId: 0,
    missingVaultRef: 0,
    missingVaultRow: 0,
    undecryptable: 0,
    valueMismatches: 0,
    profilesWithLegacyPii: 0,
    notVaulted: 0,
    vaultRows: await vault.countDocuments(),
    checked: 0,
    samples: [],
  };

  /* Load every vault row once into a lookup keyed by vaultRef. At 10k+
     profiles a findOne per profile is thousands of round-trips; one pass over
     the vault collection is a single query. */
  const vaultByRef = new Map();
  for await (const row of vault.find({})) {
    vaultByRef.set(row.vaultRef, row);
  }

  const all = await profiles.find({}).toArray();

  /* `migrationStatus` is checked with a single aggregation, not per row.
     A findOne inside the loop below is one round-trip per profile - 10,846 of
     them, which pushed the verifier past its own patience - and the field is a
     collection-wide property here, so one grouped count answers it exactly.

     It is read raw rather than from the hydrated documents above because
     Mongoose applies the schema default ("vaulted") to any row that stores
     nothing, so a hydrated `migrationStatus` answers "what does the model
     expect", reporting a clean field on a row whose BSON still says "dual".
     The first strip deleted the blocks but never updated this field, and since
     this script only inspected block CONTENTS it reported 0 while all 10,846
     rows still claimed to be mid-migration. */
  const statusCounts = await profilesRaw
    .aggregate([{ $group: { _id: "$migrationStatus", n: { $sum: 1 } } }])
    .toArray();
  report.migrationStatus = Object.fromEntries(
    statusCounts.map((row) => [row._id ?? "(unset)", row.n]),
  );
  report.notVaulted = statusCounts
    .filter((row) => row._id !== "vaulted")
    .reduce((sum, row) => sum + row.n, 0);

  for (const profile of all) {
    if (!profile.gemsPublicId) report.missingPublicId += 1;
    if (!profile.vaultRef) {
      report.missingVaultRef += 1;
      continue;
    }

    const row = vaultByRef.get(profile.vaultRef);
    if (!row) {
      report.missingVaultRow += 1;
      continue;
    }

    /* Fidelity: recompute what the legacy side holds and compare, field by
       field, against what the vault gives back. */
    const legacy = extractPiiFromProfile({
      personal: profile.personal,
      gadData: profile.gadData,
      contact: profile.contact,
    });

    const hasLegacyPii = Object.values(legacy).some(
      (value) => value !== null && value !== undefined && value !== "",
    );
    if (hasLegacyPii) report.profilesWithLegacyPii += 1;

    let decrypted;
    try {
      decrypted = decryptFields(row.fields, {
        dateFields: PII_FIELDS.dates,
        booleanFields: PII_FIELDS.booleans,
      });
    } catch (err) {
      report.undecryptable += 1;
      if (report.samples.length < sampleLimit) {
        report.samples.push({
          profile: profile.gemsPublicId || String(profile._id),
          issue: "undecryptable",
          detail: err.message,
        });
      }
      continue;
    }

    report.checked += 1;

    for (const [key, legacyValue] of Object.entries(legacy)) {
      const vaultedValue = decrypted[key];

      const left = key.endsWith("Address")
        ? normalizeAddress(legacyValue)
        : legacyValue;
      const right = key.endsWith("Address")
        ? normalizeAddress(vaultedValue)
        : vaultedValue;

      if (sameValue(left, right)) continue;

      report.valueMismatches += 1;
      if (report.samples.length < sampleLimit) {
        report.samples.push({
          profile: profile.gemsPublicId || String(profile._id),
          field: key,
          issue: "value mismatch",
          legacy: left instanceof Date ? left.toISOString() : left,
          vault: right instanceof Date ? right.toISOString() : right,
        });
      }
      break; /* one mismatch per profile is enough to act on */
    }
  }

  emitReport(report);

  const hardFailures =
    report.missingPublicId +
    report.missingVaultRef +
    report.missingVaultRow +
    report.undecryptable +
    report.valueMismatches;

  if (hardFailures > 0) {
    console.error("");
    console.error(
      `[verify-no-pii] FAILED — ${hardFailures} problem(s). Do not drop the legacy fields.`,
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  if (strict && report.profilesWithLegacyPii > 0) {
    console.error("");
    console.error(
      `[verify-no-pii] FAILED (strict) — ${report.profilesWithLegacyPii} profile(s) still hold plaintext PII.`,
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  /* A row with no blocks but a non-vaulted status is still a half-migrated row:
     every reader that branches on this field takes the legacy path for it. The
     first strip produced exactly this state on all 10,846 rows while this
     script reported a clean 0. */
  if (strict && report.notVaulted > 0) {
    console.error("");
    console.error(
      `[verify-no-pii] FAILED (strict) — ${report.notVaulted} profile(s) are not marked "vaulted" in the stored document.`,
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log("");
  console.log(
    `[verify-no-pii] PASSED — ${report.checked}/${report.totalProfiles} profile(s) round-trip through the vault.`,
  );

  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error("[verify-no-pii] failed:", err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
