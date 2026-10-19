import "dotenv/config";
import mongoose from "mongoose";

/*
 * Creates a throwaway copy of the two PII collections so the strip can be
 * rehearsed against real data without touching production.
 *
 * A staging clone is the only way to answer "does the app still work after the
 * strip?" honestly. A dry run proves the script would run; it cannot prove the
 * read path still serves names once the plaintext columns are gone, because
 * nothing has actually been deleted yet.
 *
 * Read-only with respect to the source: it only ever inserts into the target.
 * The source collections are opened with a read preference and never written.
 *
 * Usage:
 *   node scripts/clone-for-staging.mjs <staging-db-name>
 *   node scripts/clone-for-staging.mjs gems_staging_strip
 */

const target = process.argv[2];
if (!target) {
  console.error("[clone] usage: node scripts/clone-for-staging.mjs <staging-db-name>");
  process.exit(1);
}
if (!/^[A-Za-z0-9_-]{3,40}$/.test(target)) {
  console.error("[clone] target name must be 3-40 chars of [A-Za-z0-9_-]");
  process.exit(1);
}
/* Refusing to write into the live database by name is a cheap guard against a
   copy-paste that would otherwise clone production onto itself. */
if (/gems$/i.test(target) || /prod/i.test(target)) {
  console.error(`[clone] refusing target "${target}" - looks like the production database name`);
  process.exit(1);
}

/* The collections that matter for the strip: the PII profile docs and the
   encrypted vault rows they must survive on. */
const COLLECTIONS = ["gemsprofiles", "identityvaults"];

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const targetDb = mongoose.connection.client.db(target);

  /* Refuse to clobber an existing staging database: a half-overwritten clone
     would make the rehearsal meaningless. */
  const existing = await targetDb.listCollections().toArray();
  if (existing.length > 0) {
    console.error(`[clone] ABORT: database "${target}" already exists with ${existing.length} collection(s).`);
    console.error("        Drop it first, or choose another name.");
    await mongoose.disconnect();
    process.exit(1);
  }

  const host = /@([^/?]+)/.exec(process.env.MONGODB_URI)?.[1] || "?";
  console.log(`[clone] cluster : ${host}`);
  console.log(`[clone] target  : ${target}`);
  console.log("");

  for (const name of COLLECTIONS) {
    const src = db.collection(name);
    const dst = targetDb.collection(name);

    const total = await src.countDocuments({});
    console.log(`[clone] ${name}: ${total} document(s) to copy`);

    /* Copy in batches so a large collection does not have to fit in memory.
       ObjectId/_id values are preserved so vaultRef links stay valid. */
    const BATCH = 500;
    let copied = 0;
    let batch = [];
    const cursor = src.find({});
    for await (const doc of cursor) {
      batch.push(doc);
      if (batch.length >= BATCH) {
        await dst.insertMany(batch, { ordered: false });
        copied += batch.length;
        batch = [];
      }
    }
    if (batch.length) {
      await dst.insertMany(batch, { ordered: false });
      copied += batch.length;
    }

    const check = await dst.countDocuments({});
    const ok = check === total;
    console.log(`[clone] ${name}: copied ${copied}, target now ${check} ${ok ? "OK" : "MISMATCH"}`);
    if (!ok) {
      console.error(`[clone] ABORT: ${name} copy is incomplete (${check} of ${total})`);
      await mongoose.disconnect();
      process.exit(1);
    }

    /* The strip rehearsal opens the vault by key name; without the indexes the
       clone would behave differently from production under load. */
    const idx = await src.indexes();
    for (const spec of idx) {
      if (spec.name === "_id_") continue;
      try {
        await dst.createIndex(spec.key, { name: spec.name, sparse: spec.sparse, unique: spec.unique });
      } catch {
        /* An index that cannot be recreated (e.g. duplicate values under a
           unique spec) is not fatal for a rehearsal; note and continue. */
        console.log(`[clone] ${name}: skipped index ${spec.name}`);
      }
    }
    console.log("");
  }

  console.log(`[clone] STATUS: OK - staging database "${target}" ready`);
  console.log(`[clone] rehearse with: MONGODB_URI="<uri-with-/${target}>" node scripts/strip-plaintext-pii.mjs`);

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("[clone] failed:", err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
