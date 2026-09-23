import "dotenv/config";
import mongoose from "mongoose";
import { formatRefNumber, parseRefNumber } from "../lib/referenceNumber.js";

/**
 * One-time backfill for GPB project reference numbers.
 *
 * Projects created before the reference number feature existed have none, so
 * they would show an empty badge on the GPB workspace. This script assigns
 * `GPB-<year>-<seq>` to every project still missing one, numbered in creation
 * order within each fiscal year and skipping sequences that are already taken.
 *
 * Safe to re-run: projects that already have a reference number are kept.
 *
 * Usage: node scripts/backfill-reference-numbers.mjs [--dry-run]
 */

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("[backfill-ref-numbers] MONGODB_URI is not defined in .env");
  process.exit(1);
}

const dryRun = process.argv.includes("--dry-run");

async function run() {
  await mongoose.connect(MONGODB_URI);
  const col = mongoose.connection.collection("projects");

  const projects = await col
    .find({})
    .sort({ createdAt: 1, _id: 1 })
    .toArray();

  const usedByYear = new Map();
  const missing = [];

  for (const project of projects) {
    const year = Number(project.year);
    if (!Number.isFinite(year)) continue;

    if (!usedByYear.has(year)) usedByYear.set(year, new Set());
    const used = usedByYear.get(year);

    const parsed = parseRefNumber(project.reference_number);
    if (parsed && parsed.year === year) {
      used.add(parsed.sequence);
      continue;
    }

    missing.push(project);
  }

  console.log(
    `[backfill-ref-numbers] ${projects.length} project(s) scanned, ${missing.length} need a reference number.`,
  );
  if (dryRun) {
    console.log("[backfill-ref-numbers] dry run — no writes will be made.");
  }

  let assigned = 0;

  for (const project of missing) {
    const year = Number(project.year);
    const used = usedByYear.get(year);

    let sequence = 1;
    while (used.has(sequence)) sequence += 1;

    const reference = formatRefNumber(year, sequence);
    used.add(sequence);
    assigned += 1;

    console.log(
      `[backfill-ref-numbers] ${dryRun ? "WOULD SET" : "SET"} ${project._id} -> ${reference}`,
    );

    if (!dryRun) {
      await col.updateOne(
        { _id: project._id },
        { $set: { reference_number: reference } },
      );
    }
  }

  console.log(
    `[backfill-ref-numbers] done — ${assigned} project(s) ${
      dryRun ? "would be " : ""
    }updated${dryRun ? " (dry run)" : ""}.`,
  );

  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error("[backfill-ref-numbers] failed:", err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
