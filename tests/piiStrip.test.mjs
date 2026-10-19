import { test } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";

/*
 * The PII strip, guarded at the source level.
 *
 * The strip already ran against production, so there is no second chance to
 * get these right: `$unset` is not covered by git and a revert restores code,
 * not data. These tests pin the properties that made the strip safe, so a
 * later edit cannot quietly remove one:
 *
 *   1. The census field list must cover the vault's whole PII contract. The
 *      first version listed 14 of the 20 fields the vault owns. Those 6 turned
 *      out to be fully vaulted anyway, but the census could not have told us
 *      so - it simply was not looking. Deriving the list from PII_FIELDS is
 *      what makes coverage true by construction rather than by luck.
 *   2. The strip must refuse to delete without a backup, and must verify the
 *      vault holds at least as many rows as each column it deletes.
 *   3. The schema must not still declare the stripped blocks, or a future
 *      write could carry plaintext PII back in through a path the strip just
 *      emptied and the migration would silently undo itself.
 */

function read(...parts) {
  return readFileSync(new URL(`../${parts.join("/")}`, import.meta.url), "utf8");
}

const CENSUS = read("scripts", "census-strip-gap.mjs");
const STRIP = read("scripts", "strip-plaintext-pii.mjs");
const MODEL = read("models", "profile.js");
const VAULT = read("lib", "identityVault.js");

/* Pulls the field names out of PII_FIELDS, which is the vault's contract. */
function vaultFieldNames() {
  const block = VAULT.match(/export const PII_FIELDS = \{[\s\S]*?\n\};/)?.[0] || "";
  assert.ok(block, "PII_FIELDS must exist in lib/identityVault.js");
  return [...block.matchAll(/"([A-Za-z_]+)"/g)].map((m) => m[1]);
}

test("the census covers every field the vault owns", () => {
  /* The census reads plaintext from the three blocks. Any vault field that is
     not in the census is a field the strip would delete without checking for
     a counterpart - the exact failure this guards. */
  const fields = vaultFieldNames();
  assert.ok(fields.length >= 20, `expected the full vault contract, saw ${fields.length}`);

  const missing = fields.filter((name) => !CENSUS.includes(`"${name}"`));
  assert.deepStrictEqual(
    missing,
    [],
    `census is missing vault field(s): ${missing.join(", ")}`,
  );
});

test("the strip checks the same fields the census does", () => {
  /* A gap between the two would mean the census blesses a strip that then
     deletes something it never checked. */
  const fields = vaultFieldNames();
  const missing = fields.filter((name) => !STRIP.includes(`"${name}"`));
  assert.deepStrictEqual(
    missing,
    [],
    `strip is missing vault field(s): ${missing.join(", ")}`,
  );
});

test("the strip refuses to delete without a backup", () => {
test("the strip aborts when the vault holds fewer rows than the column", () => {
  /* Equal counts are the point: fewer in the vault means rows would lose a
     value the plaintext still has. */
  assert.match(STRIP, /populated > inVault/, "must compare counts");
  assert.match(STRIP, /ABORT: vault holds fewer rows/, "must abort on a shortfall");
});

test("the strip aborts when a field has no vault home at all", () => {
  assert.match(STRIP, /orphans\.push/, "must collect orphans");
  assert.match(STRIP, /ABORT: fields exist only in plaintext/, "must abort on orphans");
});

test("the strip only touches the three legacy blocks", () => {
  /* `affiliation` holds GEMS-owned organisational data and must survive. A
     BLOCKS list that grew to include it would delete student and employee
     records that the vault never held. */
  const blocks = STRIP.match(/const BLOCKS = \[([^\]]*)\]/)?.[1] || "";
  assert.ok(blocks.includes('"personal"'), "personal must be stripped");
  assert.ok(blocks.includes('"gadData"'), "gadData must be stripped");
  assert.ok(blocks.includes('"contact"'), "contact must be stripped");
  assert.ok(!blocks.includes("affiliation"), "affiliation must never be stripped");
  assert.ok(!blocks.includes("profileSearchIndex"), "the search index must survive");
});

test("the strip refuses to target what looks like production via --db", () => {
  /* The rehearsal path exists so the strip can be tried on a clone first. The
     name check is the only thing stopping a copy-paste from pointing the
     rehearsal at the live database. */
  assert.match(STRIP, /refusing --db/, "must reject a production-looking --db");
});

test("the model no longer declares the stripped blocks", () => {
  for (const block of ["personal", "gadData", "contact"]) {
    assert.doesNotMatch(
      MODEL,
      new RegExp(`^\\s*${block}:\\s*\\w+Schema,`, "m"),
      `models/profile.js must not declare ${block}`,
    );
  }
  assert.match(MODEL, /affiliation: affiliationSchema,/, "affiliation must remain");
});

test("the model defaults new profiles to vaulted", () => {
  /* With the plaintext blocks gone, a row that is not vaulted has no PII
     anywhere. "legacy" as a default would describe a state that cannot exist. */
  const status = MODEL.match(/migrationStatus: \{[\s\S]*?\n\s*\},/)?.[0] || "";
  assert.match(status, /default: "vaulted"/, "default must be vaulted");
  assert.doesNotMatch(status, /default: "legacy"/, "legacy default must be gone");
});

test("no schema index references a stripped path", () => {
  /* Mongo would keep maintaining an index on a column no query can ever match
     again, and a real orphan means a reader was missed. */
  const stripped = ["personal", "gadData", "contact"];
  const indexed = [...MODEL.matchAll(/gemsProfileSchema\.index\(\s*\{([^}]*)\}/g)]
    .map((m) => m[1])
    .join("\n");
  for (const block of stripped) {
    assert.ok(
      !indexed.includes(`"${block}.`),
      `an index still references ${block}, which no longer exists`,
    );
  }
});

  /* An $unset cannot be reverted with git. Refusing to run without a dump is
     the difference between a mistake and an incident. */
  assert.match(STRIP, /--apply requires --backup-to/, "must abort without a backup");

test("the writers mark profiles vaulted, not dual", () => {
  /* "dual" described writing to two places. There is one place now. */
  const profileRoute = read("app", "api", "profile", "route.js");
  const idRoute = read("app", "api", "profile", "[id]", "route.js");
  for (const source of [profileRoute, idRoute]) {
    assert.doesNotMatch(source, /migrationStatus: "dual"/, "dual writes must be gone");
    assert.match(source, /migrationStatus: "vaulted"/, "must record vaulted");
  }
});

test("the profile detail route no longer falls back to legacy plaintext", () => {
  /* The fallback read gem.personal / gem.gadData / gem.contact, which no
     longer exist. Left in place it would silently serve empty blocks. */
  const idRoute = read("app", "api", "profile", "[id]", "route.js");
  const applyCall = idRoute.match(/applyRowPii\(([\s\S]*?)\n\s*\),/)?.[1] || "";
  assert.ok(applyCall, "applyRowPii call must exist");
  assert.doesNotMatch(
    applyCall,
    /legacy:/,
    "the legacy fallback must be removed now the columns are gone",
  );
});

test("registration does not send the stripped blocks to the model", () => {
  /* Passing them would be ignored by Mongoose today, but it would also mean a
     strict-mode change could store plaintext PII again. */
  const profileRoute = read("app", "api", "profile", "route.js");
  for (const block of ["personal", "gadData", "contact"]) {
    assert.match(
      profileRoute,
      new RegExp(`delete profilePayload\\.${block};`),
      `registration must drop profilePayload.${block}`,
    );
  }
});

test("the vault keeps fields for every plaintext column that held data", () => {
  /* The census proved this against the real pre-strip data. This is the static
     half: the vault's contract must still name them, or a future strip would
     have nowhere to read them from. */
  const fields = vaultFieldNames();
  const required = [
    "religion",
    "religion_other",
    "pwd_type",
    "socioEconomicStatus",
    "headOfHousehold",
    "permanentAddress",
    "currentAddress",
  ];
  for (const name of required) {
    assert.ok(fields.includes(name), `vault must still own ${name}`);
  }
});

  assert.match(STRIP, /fs\.writeFileSync\(file/, "must actually write the backup");
});
