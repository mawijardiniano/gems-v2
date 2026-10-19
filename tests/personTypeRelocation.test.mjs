import { test } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";

/*
 * The student/employee discriminator, and the trap it sits on.
 *
 * `personal.currentStatus` used to be the only home for this value. It is a
 * GEMS-owned identifier, not identity data, so the vault never held it — but
 * it lived inside the `personal` block, which the PII strip deletes wholesale.
 * It moved to `affiliation.person_type`, and during the transition both paths
 * are kept in step.
 *
 * The failure mode this file exists for is silent, not loud. A reader that
 * loses the status does not crash: it counts zero students, renders an empty
 * "Status" chip, or pages out every search result. Nothing warns.
 *
 * lib/profileBroker.js imports mongoose, so it cannot be loaded in a bare node
 * test. As the other broker tests do, the resolution rule is mirrored here and
 * the real function is checked by reading its source — if the two ever drift,
 * these tests are the alarm.
 */

function read(...parts) {
  return readFileSync(new URL(`../${parts.join("/")}`, import.meta.url), "utf8");
}

const BROKER = read("lib", "profileBroker.js");

/* Mirrors the status resolution in `applyRowPii`. */
function resolvePersonType(row, legacy) {
  return (
    row?.affiliation?.person_type ??
    row?.personal?.currentStatus ??
    legacy?.personal?.currentStatus
  );
}

test("the broker resolves the status from the affiliation block first", () => {
  /* The rule the mirror above encodes has to be the rule the broker
     implements, or these tests guard nothing. */
  const body = BROKER.match(/export function applyRowPii[\s\S]*?\n\}/)?.[0] || "";

  assert.ok(body, "applyRowPii must exist");
  assert.match(
    body,
    /row\.affiliation\?\.person_type/,
    "the affiliation path is the durable one and must be read first",
  );
  assert.match(
    body,
    /row\.personal\?\.currentStatus/,
    "the legacy path must still be read for rows the backfill missed",
  );
  assert.match(
    body,
    /legacy\?\.personal\?\.currentStatus/,
    "the vault-less fallback must carry the status too",
  );
});

test("the affiliation status is written to both paths on the merged row", () => {
  const body = BROKER.match(/export function applyRowPii[\s\S]*?\n\}/)?.[0] || "";

  assert.match(
    body,
    /personal\.currentStatus = personType/,
    "the legacy path is mirrored so client components keep working",
  );
  assert.match(
    body,
    /person_type: personType/,
    "the affiliation path is rebuilt so the durable copy survives",
  );
});

test("the affiliation path wins over a stale legacy copy", () => {
  const row = {
    affiliation: { person_type: "Employee" },
    personal: { currentStatus: "Student" },
  };
  assert.strictEqual(resolvePersonType(row, null), "Employee");
});

test("a row with only the legacy path still resolves a status", () => {
  const row = { personal: { currentStatus: "Student" } };
  assert.strictEqual(resolvePersonType(row, null), "Student");
});

test("the vault-less fallback carries the status", () => {
  const legacy = { personal: { currentStatus: "Student" } };
  assert.strictEqual(resolvePersonType({}, legacy), "Student");
});

test("a row with no status anywhere resolves to undefined, not a guess", () => {
  /* Inventing a person type for a real person is worse than an empty one. */
  assert.strictEqual(resolvePersonType({}, null), undefined);
});


/* ---------------------------------------------------------------------------
   The write side.
   --------------------------------------------------------------------------- */

test("the model keeps the two paths in step on every save", () => {
  /* The sync hook is what makes ~30 call sites safe: the registration and
     profile-edit forms post `personal.currentStatus`, the reports read
     `affiliation.person_type`, and nothing in between has to remember both. */
  const model = read("models", "profile.js");

  assert.match(
    model,
    /gemsProfileSchema\.pre\(\s*"validate"/,
    "the sync must run before validation, so it can satisfy the required rule",
  );
  assert.match(
    model,
    /this\.affiliation\.person_type = resolved/,
    "a legacy-only write must be promoted onto the affiliation block",
  );
  assert.match(
    model,
    /this\.personal\.currentStatus = resolved/,
    "an affiliation-only write must be mirrored back for legacy readers",
  );
});

test("person_type is required and restricted to the two values", () => {
  /* Same guard as `currentStatus` had, so the strip does not quietly drop a
     validation rule with the column. */
  const schema = read("models", "affiliation.js");

  assert.match(schema, /person_type:\s*\{/, "the field must be declared");
  assert.match(schema, /enum:\s*\[\s*"Student",\s*"Employee"\s*\]/);
  assert.match(schema, /required:\s*true/);
});

test("the affiliation sub-documents key off person_type", () => {
  /* These `required` functions referenced `person_type` before it existed, so
     they were inert. Declaring the field switched them back on; this pins
     that they still point at it. */
  const schema = read("models", "affiliation.js");

  assert.match(
    schema,
    /return this\.person_type === "Student"/,
    "academic_information must be required of a Student",
  );
  assert.match(
    schema,
    /return this\.person_type === "Employee"/,
    "employment_information must be required of an Employee",
  );
});

test("every applyRowPii caller hands in the affiliation block", () => {
  /* The silent trap. `applyRowPii` can resolve `person_type` only from the row
     it is given, and a caller that omits `affiliation` gets an empty status
     with no error — the row still renders, the number is just wrong. A source
     check is the only way to see a caller's omission. */
  const files = [
    ["app", "api", "analytics", "dashboard", "route.js"],
    ["app", "api", "analytics", "gender-statistics", "route.js"],
    ["app", "api", "profile", "list", "route.js"],
    ["app", "api", "profile", "search", "route.js"],
    ["app", "api", "profile", "[id]", "route.js"],
    ["app", "api", "profile", "route.js"],
  ];

  const missing = [];

  for (const parts of files) {
    const src = read(...parts);
    /* Each call is `applyRowPii(` followed by its merge-base object. The
       literal's own closing brace is the first `}` at the start of a line. */
    const re = /applyRowPii\(\s*\{([\s\S]*?)\n\s*\}/g;
    let m;
    let found = false;
    while ((m = re.exec(src))) {
      found = true;
      const base = m[1];
      /* A merge base that spreads the whole profile document already carries
         `affiliation`, so it satisfies the contract without naming it — this
         is the shape `rosterRowForClient` uses. */
      const spreadsWholeDoc = /\.\.\.\s*profile\b/.test(base);
      if (!/\baffiliation\b/.test(base) && !spreadsWholeDoc) {
        const line = src.slice(0, m.index).split("\n").length;
        missing.push(`${parts.join("/")}:${line}`);
      }
    }
    assert.ok(found, `expected an applyRowPii call in ${parts.join("/")}`);
  }

  assert.deepStrictEqual(
    missing,
    [],
    "these applyRowPii calls omit `affiliation`, so the status reads empty",
  );
});

test("the integration mapper writes person_type on the affiliation block", () => {
  const src = read("app", "api", "integration", "_utils", "mapping.js");

  assert.match(
    src,
    /person_type:\s*currentStatus/,
    "an imported record must land with a person_type, or it fails validation",
  );
});
