import "dotenv/config";
import mongoose from "mongoose";
import { blindIndexTokens } from "../lib/identityVault.js";

/* Same digest list `searchIndexQuery` (lib/profileBroker.js) produces: every
   token of the term. Mirrored here so this script does not pull in the broker,
   which imports mongoose models and the `@/` alias. */
function searchIndexQuery(term) {
  const tokens = blindIndexTokens(term);
  return tokens.length ? tokens : null;
}

/* Proves the blind index can actually answer the duplicate checks that were
 * moved off the plaintext columns.
 *
 * A backfill reporting "0 missing" only shows the digests are present. This
 * runs the same query shape the route uses, against a real profile, and
 * asserts it finds the row it should. Without this, a wrong digest or a
 * mis-shaped filter would look exactly like "no duplicate".
 */

await mongoose.connect(process.env.MONGODB_URI);
const profiles = mongoose.connection.db.collection("gemsprofiles");
const vault = mongoose.connection.db.collection("identityvaults");
const { decryptFields, PII_FIELDS } = await import("../lib/identityVault.js");

/* Pick a profile that has both a name and an email to test against. An email
   is required: without one the email check would pass vacuously. */
const target = await profiles.findOne({
  profileSearchIndex: { $not: { $size: 0 } },
  vaultRef: { $exists: true, $ne: null },
  "contact.email": { $exists: true, $ne: null },
});

if (!target) {
  console.log("no profile with an email to test against");
  await mongoose.disconnect();
  process.exit(1);
}

const v = await vault.findOne({ vaultRef: target.vaultRef });
const pii = decryptFields(v.fields, {
  dateFields: PII_FIELDS.dates,
  booleanFields: PII_FIELDS.booleans,
});

console.log("target pii keys:", Object.keys(pii).sort().join(", "));
console.log("");

let failures = 0;

function check(label, ok) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failures += 1;
}

/* --- Name check, the shape used in POST --------------------------------- */
const first = searchIndexQuery(pii.first_name);
const last = searchIndexQuery(pii.last_name);
console.log(`first_name digests: ${first?.length}, last_name digests: ${last?.length}`);

const nameHits = first && last
  ? await profiles
      .find({
        profileSearchIndex: { $all: [first[0], last[0]] },
      })
      .toArray()
  : [];

check(
  "the name filter finds the profile it was built from",
  nameHits.some((h) => String(h._id) === String(target._id)),
);

/* --- Email check, the shape used in POST -------------------------------- */
const emailDigests = pii.email ? searchIndexQuery(pii.email) : null;
console.log(`email digests    : ${emailDigests?.length ?? 0}`);

const emailHits = emailDigests
  ? await profiles.find({ profileSearchIndex: { $in: emailDigests } }).toArray()
  : [];

check(
  "the email filter finds the profile it was built from",
  emailDigests ? emailHits.some((h) => String(h._id) === String(target._id)) : false,
);

/* A digest for a name that does not exist must not match anything — the
   "no duplicate" answer has to mean no duplicate, not a broken filter. */
const absent = searchIndexQuery("Zzqxjvwk Nonsense");
const absentHits = absent
  ? await profiles.find({ profileSearchIndex: { $in: absent } }).toArray()
  : [];
check("an absent name matches nothing", absentHits.length === 0);

console.log("");
console.log(failures === 0 ? "STATUS: OK" : `STATUS: ${failures} FAILURE(S)`);
await mongoose.disconnect();
process.exit(failures === 0 ? 0 : 1);
