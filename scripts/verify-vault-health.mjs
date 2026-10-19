import "dotenv/config";
import mongoose from "mongoose";
import crypto from "node:crypto";

/* Confirms the vault-health route's probe logic works against the real vault.
 *
 * The route itself is Admin-guarded HTTP; this runs the same read and decrypt
 * so a coding error in the probe surfaces here rather than as a 503 in
 * production during a strip window. */

const {
  isVaultConfigured,
  isVaultKeyDerived,
  decryptFields,
  PII_FIELDS,
  CURRENT_KEY_VERSION,
} = await import("../lib/identityVault.js");

function keyFingerprint(raw) {
  if (!raw) return null;
  const value = String(raw).trim();
  let buf;
  if (/^[0-9a-fA-F]{64}$/.test(value)) buf = Buffer.from(value, "hex");
  else buf = Buffer.from(value, "base64");
  if (buf.length !== 32) return "INVALID-LENGTH";
  return crypto.createHash("sha256").update(buf).digest("hex").slice(0, 16);
}

const payload = {
  configured: isVaultConfigured(),
  derived: isVaultKeyDerived(),
  keyVersion: CURRENT_KEY_VERSION,
  fingerprint: keyFingerprint(process.env.PII_ENCRYPTION_KEY),
  previousKeySet: Boolean(process.env.PII_ENCRYPTION_KEY_PREVIOUS),
  nodeEnv: process.env.NODE_ENV || null,
  canDecrypt: null,
  sampled: 0,
};

await mongoose.connect(process.env.MONGODB_URI);
const vault = mongoose.connection.db.collection("identityvaults");

const rows = await vault
  .find({ "fields.first_name.v": { $exists: true } }, { projection: { fields: 1, key_version: 1 } })
  .limit(3)
  .toArray();

payload.sampled = rows.length;

let readable = 0;
for (const row of rows) {
  try {
    const pii = decryptFields(row.fields, {
      dateFields: PII_FIELDS.dates,
      booleanFields: PII_FIELDS.booleans,
    });
    if (pii && typeof pii.first_name === "string" && pii.first_name) readable += 1;
  } catch {
    /* counted by omission */
  }
}

payload.canDecrypt = rows.length > 0 && readable === rows.length;
payload.decrypted = readable;

const ok = payload.configured && !payload.derived && payload.canDecrypt === true;

console.log(JSON.stringify({ ok, ...payload }, null, 2));
console.log("");
console.log(ok ? "STATUS: OK — this process can read the vault." : "STATUS: NOT OK");

await mongoose.disconnect();
process.exit(ok ? 0 : 1);
