import "dotenv/config";
import mongoose from "mongoose";

/*
 * Backfills `affiliation.person_type` from the legacy `personal.currentStatus`
 * column.
 *
 * Why this exists: `personal.currentStatus` is a GEMS-owned identifier
 * (Student/Employee), not identity data, so the Vault does not hold it. But it
 * lives inside the `personal` block, which the PII strip deletes wholesale.
 * Moving it to `affiliation.person_type` first means the strip never has to
 * think about it — and gives those values a home that the strip leaves alone.
 *
 * Safe by design:
 *   - DRY RUN BY DEFAULT. Prints what it would change and writes nothing.
 *     Pass --apply to actually write.
 *   - Only fills rows where person_type is missing. A row that already has a
 *     value is never overwritten, so re-running cannot corrupt a correction
 *     made by hand in between.
 *   - Refuses to guess: a row whose `currentStatus` is absent or is not one of
 *     the two enum values is reported and skipped, not defaulted. Silently
 *     defaulting would invent a person type for a real person.
 *   - Verifies per-value totals before and after, so a partial write cannot
 *     look like success.
 *
 * Usage:
 *   node scripts/backfill-person-type.mjs            # dry run
 *   node scripts/backfill-person-type.mjs --apply    # write
 */

const APPLY = process.argv.includes("--apply");
const VALID = ["Student", "Employee"];

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const c = mongoose.connection.db.collection("gemsprofiles");

  const needFill = {
    $or: [
      { "affiliation.person_type": { $exists: false } },
      { "affiliation.person_type": null },
    ],
  };

  console.log(`[backfill] mode: ${APPLY ? "APPLY (writing)" : "DRY RUN (read-only)"}`);
  console.log("");

  const total = await c.countDocuments({});
  const already = await c.countDocuments({
    "affiliation.person_type": { $exists: true, $ne: null },
  });
  const candidates = await c.countDocuments(needFill);

  console.log("[backfill] before");
  console.log(`  profiles total            : ${total}`);
  console.log(`  person_type already set   : ${already}`);
  console.log(`  need filling              : ${candidates}`);
  console.log("");

  /* Group the candidates by their source value. Anything outside the enum is
     surfaced rather than written. */
  const byValue = await c
    .aggregate([
      { $match: needFill },
      { $group: { _id: "$personal.currentStatus", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ])
    .toArray();

  console.log("[backfill] candidate source values");
  let willWrite = 0;
  const invalid = [];
  for (const row of byValue) {
    const value = row._id;
    if (VALID.includes(value)) {
      willWrite += row.count;
      console.log(`  ${String(value).padEnd(12)} -> person_type  ${row.count}`);
    } else {
      invalid.push(row);
      console.log(
        `  ${String(value).padEnd(12)} -> SKIPPED (not in enum)  ${row.count}`,
      );
    }
  }
  console.log("");
  console.log(`  rows that would be written : ${willWrite}`);
  if (invalid.length) {
    console.log(`  rows skipped as invalid    : ${invalid.reduce((a, r) => a + r.count, 0)}`);
  }

  if (!APPLY) {
    console.log("");
    console.log("[backfill] dry run complete — nothing written. Re-run with --apply.");
    await mongoose.disconnect();
    return;
  }

  /* Write one enum value at a time so each update has a tight, checkable
     filter — and so a failure part-way through leaves an obviously partial
     state rather than a silently mixed one. */
  console.log("");
  console.log("[backfill] writing");
  let written = 0;
  for (const value of VALID) {
    const res = await c.updateMany(
      { ...needFill, "personal.currentStatus": value },
      { $set: { "affiliation.person_type": value } },
    );
    written += res.modifiedCount;
    console.log(`  ${value.padEnd(12)} matched=${res.matchedCount} modified=${res.modifiedCount}`);
  }

  /* Post-conditions: per-value parity with the legacy column, and no row left
     without a person_type. */
  console.log("");
  console.log("[backfill] after");
  const afterSet = await c.countDocuments({
    "affiliation.person_type": { $exists: true, $ne: null },
  });
  const afterStudent = await c.countDocuments({ "affiliation.person_type": "Student" });
  const afterEmployee = await c.countDocuments({ "affiliation.person_type": "Employee" });
  const stillMissing = await c.countDocuments(needFill);

  const legacyStudent = await c.countDocuments({ "personal.currentStatus": "Student" });
  const legacyEmployee = await c.countDocuments({ "personal.currentStatus": "Employee" });

  console.log(`  person_type set           : ${afterSet}`);
  console.log(`    = Student               : ${afterStudent}  (legacy ${legacyStudent})`);
  console.log(`    = Employee              : ${afterEmployee}  (legacy ${legacyEmployee})`);
  console.log(`  still missing             : ${stillMissing}`);
  console.log("");
  console.log(`  rows modified this run    : ${written}`);

  const ok =
    stillMissing === 0 &&
    afterStudent === legacyStudent &&
    afterEmployee === legacyEmployee;

  console.log("");
  console.log(
    ok
      ? "[backfill] OK — person_type mirrors currentStatus on every row."
      : "[backfill] MISMATCH — do not proceed to the strip.",
  );

  await mongoose.disconnect();
  process.exit(ok ? 0 : 1);
}

main().catch(async (e) => {
  console.error("[backfill] failed:", e.message);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
