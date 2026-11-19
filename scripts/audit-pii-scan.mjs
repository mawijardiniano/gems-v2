import "dotenv/config";
import { registerHooks } from "node:module";
import { pathToFileURL, fileURLToPath } from "node:url";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

/*
 * READ-ONLY. Lists audit-log entries (activitylogs) whose text still carries
 * personal data, so a decision about redacting them can be made on facts.
 * Nothing is written to the database.
 *
 *   node scripts/audit-pii-scan.mjs
 *
 * Detectors, per entry (description, metadata and changes are all searched):
 *   name        a known person's "first last" or "last, first" appears.
 *               Names come from the vault (current people) and from staging
 *               records (which also covers people since deleted).
 *   template    a description written by an old template that embedded the
 *               name ("Profile created for <name>", "Edited staging record
 *               for <name>").
 *   pii_change  a `changes` entry for a vaulted field with a real from/to.
 *   pii_meta    a metadata key that is a vaulted field, with a value.
 *
 * Output: counts by detector and action, masked examples, and a JSON file of
 * matching entry ids in scripts/backups/ (gitignored) for a later decision.
 * Already-redacted entries are skipped.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..") + "/";
registerHooks({
  resolve(spec, ctx, next) {
    if (spec.startsWith("@/")) {
      let p = ROOT + spec.slice(2);
      if (!existsSync(p) && existsSync(p + ".js")) p += ".js";
      return next(pathToFileURL(p).href, ctx);
    }
    return next(spec, ctx);
  },
});

const { connectDB } = await import("@/data/lib/db");
const { loadDecryptedPiiBatch } = await import("@/data/lib/profileBroker");
const { PII_FIELDS } = await import("@/data/lib/identityVault");

const m = await connectDB();
const db = m.connection.db;
console.log(`[scan] database: ${db.databaseName} (read-only)`);

/* ── Known names ─────────────────────────────────────────────────────────── */
const clean = (s) => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
const names = new Set();
const addName = (first, last) => {
  const f = clean(first);
  const l = clean(last);
  if (f.length < 2 || l.length < 2) return;
  names.add(`${f} ${l}`);
  names.add(`${l}, ${f}`);
  names.add(`${l} ${f}`);
};

const refs = (
  await db.collection("gemsprofiles").find({ vaultRef: { $ne: null } }, { projection: { vaultRef: 1 } }).toArray()
).map((p) => p.vaultRef);
const pii = await loadDecryptedPiiBatch(refs, { fields: ["first_name", "last_name"] });
for (const v of pii.values()) addName(v.first_name, v.last_name);
const fromVault = pii.size;

let fromStaging = 0;
for await (const r of db.collection("stagingrecords").find(
  {},
  { projection: { "mapped_payload.personal.first_name": 1, "mapped_payload.personal.last_name": 1 } },
)) {
  const p = r.mapped_payload?.personal;
  if (p?.first_name && p?.last_name) {
    addName(p.first_name, p.last_name);
    fromStaging += 1;
  }
}
console.log(`[scan] names known: ${names.size / 3} (vault ${fromVault}, staging rows ${fromStaging})`);

/* Every 2- and 3-word window of the text, checked against the name set. */
function findName(text) {
  const words = clean(text).split(/[^a-zñ',.-]+/i).filter(Boolean);
  for (let i = 0; i < words.length; i++) {
    for (const n of [2, 3, 4]) {
      if (i + n > words.length) break;
      const cand = words.slice(i, i + n).join(" ").replace(/[.]$/, "");
      if (names.has(cand)) return cand;
    }
  }
  return null;
}

const PII_KEYS = new Set([...PII_FIELDS.strings, ...PII_FIELDS.dates, ...PII_FIELDS.booleans]);
const piiKeyOf = (field) => String(field || "").split(".").pop();
const TEMPLATES = [
  /^Profile created for (?!GEMS-|[0-9a-f]{24}\b)/,
  /^Edited staging record for /,
];

const mask = (s) => String(s).replace(/[A-Za-zÑñ]{2,}/g, (w) => w[0] + "*".repeat(w.length - 1));

/* ── Scan ────────────────────────────────────────────────────────────────── */
const byDetector = { name: 0, template: 0, pii_change: 0, pii_meta: 0 };
const byAction = {};
const examples = [];
const hits = [];
let scanned = 0;
let oldest = null;
let newest = null;

const cursor = db.collection("activitylogs").find(
  { redacted: { $ne: true } },
  { projection: { action: 1, description: 1, metadata: 1, changes: 1, createdAt: 1 } },
);
for await (const e of cursor) {
  scanned += 1;
  const found = [];

  const text = `${e.description || ""} ${JSON.stringify(e.metadata || {})} ${JSON.stringify(e.changes || [])}`;
  const name = findName(text);
  if (name) found.push("name");
  if (TEMPLATES.some((t) => t.test(e.description || ""))) found.push("template");
  if (
    Array.isArray(e.changes) &&
    e.changes.some(
      (c) => PII_KEYS.has(piiKeyOf(c?.field)) && !c?.redacted && (c?.from != null || c?.to != null),
    )
  ) found.push("pii_change");
  if (
    e.metadata &&
    typeof e.metadata === "object" &&
    Object.entries(e.metadata).some(([k, v]) => PII_KEYS.has(k) && v != null && v !== "")
  ) found.push("pii_meta");

  if (!found.length) continue;
  for (const d of found) byDetector[d] += 1;
  byAction[e.action] = (byAction[e.action] || 0) + 1;
  const at = e.createdAt ? new Date(e.createdAt) : null;
  if (at && (!oldest || at < oldest)) oldest = at;
  if (at && (!newest || at > newest)) newest = at;
  hits.push({ id: String(e._id), action: e.action, at, detectors: found });
  if (examples.length < 12) {
    examples.push(`${at?.toISOString().slice(0, 10)} ${e.action} [${found.join(",")}] ${mask((e.description || "").slice(0, 90))}`);
  }
}

console.log(`[scan] entries scanned: ${scanned}, with personal data: ${hits.length}`);
console.log(`[scan] date range of matches: ${oldest?.toISOString() || "-"} .. ${newest?.toISOString() || "-"}`);
console.log("[scan] by detector:", byDetector);
console.log("[scan] by action:", Object.fromEntries(Object.entries(byAction).sort((a, b) => b[1] - a[1])));
console.log("[scan] examples (names masked):");
for (const x of examples) console.log("   ", x);

const staging = await db.collection("stagingrecords").countDocuments({});
console.log(`[scan] note: stagingrecords holds ${staging} import rows with their raw payloads`);

const dir = path.join(ROOT, "scripts", "backups");
mkdirSync(dir, { recursive: true });
const file = path.join(dir, `audit-pii-scan-${db.databaseName}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
writeFileSync(file, JSON.stringify({ database: db.databaseName, scanned, hits }, null, 1));
console.log(`[scan] matching ids written to ${path.relative(ROOT, file)} (no names in it)`);
await m.disconnect();
