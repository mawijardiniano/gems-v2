import "dotenv/config";
import mongoose from "mongoose";
import {
  EVENT_TYPE_PREFIXES,
  eventYearFromDate,
  formatEventRefNumber,
  parseEventRefNumber,
} from "../lib/referenceNumber.js";

/**
 * One-time backfill for event reference numbers.
 *
 * Events created before the reference number feature existed have none, so
 * they would show an empty badge on the event cards. This script assigns
 * `<TYPE>-<year>-<seq>` (e.g. `GAD-2025-001`) to every event still missing one,
 * numbered in start-date order within each (type of activity, year) pair and
 * skipping sequences that are already taken.
 *
 * Safe to re-run: events that already have a reference number are kept.
 *
 * Usage: node scripts/backfill-event-reference-numbers.mjs [--dry-run]
 */

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("[backfill-event-refs] MONGODB_URI is not defined in .env");
  process.exit(1);
}

const dryRun = process.argv.includes("--dry-run");

const typeAndYearOf = (event) => {
  const type = String(event.type_of_activity || "").trim();
  const year = eventYearFromDate(event.start_date);
  if (!type || year === null) return null;
  return { type, year };
};

async function run() {
  await mongoose.connect(MONGODB_URI);
  const col = mongoose.connection.collection("events");

  const events = await col
    .find({})
    .sort({ start_date: 1, createdAt: 1, _id: 1 })
    .toArray();

  const usedByKey = new Map();
  const missing = [];

  for (const event of events) {
    const info = typeAndYearOf(event);
    if (!info) continue;

    const key = `${info.type}|${info.year}`;
    if (!usedByKey.has(key)) usedByKey.set(key, new Set());
    const used = usedByKey.get(key);

    const prefix = EVENT_TYPE_PREFIXES[info.type];
    const parsed = parseEventRefNumber(event.reference_number);

    if (parsed && parsed.prefix === prefix && parsed.year === info.year) {
      used.add(parsed.sequence);
      continue;
    }

    missing.push(event);
  }

  console.log(
    `[backfill-event-refs] ${events.length} event(s) scanned, ${missing.length} need a reference number.`,
  );
  if (dryRun) {
    console.log("[backfill-event-refs] dry run — no writes will be made.");
  }

  let assigned = 0;

  for (const event of missing) {
    const { type, year } = typeAndYearOf(event);
    const used = usedByKey.get(`${type}|${year}`);

    let sequence = 1;
    while (used.has(sequence)) sequence += 1;

    const reference = formatEventRefNumber(type, year, sequence);
    used.add(sequence);
    assigned += 1;

    console.log(
      `[backfill-event-refs] ${dryRun ? "WOULD SET" : "SET"} ${event._id} -> ${reference}`,
    );

    if (!dryRun) {
      await col.updateOne(
        { _id: event._id },
        { $set: { reference_number: reference } },
      );
    }
  }

  console.log(
    `[backfill-event-refs] done — ${assigned} event(s) ${
      dryRun ? "would be " : ""
    }updated${dryRun ? " (dry run)" : ""}.`,
  );

  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error("[backfill-event-refs] failed:", err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
