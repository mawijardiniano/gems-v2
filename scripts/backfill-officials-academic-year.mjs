import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";

/**
 * One-time backfill for the academic-year migration.
 *
 * Tags every existing university official + GFPS document with the active
 * `academic_year` (from SystemSetting `active_term.school_year`, or
 * `--year=YYYY-YYYY`), then rebuilds the officials unique index from
 * {header,title,unit} to {academic_year,header,title,unit}.
 *
 * Usage:
 *   node scripts/backfill-officials-academic-year.mjs                 (dry run)
 *   node scripts/backfill-officials-academic-year.mjs --year=2025-2026
 *   node scripts/backfill-officials-academic-year.mjs --yes            (apply)
 */

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("[backfill-ay] MONGODB_URI is not defined in .env");
  process.exit(1);
}

const args = process.argv.slice(2);
const confirmed = args.includes("--yes");
const yearArg = args.find((a) => a.startsWith("--year="))?.split("=")[1]?.trim();

const isAY = (v) => /^\d{4}-\d{4}$/.test(String(v || "")) && Number(String(v).slice(5)) === Number(String(v).slice(0, 4)) + 1;

async function run() {
  await mongoose.connect(MONGODB_URI);
  const officialsCol = mongoose.connection.collection("universityofficials");
  const gfpsCol = mongoose.connection.collection("gfps");
  const settingsCol = mongoose.connection.collection("systemsettings");

  let academicYear = yearArg || null;
  if (!academicYear) {
    const active = await settingsCol.findOne({ key: "active_term" });
    academicYear = active?.value?.school_year || null;
  }
  if (!isAY(academicYear)) {
    console.error(
      `[backfill-ay] Could not resolve a valid academic year (got "${academicYear}"). Pass --year=YYYY-YYYY.`,
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  const [officials, gfps] = await Promise.all([
    officialsCol.find({}).toArray(),
    gfpsCol.find({}).toArray(),
  ]);
  console.log(`[backfill-ay] Target academic year: ${academicYear}`);
  console.log(
    `[backfill-ay] Found ${officials.length} official(s), ${gfps.length} GFPS doc(s).`,
  );

  const dir = path.join(process.cwd(), "scripts", "backups");
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(dir, `officials-ay-backfill-${academicYear}-${stamp}.json`);
  fs.writeFileSync(file, JSON.stringify({ academicYear, officials, gfps }, null, 2));
  console.log(`[backfill-ay] Backup written to ${file}`);

  const missingFilter = {
    $or: [
      { academic_year: { $exists: false } },
      { academic_year: null },
      { academic_year: "" },
    ],
  };

  const missingOfficials = await officialsCol.countDocuments(missingFilter);
  const missingGfps = await gfpsCol.countDocuments(missingFilter);
  console.log(`[backfill-ay] Docs missing academic_year: ${missingOfficials} official(s), ${missingGfps} GFPS doc(s).`);

  if (!confirmed) {
    console.log("[backfill-ay] Dry run — re-run with --yes to apply.");
    await mongoose.disconnect();
    return;
  }

  if (missingOfficials > 0) {
    const r = await officialsCol.updateMany(
      missingFilter,
      { $set: { academic_year: academicYear } },
    );
    console.log(`[backfill-ay] Tagged ${r.modifiedCount} official(s).`);
  }
  if (missingGfps > 0) {
    const r = await gfpsCol.updateMany(
      missingFilter,
      { $set: { academic_year: academicYear } },
    );
    console.log(`[backfill-ay] Tagged ${r.modifiedCount} GFPS doc(s).`);
  }

  // Rebuild the officials unique index to be year-scoped.
  try {
    const indexes = await officialsCol.indexes();
    const legacy = indexes.find(
      (i) => i.key?.header === 1 && i.key?.title === 1 && i.key?.unit === 1 && !i.key?.academic_year,
    );
    if (legacy) {
      await officialsCol.dropIndex(legacy.name);
      console.log(`[backfill-ay] Dropped legacy index "${legacy.name}".`);
    }
  } catch (err) {
    console.warn("[backfill-ay] Could not drop legacy index:", err.message);
  }
  try {
    await officialsCol.createIndex(
      { academic_year: 1, header: 1, title: 1, unit: 1 },
      { unique: true },
    );
    await officialsCol.createIndex({ academic_year: 1 });
    console.log("[backfill-ay] Year-scoped indexes ensured.");
  } catch (err) {
    console.warn("[backfill-ay] Index creation warning:", err.message);
  }

  await gfpsCol.createIndex({ academic_year: 1 }, { unique: true }).catch((err) =>
    console.warn("[backfill-ay] GFPS index warning:", err.message),
  );

  await mongoose.disconnect();
  console.log("[backfill-ay] Done.");
}

run().catch((err) => {
  console.error("[backfill-ay] Failed:", err);
  process.exit(1);
});
