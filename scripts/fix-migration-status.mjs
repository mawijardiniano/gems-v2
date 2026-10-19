import "dotenv/config";
import mongoose from "mongoose";
import GemsProfile from "../models/profile.js";

/*
 * Converges `migrationStatus` to "vaulted" on rows that are already stripped.
 *
 * The first strip deleted `personal` / `gadData` / `contact` but never touched
 * this field, so all 10,846 rows keep "dual" - a value that describes writing
 * to two places, one of which no longer exists. Writers have hardcoded
 * "vaulted" for a while and the schema default is "vaulted", but a default
 * only applies to documents written after it changes; it never rewrites rows
 * already on disk. Mongoose hydration also fills the default, so the mismatch
 * is invisible from the model and only a raw read shows it.
 *
 * This touches ONE field on rows that hold no plaintext. It does not delete
 * anything, so unlike the strip it is reversible by setting the value back.
 * The idempotent filter means re-running matches nothing.
 *
 * Usage:
 *   node scripts/fix-migration-status.mjs           # report only
 *   node scripts/fix-migration-status.mjs --apply
 */

const args = process.argv.slice(2);
const apply = args.includes("--apply");

if (!process.env.MONGODB_URI) {
  console.error("[migration-status] MONGODB_URI is not defined in .env");
  process.exit(1);
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const profiles = db.collection(GemsProfile.collection.collectionName);

  console.log(`[migration-status] connected to ${db.databaseName}`);
  console.log("");

  const before = await profiles
    .aggregate([{ $group: { _id: "$migrationStatus", n: { $sum: 1 } } }])
    .toArray();
  console.log("[migration-status] stored values before");
  for (const row of before) {
    console.log(`  ${String(row._id ?? "(unset)").padEnd(12)} : ${row.n}`);
  }
  console.log("");

  /* Only rows that are already free of the legacy blocks are touched. A row
     that still holds plaintext is a different, larger problem - stamping it
     "vaulted" while it carries plaintext would actively misdescribe it, and
     the verifier's strict mode is what should surface that case. */
  const filter = {
    migrationStatus: { $ne: "vaulted" },
    personal: { $exists: false },
    gadData: { $exists: false },
    contact: { $exists: false },
  };

  const candidates = await profiles.countDocuments(filter);
  const withPlaintext = await profiles.countDocuments({
    migrationStatus: { $ne: "vaulted" },
    $or: [
      { personal: { $exists: true } },
      { gadData: { $exists: true } },
      { contact: { $exists: true } },
    ],
  });

  console.log(`[migration-status] rows to stamp    : ${candidates}`);
  console.log(`[migration-status] rows still holding plaintext: ${withPlaintext}`);
  console.log("");

  if (withPlaintext > 0) {
    console.warn(
      "[migration-status] WARNING: rows above hold plaintext and a non-vaulted\n" +
        "  status. They are deliberately left alone. Re-run the strip for them.",
    );
    console.warn("");
  }

  if (!apply) {
    console.log("[migration-status] dry run - pass --apply to write the change.");
    await mongoose.disconnect();
    return;
  }

  const result = await profiles.updateMany(filter, {
    $set: { migrationStatus: "vaulted" },
  });
  console.log(`[migration-status] matched : ${result.matchedCount}`);
  console.log(`[migration-status] modified: ${result.modifiedCount}`);
  console.log("");

  const after = await profiles
    .aggregate([{ $group: { _id: "$migrationStatus", n: { $sum: 1 } } }])
    .toArray();
  console.log("[migration-status] stored values after");
  for (const row of after) {
    console.log(`  ${String(row._id ?? "(unset)").padEnd(12)} : ${row.n}`);
  }

  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error("[migration-status] failed:", err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
