import "dotenv/config";
import mongoose from "mongoose";
import GemsProfile from "../models/profile.js";
import IdentityVault from "../models/identityVault.js";
import StagingRecord from "../models/stagingRecord.js";
import {
  PII_FIELDS,
  buildSearchIndex,
  encryptFields,
  extractPiiFromProfile,
  generatePublicId,
  generateVaultRef,
  isVaultConfigured,
  isVaultKeyDerived,
} from "../data/lib/identityVault.js";

/**
 * Repairs profiles that the integration migrate created without their PII.
 *
 * After f69c78c moved names, birthday, contact and GAD data into the Identity
 * Vault, `POST /api/integration/batches/[id]/migrate` kept writing them onto
 * GemsProfile, where the schema silently dropped them. Those profiles exist
 * with affiliation only: no vault row, no `vaultRef`, no search index, so they
 * show no name and cannot be found by name or email. Fixed in 34ddfc6.
 *
 * The PII was never lost: every migrated staging record keeps the row's
 * `mapped_payload` and points at the profile it produced through
 * `migration_result.profile_id`. This script follows that link and writes the
 * PII to the vault in place. It does not re-run migrate, so a row whose only
 * identifier was an email (which could not be matched again) cannot produce
 * a second profile.
 *
 * A profile is repaired when it has no `vaultRef`, or has one with no vault
 * row behind it. When several migrated rows point at one profile (re-imports
 * over several terms), they are applied oldest first and a blank cell never
 * erases a value from an earlier row — the same rule migrate uses.
 *
 * Profiles that are broken but have no migrated staging record pointing at
 * them are listed, not touched: there is no source to repair them from.
 *
 * Dry run by default. Back up `gemsprofiles` and `identityvaults` before
 * passing --apply.
 *
 * Usage:
 *   node scripts/repair-import-pii.mjs [--apply] [--limit N]
 */

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("[repair-import-pii] MONGODB_URI is not defined in .env");
  process.exit(1);
}

const args = process.argv.slice(2);
const apply = args.includes("--apply");

function readNumberFlag(name, fallback) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  const value = Number(args[index + 1]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

const limit = readNumberFlag("--limit", Number.MAX_SAFE_INTEGER);
const DATE_FIELDS = new Set(PII_FIELDS.dates);
const SAMPLE = 20;

function isBlank(value) {
  return (
    value === undefined ||
    value === null ||
    (typeof value === "string" && value.trim() === "")
  );
}

/* Mirrors extractIncomingPii in app/api/integration/_utils/profileMatch.js,
   which reaches the vault through the "@/" alias and so cannot be imported
   from a plain node script. */
function piiFromMappedPayload(mapped) {
  const out = {};
  for (const [key, value] of Object.entries(
    extractPiiFromProfile(mapped || {}),
  )) {
    if (isBlank(value)) continue;
    if (DATE_FIELDS.has(key)) {
      const d = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(d.getTime())) continue;
      out[key] = d;
    } else {
      out[key] = typeof value === "string" ? value.trim() : value;
    }
  }
  return out;
}

async function assignPublicId(profiles, taken) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = generatePublicId();
    if (taken.has(candidate)) continue;
    const clash = await profiles.findOne(
      { gemsPublicId: candidate },
      { projection: { _id: 1 } },
    );
    if (!clash) {
      taken.add(candidate);
      return candidate;
    }
  }
  throw new Error("Unable to generate a unique gemsPublicId after 10 attempts");
}

async function run() {
  if (!isVaultConfigured()) {
    console.error(
      "[repair-import-pii] PII_ENCRYPTION_KEY is not set. Refusing to write PII " +
        "under a derived development key — set the real key in .env first.",
    );
    process.exit(1);
  }
  if (isVaultKeyDerived()) {
    console.error(
      "[repair-import-pii] PII_ENCRYPTION_KEY could not be decoded; aborting.",
    );
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);

  /* Collection names come from the models so they cannot drift from the app. */
  const profiles = mongoose.connection.collection(
    GemsProfile.collection.collectionName,
  );
  const vault = mongoose.connection.collection(
    IdentityVault.collection.collectionName,
  );
  const staging = mongoose.connection.collection(
    StagingRecord.collection.collectionName,
  );

  console.log(
    `[repair-import-pii] connected to ${mongoose.connection.db.databaseName}${
      apply ? "" : " (DRY RUN — no writes; pass --apply to repair)"
    }`,
  );

  /* Broken = no vaultRef, or a vaultRef with no vault row behind it. */
  const withoutRef = await profiles
    .find(
      {
        $or: [
          { vaultRef: { $exists: false } },
          { vaultRef: { $in: [null, ""] } },
        ],
      },
      { projection: { _id: 1, vaultRef: 1, gemsPublicId: 1 } },
    )
    .toArray();

  const withRef = await profiles
    .find(
      { vaultRef: { $exists: true, $nin: [null, ""] } },
      { projection: { _id: 1, vaultRef: 1, gemsPublicId: 1 } },
    )
    .toArray();
  const existingRefs = new Set(
    (await vault.distinct("vaultRef", {
      vaultRef: { $in: withRef.map((p) => p.vaultRef) },
    })).map(String),
  );
  const danglingRef = withRef.filter(
    (p) => !existingRefs.has(String(p.vaultRef)),
  );

  const broken = [...withoutRef, ...danglingRef].slice(0, limit);
  console.log(
    `[repair-import-pii] ${withoutRef.length} profile(s) without a vaultRef, ` +
      `${danglingRef.length} with a vaultRef but no vault row.`,
  );
  if (broken.length === 0) {
    console.log("[repair-import-pii] nothing to repair.");
    await mongoose.disconnect();
    return;
  }

  const taken = new Set(
    (
      await profiles
        .find({ gemsPublicId: { $exists: true, $ne: null } })
        .project({ gemsPublicId: 1 })
        .toArray()
    ).map((row) => row.gemsPublicId),
  );

  let repaired = 0;
  let noSource = 0;
  let noPii = 0;
  let failed = 0;
  const noSourceIds = [];

  for (const profile of broken) {
    const sources = await staging
      .find(
        {
          status: "migrated",
          "migration_result.profile_id": profile._id,
        },
        { projection: { mapped_payload: 1, updatedAt: 1 } },
      )
      .sort({ updatedAt: 1, _id: 1 })
      .toArray();

    if (sources.length === 0) {
      noSource += 1;
      if (noSourceIds.length < SAMPLE) noSourceIds.push(String(profile._id));
      continue;
    }

    /* Oldest first; a later non-blank value wins, a blank never erases. */
    const pii = {};
    for (const row of sources) {
      Object.assign(pii, piiFromMappedPayload(row.mapped_payload));
    }

    const keys = Object.keys(pii);
    if (keys.length === 0) {
      noPii += 1;
      console.log(
        `[repair-import-pii] SKIP ${profile._id}: ${sources.length} source row(s), no PII in them`,
      );
      continue;
    }

    console.log(
      `[repair-import-pii] ${apply ? "REPAIRING" : "WOULD REPAIR"} ${
        profile._id
      } from ${sources.length} row(s) fields=${keys.join(",")}`,
    );
    if (!apply) {
      repaired += 1;
      continue;
    }

    try {
      const gemsPublicId =
        profile.gemsPublicId || (await assignPublicId(profiles, taken));
      const vaultRef = profile.vaultRef || generateVaultRef();
      const encrypted = encryptFields(pii, {
        dateFields: PII_FIELDS.dates,
        booleanFields: PII_FIELDS.booleans,
      });

      /* Vault first, so a failure between the two writes leaves an orphan
         vault row rather than a profile pointing at nothing. */
      await vault.updateOne(
        { vaultRef },
        {
          $set: {
            fields: encrypted,
            owner_type: "profile",
            source: "backfill",
            key_version: Number(process.env.PII_ENCRYPTION_KEY_VERSION || 1),
            updatedAt: new Date(),
          },
          $setOnInsert: {
            vaultRef,
            migrated_from: profile._id,
            createdAt: new Date(),
          },
        },
        { upsert: true },
      );

      await profiles.updateOne(
        { _id: profile._id },
        {
          $set: {
            gemsPublicId,
            vaultRef,
            profileSearchIndex: buildSearchIndex(pii),
            migrationStatus: "vaulted",
            updatedAt: new Date(),
          },
        },
      );
      repaired += 1;
    } catch (err) {
      failed += 1;
      console.error(`[repair-import-pii] FAILED ${profile._id}: ${err.message}`);
    }
  }

  console.log("");
  console.log("[repair-import-pii] summary");
  console.log(`  broken profiles : ${broken.length}`);
  console.log(`  ${apply ? "repaired       " : "would repair   "} : ${repaired}`);
  console.log(`  no PII in source: ${noPii}`);
  console.log(`  no source row   : ${noSource} (not created by an import; left as is)`);
  if (noSourceIds.length) {
    console.log(
      `    e.g. ${noSourceIds.join(", ")}${noSource > SAMPLE ? ", ..." : ""}`,
    );
  }
  console.log(`  failed          : ${failed}`);
  if (apply && repaired > 0) {
    console.log("");
    console.log("[repair-import-pii] next: node scripts/verify-vault-health.mjs");
  }

  await mongoose.disconnect();
  if (failed > 0) process.exit(1);
}

run().catch(async (err) => {
  console.error("[repair-import-pii] failed:", err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
