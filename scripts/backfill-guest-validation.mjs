import "dotenv/config";
import mongoose from "mongoose";

/**
 * One-time backfill for guest check-in validation.
 *
 * Guest check-ins became "pending until an organizer approves them" (strict
 * manual validation). Rows created before that change have no
 * `validation_status` field at all. The API treats a missing status as
 * approved so historical attendance numbers stay intact, and this script makes
 * that explicit by stamping those rows `approved`.
 *
 * Rows that already carry a status are left untouched, so re-running reports
 * "0 guest(s) would change" once the data is clean.
 *
 * Usage: node scripts/backfill-guest-validation.mjs [--dry-run]
 */

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("[backfill-guest-validation] MONGODB_URI is not defined in .env");
  process.exit(1);
}

const dryRun = process.argv.includes("--dry-run");

async function run() {
  await mongoose.connect(MONGODB_URI);
  const col = mongoose.connection.collection("eventguests");

  const legacy = await col.countDocuments({
    $or: [
      { validation_status: { $exists: false } },
      { validation_status: null },
    ],
  });
  const byStatus = await col
    .aggregate([
      {
        $group: {
          _id: { $ifNull: ["$validation_status", "(none)"] },
          n: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ])
    .toArray();

  console.log(
    `[backfill-guest-validation] ${legacy} guest row(s) would change to approved.`,
  );
  byStatus.forEach((row) => {
    console.log(`  ${row._id}: ${row.n}`);
  });

  if (dryRun) {
    console.log("[backfill-guest-validation] dry run — nothing written.");
  } else if (legacy > 0) {
    const res = await col.updateMany(
      {
        $or: [
          { validation_status: { $exists: false } },
          { validation_status: null },
        ],
      },
      { $set: { validation_status: "approved" } },
    );
    console.log(
      `[backfill-guest-validation] updated ${res.modifiedCount} guest row(s).`,
    );
  } else {
    console.log("[backfill-guest-validation] nothing to do.");
  }

  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error("[backfill-guest-validation] failed:", err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
