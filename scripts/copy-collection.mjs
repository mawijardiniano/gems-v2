import "dotenv/config";
import mongoose from "mongoose";

/*
 * Copies one collection between databases on the same cluster.
 *
 * Used to bring `identityvaults` into a scratch database that already holds
 * restored `gemsprofiles` rows. The census compares plaintext against the
 * vault, so a scratch database with profiles but no vault reports every field
 * as an orphan - which is a false alarm loud enough to hide a real one.
 *
 * Read-only with respect to the source.
 *
 * Usage:
 *   node scripts/copy-collection.mjs <source-db> <target-db> <collection>
 */

const [sourceDb, targetDb, collection] = process.argv.slice(2);
if (!sourceDb || !targetDb || !collection) {
  console.error("[copy] usage: node scripts/copy-collection.mjs <source-db> <target-db> <collection>");
  process.exit(1);
}
if (!/^[A-Za-z0-9_-]{3,40}$/.test(targetDb)) {
  console.error("[copy] target name must be 3-40 chars of [A-Za-z0-9_-]");
  process.exit(1);
}
if (/^gems$/i.test(targetDb) || /prod/i.test(targetDb)) {
  console.error(`[copy] refusing target "${targetDb}" - looks like production`);
  process.exit(1);
}
if (sourceDb === targetDb) {
  console.error("[copy] source and target are the same database");
  process.exit(1);
}

await mongoose.connect(process.env.MONGODB_URI);
const src = mongoose.connection.client.db(sourceDb).collection(collection);
const dst = mongoose.connection.client.db(targetDb).collection(collection);

const total = await src.countDocuments({});
console.log(`[copy] ${sourceDb}.${collection} -> ${targetDb}.${collection}`);
console.log(`[copy] source rows: ${total}`);

const BATCH = 500;
let written = 0;
let batch = [];
for await (const doc of src.find({})) {
  batch.push(doc);
  if (batch.length >= BATCH) {
    await dst.bulkWrite(
      batch.map((d) => ({ replaceOne: { filter: { _id: d._id }, replacement: d, upsert: true } })),
      { ordered: false },
    );
    written += batch.length;
    batch = [];
  }
}
if (batch.length) {
  await dst.bulkWrite(
    batch.map((d) => ({ replaceOne: { filter: { _id: d._id }, replacement: d, upsert: true } })),
    { ordered: false },
  );
  written += batch.length;
}

const check = await dst.countDocuments({});
console.log(`[copy] written: ${written}, target now: ${check} ${check === total ? "OK" : "MISMATCH"}`);

await mongoose.disconnect();
process.exit(check === total ? 0 : 1);
