import "dotenv/config";
import mongoose from "mongoose";
import { blindIndexTokens, buildSearchIndex } from "../lib/identityVault.js";

await mongoose.connect(process.env.MONGODB_URI);
const profiles = mongoose.connection.db.collection("gemsprofiles");
const vault = mongoose.connection.db.collection("identityvaults");
const { decryptFields, PII_FIELDS } = await import("../lib/identityVault.js");

const target = await profiles.findOne({
  profileSearchIndex: { $not: { $size: 0 } },
  vaultRef: { $exists: true, $ne: null },
});

const v = await vault.findOne({ vaultRef: target.vaultRef });
const pii = decryptFields(v.fields, {
  dateFields: PII_FIELDS.dates,
  booleanFields: PII_FIELDS.booleans,
});

console.log("stored pii:", JSON.stringify({
  first_name: pii.first_name, middle_name: pii.middle_name, last_name: pii.last_name, email: pii.email,
}));
console.log("");
console.log("row profileSearchIndex :", target.profileSearchIndex);
console.log("");
console.log("rebuilt from pii       :", buildSearchIndex(pii));
console.log("");
console.log("blindIndexTokens(first):", blindIndexTokens(pii.first_name));
console.log("blindIndexTokens(last) :", blindIndexTokens(pii.last_name));

const rebuilt = buildSearchIndex(pii);
const row = target.profileSearchIndex || [];
console.log("");
console.log("rebuilt minus row      :", rebuilt.filter((d) => !row.includes(d)));
console.log("row minus rebuilt      :", row.filter((d) => !rebuilt.includes(d)));

await mongoose.disconnect();
