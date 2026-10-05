import "dotenv/config";
import mongoose from "mongoose";
import { OFFICE_OPTIONS, canonicalOfficeList } from "../lib/colleges.js";

/**
 * One-time backfill for event office names.
 *
 * Rows saved before the colleges were renamed carry the ampersand spelling
 * ("College of Arts & Social Sciences"). The Event model now accepts the
 * canonical "and" form only, so every row must be converted before that model
 * change goes live — otherwise editing, cancelling or marking attendance on an
 * old event is rejected by validation.
 *
 * Both office arrays are mapped onto the canonical OFFICE_OPTIONS names. Values
 * that match no option (free text on the oldest rows) are left untouched and
 * listed at the end, since those are the only rows the new model can still
 * refuse.
 *
 * Safe to re-run: rows that already hold canonical names are skipped, so a
 * second --dry-run reporting "0 event(s) would change" proves the data is clean.
 *
 * Usage: node scripts/backfill-event-office-names.mjs [--dry-run]
 */

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("[backfill-event-offices] MONGODB_URI is not defined in .env");
  process.exit(1);
}

const dryRun = process.argv.includes("--dry-run");

const OFFICE_FIELDS = ["organizing_office_unit", "co_organizing_office_unit"];

/* True when the stored list already holds the canonical names. */
const sameList = (stored, canonical) =>
  stored.length === canonical.length &&
  stored.every((value, index) => value === canonical[index]);

async function run() {
  await mongoose.connect(MONGODB_URI);
  const col = mongoose.connection.collection("events");

  const events = await col.find({}).toArray();

  const withOffices = events.filter((event) =>
    OFFICE_FIELDS.some(
      (field) => Array.isArray(event[field]) && event[field].length > 0,
    ),
  ).length;

  console.log(
    `[backfill-event-offices] ${events.length} event(s) scanned, ${withOffices} carry an office list.`,
  );
  if (dryRun) {
    console.log("[backfill-event-offices] dry run — no writes will be made.");
  }

  let updated = 0;
  let renamed = 0;
  const leftovers = [];

  for (const event of events) {
    const changes = {};

    for (const field of OFFICE_FIELDS) {
      const stored = event[field];
      if (!Array.isArray(stored) || stored.length === 0) continue;

      const canonical = canonicalOfficeList(stored);

      canonical
        .filter((value) => !OFFICE_OPTIONS.includes(value))
        .forEach((value) =>
          leftovers.push({ id: String(event._id), field, value }),
        );

      if (sameList(stored, canonical)) continue;

      renamed += canonical.filter(
        (value, index) => value !== stored[index],
      ).length;
      changes[field] = canonical;
    }

    if (Object.keys(changes).length === 0) continue;

    updated += 1;
    console.log(
      `[backfill-event-offices] ${dryRun ? "WOULD SET" : "SET"} ${event._id} -> ${JSON.stringify(changes)}`,
    );

    if (!dryRun) {
      await col.updateOne({ _id: event._id }, { $set: changes });
    }
  }

  console.log(
    `[backfill-event-offices] done — ${updated} event(s) ${
      dryRun ? "would be " : ""
    }updated, ${renamed} office name(s) ${
      dryRun ? "would be " : ""
    }rewritten${dryRun ? " (dry run)" : ""}.`,
  );

  if (leftovers.length > 0) {
    console.log(
      `[backfill-event-offices] ${leftovers.length} value(s) are not in the canonical office list and were left alone:`,
    );
    leftovers.forEach(({ id, field, value }) =>
      console.log(`  ${id} ${field}: "${value}"`),
    );
  }

  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error("[backfill-event-offices] failed:", err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
