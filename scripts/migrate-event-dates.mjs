
import "dotenv/config";
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("[migrate-event-dates] MONGODB_URI is not defined in .env");
  process.exit(1);
}

function asDate(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function run() {
  await mongoose.connect(MONGODB_URI);
  const col = mongoose.connection.collection("events");

  const events = await col
    .find({ $or: [{ start_date: { $exists: false } }, { start_date: null }] })
    .toArray();

  console.log(`[migrate-event-dates] ${events.length} event(s) need migration.`);

  if (events.length === 0) {
    await mongoose.disconnect();
    return;
  }

  let migrated = 0;
  let skipped = 0;

  for (const event of events) {
    const starts = (event.start_dates || [])
      .map(asDate)
      .filter(Boolean)
      .sort((a, b) => a.getTime() - b.getTime());
    const ends = (event.end_dates || []).map(asDate).filter(Boolean);

    if (starts.length === 0) {
      console.warn(
        `[migrate-event-dates] SKIP ${event._id} "${event.title}" - no valid start_dates found.`,
      );
      skipped += 1;
      continue;
    }

    const startDate = starts[0];
    const endDate = ends.length > 0
      ? ends.sort((a, b) => a.getTime() - b.getTime()).slice(-1)[0]
      : starts.slice(-1)[0];

    const set = { start_date: startDate, end_date: endDate };
    if (event.number_of_days == null) {
      set.number_of_days = starts.length || 1;
    }

    await col.updateOne({ _id: event._id }, { $set: set });

    migrated += 1;
    console.log(
      `[migrate-event-dates] OK ${event._id} "${event.title}" -> ${startDate.toISOString()} .. ${endDate.toISOString()}`,
    );
  }

  console.log(
    `[migrate-event-dates] Done. migrated=${migrated} skipped=${skipped}`,
  );

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("[migrate-event-dates] FAILED:", err);
  process.exit(1);
});

