import "dotenv/config";
import mongoose from "mongoose";

/*
 * Drops a scratch database created for a rehearsal or an audit.
 *
 * The rehearsal and audit flows create real databases on the production
 * cluster (a clone, and a restored pre-strip copy). Leaving them behind costs
 * storage and, worse, leaves a full copy of the pre-strip plaintext sitting on
 * the cluster after the point of the exercise was to remove it.
 *
 * Refuses to touch anything that looks like a live database.
 *
 * Usage:
 *   node scripts/drop-scratch-db.mjs gems_staging_strip gems_audit_prestrip
 */

const targets = process.argv.slice(2);
if (!targets.length) {
  console.error("[drop] usage: node scripts/drop-scratch-db.mjs <db-name> [<db-name> ...]");
  process.exit(1);
}

/* Guard on both the live name and anything production-flavoured. A typo here
   destroys the production database, so the check is deliberately blunt. */
const SAFE = /^(?!.*(^|_)prod($|_)).*$/i;
for (const name of targets) {
  if (!/^[A-Za-z0-9_-]{3,40}$/.test(name) || /^gems$/i.test(name) || !SAFE.test(name)) {
    console.error(`[drop] refusing "${name}" - looks like a live database`);
    process.exit(1);
  }
}

await mongoose.connect(process.env.MONGODB_URI);

for (const name of targets) {
  const db = mongoose.connection.client.db(name);
  const before = await db.listCollections().toArray();
  if (before.length === 0) {
    console.log(`[drop] ${name}: already absent`);
    continue;
  }
  await db.dropDatabase();
  console.log(`[drop] ${name}: dropped (${before.length} collection(s))`);
}

await mongoose.disconnect();
