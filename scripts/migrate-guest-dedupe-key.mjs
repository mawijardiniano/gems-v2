import "dotenv/config";
import mongoose from "mongoose";
import { guestDedupeKey } from "../data/lib/guestIdentity.js";

/**
 * One-time migration: guest rows are identified by `dedupe_key`, not name.
 *
 * Guest check-ins used to be unique on (event_id, full_name), so the second of
 * two people who share a name could never check in. Rows now carry a
 * `dedupe_key` (see data/lib/guestIdentity.js) with its own unique index. This
 * script:
 *
 *   1. backfills `dedupe_key` on every guest row that has none;
 *   2. reports any rows whose new keys collide within one event (possible only
 *      when two old rows differ just by letter case) and leaves those rows
 *      without a key — the partial index ignores them — for review;
 *   3. drops the old unique `event_id_1_full_name_1` index, which would
 *      otherwise keep rejecting same-name check-ins;
 *   4. creates the `{ event_id, dedupe_key }` unique index.
 *
 * Safe to re-run: rows that already have a key are left alone, and existing
 * indexes are detected.
 *
 * Usage: node scripts/migrate-guest-dedupe-key.mjs [--dry-run]
 */

const TAG = "[migrate-guest-dedupe-key]";
const OLD_INDEX = "event_id_1_full_name_1";
const NEW_INDEX = "event_id_1_dedupe_key_1";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error(`${TAG} MONGODB_URI is not defined in .env`);
  process.exit(1);
}

const dryRun = process.argv.includes("--dry-run");

async function run() {
  await mongoose.connect(MONGODB_URI);
  const col = mongoose.connection.collection("eventguests");

  /* 1–2. Keys for rows that have none, skipping in-event collisions. */
  const taken = new Set(
    (
      await col
        .find(
          { dedupe_key: { $type: "string" } },
          { projection: { event_id: 1, dedupe_key: 1 } },
        )
        .toArray()
    ).map((row) => `${row.event_id}::${row.dedupe_key}`),
  );

  const missing = await col
    .find(
      { $or: [{ dedupe_key: { $exists: false } }, { dedupe_key: null }] },
      {
        projection: {
          event_id: 1,
          user_id: 1,
          full_name: 1,
          contact: 1,
          participant_type: 1,
          department_office_org: 1,
        },
      },
    )
    .sort({ createdAt: 1, _id: 1 })
    .toArray();

  const updates = [];
  const collisions = [];
  const unkeyable = [];
  for (const row of missing) {
    const key = guestDedupeKey(row);
    if (!key) {
      unkeyable.push(row._id);
      continue;
    }
    const slot = `${row.event_id}::${key}`;
    if (taken.has(slot)) {
      collisions.push({ _id: row._id, event_id: row.event_id, key });
      continue;
    }
    taken.add(slot);
    updates.push({
      updateOne: {
        filter: { _id: row._id },
        update: { $set: { dedupe_key: key } },
      },
    });
  }

  console.log(`${TAG} ${missing.length} guest row(s) without a key.`);
  console.log(`${TAG} ${updates.length} would get a key.`);
  if (unkeyable.length) {
    console.log(
      `${TAG} ${unkeyable.length} row(s) have no name and are left as-is:`,
      unkeyable.map(String).join(", "),
    );
  }
  if (collisions.length) {
    console.log(
      `${TAG} ${collisions.length} row(s) duplicate another row's key in the same event and are left without one (review them in the Attendance tab):`,
    );
    collisions.forEach((c) =>
      console.log(`  event ${c.event_id}: guest ${c._id} (${c.key})`),
    );
  }

  /* 3–4. Indexes. */
  const indexes = await col.indexes();
  const hasOld = indexes.some((ix) => ix.name === OLD_INDEX);
  const hasNew = indexes.some((ix) => ix.name === NEW_INDEX);
  console.log(
    `${TAG} old name index: ${hasOld ? "present (will drop)" : "absent"}; new key index: ${hasNew ? "present" : "absent (will create)"}.`,
  );

  if (dryRun) {
    console.log(`${TAG} dry run — nothing written.`);
    await mongoose.disconnect();
    return;
  }

  if (updates.length) {
    const res = await col.bulkWrite(updates, { ordered: false });
    console.log(`${TAG} keyed ${res.modifiedCount} guest row(s).`);
  }
  if (hasOld) {
    await col.dropIndex(OLD_INDEX);
    console.log(`${TAG} dropped ${OLD_INDEX}.`);
  }
  if (!hasNew) {
    await col.createIndex(
      { event_id: 1, dedupe_key: 1 },
      {
        name: NEW_INDEX,
        unique: true,
        partialFilterExpression: { dedupe_key: { $type: "string" } },
      },
    );
    console.log(`${TAG} created ${NEW_INDEX}.`);
  }

  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error(`${TAG} failed:`, err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
