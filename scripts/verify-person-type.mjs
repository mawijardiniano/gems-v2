import "dotenv/config";
import mongoose from "mongoose";

/* Independent post-backfill check: reads the two status paths straight from
   the collection and reports any row where they disagree or are missing.
   Deliberately does not import the app's own helpers — this is the outside
   check on the backfill, so it must not share its assumptions. */

await mongoose.connect(process.env.MONGODB_URI);
const c = mongoose.connection.db.collection("gemsprofiles");

const total = await c.countDocuments({});
const ptSet = await c.countDocuments({ "affiliation.person_type": { $exists: true, $ne: null } });
const csSet = await c.countDocuments({ "personal.currentStatus": { $exists: true, $ne: null } });

const disagree = await c.countDocuments({
  $expr: { $ne: ["$personal.currentStatus", "$affiliation.person_type"] },
});

const neither = await c.countDocuments({
  "affiliation.person_type": { $exists: false },
  "personal.currentStatus": { $exists: false },
});

console.log(`total                : ${total}`);
console.log(`affiliation.person_type set : ${ptSet}`);
console.log(`personal.currentStatus set  : ${csSet}`);
console.log(`rows disagreeing     : ${disagree}`);
console.log(`rows with neither    : ${neither}`);

/* Confirm the enum was the only thing written to the affiliation block: no
   other keys should have appeared or disappeared. */
const keys = await c.aggregate([
  { $project: { k: { $objectToArray: { $ifNull: ["$affiliation", {}] } } } },
  { $unwind: "$k" },
  { $group: { _id: "$k.k", n: { $sum: 1 } } },
  { $sort: { n: -1 } },
]).toArray();
console.log("affiliation keys:", keys.map((k) => `${k._id}=${k.n}`).join(", "));

const ok = ptSet === total && disagree === 0 && neither === 0;
console.log(ok ? "STATUS: OK" : "STATUS: PROBLEM");
await mongoose.disconnect();
process.exit(ok ? 0 : 1);
