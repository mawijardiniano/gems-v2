import "dotenv/config";
import mongoose from "mongoose";

/* How well is `profileSearchIndex` populated? The duplicate checks have to
   move off the plaintext name/email columns before the strip, so this reports
   whether the blind index can actually answer them. */

await mongoose.connect(process.env.MONGODB_URI);
const c = mongoose.connection.db.collection("gemsprofiles");

const total = await c.countDocuments({});
const hasIndex = await c.countDocuments({
  profileSearchIndex: { $exists: true, $not: { $size: 0 } },
});
const emptyIndex = await c.countDocuments({
  $or: [
    { profileSearchIndex: { $exists: false } },
    { profileSearchIndex: { $size: 0 } },
  ],
});

console.log(`total profiles          : ${total}`);
console.log(`profileSearchIndex set  : ${hasIndex}`);
console.log(`profileSearchIndex empty: ${emptyIndex}`);

/* Sample a few to see the digest count per row. */
const samples = await c
  .aggregate([
    { $match: { profileSearchIndex: { $not: { $size: 0 } } } },
    { $project: { n: { $size: "$profileSearchIndex" }, migrationStatus: 1 } },
    { $limit: 5 },
  ])
  .toArray();
console.log("sample digest counts:", samples.map((s) => `${s.n}(${s.migrationStatus})`).join(", "));

/* `migrationStatus` distribution decides what a fallback path has to cover. */
const byStatus = await c
  .aggregate([{ $group: { _id: "$migrationStatus", n: { $sum: 1 } } }, { $sort: { n: -1 } }])
  .toArray();
console.log("migrationStatus:", byStatus.map((s) => `${s._id}=${s.n}`).join(", "));

/* Email: the check at profile/route.js reads the plaintext column. Count both
   the plaintext and what the vault would have to answer with. */
const emailPlain = await c.countDocuments({ "contact.email": { $exists: true, $ne: null } });
console.log(`contact.email plaintext : ${emailPlain}`);

const vault = mongoose.connection.db.collection("identityvaults");
const vaultTotal = await vault.countDocuments({});
console.log(`identityvaults rows     : ${vaultTotal}`);

await mongoose.disconnect();
