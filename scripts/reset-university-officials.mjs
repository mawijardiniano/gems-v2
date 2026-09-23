import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";

/**
 * One-time reset for the university officials collection.
 *
 * The officials feature moved to a catalog + roster design: every seat lives
 * in lib/universityOfficialsConstants.js and the database only stores who
 * fills a seat. The old single-document org chart shape is incompatible, so
 * this script backs it up and wipes the collection. All seats then render as
 * vacant until they are re-assigned through the University Officials page.
 *
 * Usage:
 *   node scripts/reset-university-officials.mjs         (backup + preview)
 *   node scripts/reset-university-officials.mjs --yes   (backup + delete)
 */

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("[reset-officials] MONGODB_URI is not defined in .env");
  process.exit(1);
}

const confirmed = process.argv.includes("--yes");

async function run() {
  await mongoose.connect(MONGODB_URI);
  const col = mongoose.connection.collection("universityofficials");

  const docs = await col.find({}).toArray();
  console.log(
    `[reset-officials] Found ${docs.length} document(s) in the officials collection.`,
  );

  if (docs.length === 0) {
    console.log("[reset-officials] Nothing to delete.");
    await mongoose.disconnect();
    return;
  }

  const dir = path.join(process.cwd(), "scripts", "backups");
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(dir, `university-officials-backup-${stamp}.json`);
  fs.writeFileSync(file, JSON.stringify(docs, null, 2));
  console.log(`[reset-officials] Backup written to ${file}`);

  if (!confirmed) {
    console.log(
      "[reset-officials] Dry run — re-run with --yes to delete the old document(s).",
    );
    await mongoose.disconnect();
    return;
  }

  const result = await col.deleteMany({});
  console.log(
    `[reset-officials] Deleted ${result.deletedCount} document(s). All 147 seats now render as vacant from the code-side catalog.`,
  );
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("[reset-officials] Failed:", err);
  process.exit(1);
});
