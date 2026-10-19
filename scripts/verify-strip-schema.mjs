import "dotenv/config";
import mongoose from "mongoose";
import Profile from "../models/profile.js";

/*
 * Confirms the schema change matches the data change.
 *
 * After the strip, `models/profile.js` must no longer declare the three legacy
 * blocks, and `affiliation` must still be there. If the schema still declared
 * them, a future write could carry plaintext PII straight back into the
 * collection through a path the strip had just emptied - the migration would
 * silently undo itself.
 *
 * Runs as a FILE: the same checks written as `node -e` are mangled by the
 * shell wrapper and reported as a parse error rather than a real result.
 */

const schema = Profile.schema;

const checks = [
  ["personal", schema.path("personal"), null],
  ["gadData", schema.path("gadData"), null],
  ["contact", schema.path("contact"), null],
  ["affiliation", schema.path("affiliation"), "present"],
  ["vaultRef", schema.path("vaultRef"), "present"],
  ["gemsPublicId", schema.path("gemsPublicId"), "present"],
  ["profileSearchIndex", schema.path("profileSearchIndex"), "present"],
];

let failures = 0;
console.log("[schema] legacy block paths");
for (const [name, path, expected] of checks) {
  const present = Boolean(path);
  const ok = expected === null ? !present : present;
  if (!ok) failures++;
  console.log(
    `  ${name.padEnd(20)} ${present ? "declared" : "absent  "}  ${ok ? "OK" : "FAIL"}`,
  );
}

const status = schema.path("migrationStatus");
const defaultOk = status?.defaultValue === "vaulted";
if (!defaultOk) failures++;
console.log("");
console.log("[schema] migrationStatus");
console.log(`  default              ${status?.defaultValue}  ${defaultOk ? "OK" : "FAIL"}`);

/* The `fullName` virtual read `personal`, which no longer exists; leaving it
   in place would return an empty string forever instead of erroring. */
const hasFullName = Boolean(schema.virtuals?.fullName);
if (hasFullName) failures++;
console.log("");
console.log("[schema] fullName virtual");
console.log(`  removed              ${!hasFullName ? "yes" : "NO"}  ${!hasFullName ? "OK" : "FAIL"}`);

/* No index may reference a stripped path, or Mongo would keep maintaining an
   index on a column no query can ever match again. */
console.log("");
console.log("[schema] indexes referencing stripped paths");
const stripped = ["personal", "gadData", "contact"];
const bad = [];
for (const [key] of schema.indexes()) {
  const fields = Object.keys(key);
  for (const field of fields) {
    if (stripped.some((b) => field === b || field.startsWith(`${b}.`))) {
      bad.push(field);
    }
  }
}
if (bad.length) failures++;
console.log(`  orphaned             ${bad.length ? bad.join(", ") : "none"}  ${bad.length ? "FAIL" : "OK"}`);

console.log("");
console.log(failures === 0
  ? "[schema] STATUS: OK - schema and data agree"
  : `[schema] STATUS: FAILED - ${failures} check(s) failed`);

await mongoose.disconnect().catch(() => {});
process.exit(failures === 0 ? 0 : 1);
