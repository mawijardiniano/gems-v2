/**
 * Wiring pins for the roster read-side leaks.
 *
 * `GET /api/profile/` used to return the raw `$lookup` document: the full
 * `personal` block in plaintext, plus `vaultRef` (a handle into the encrypted
 * vault) and `profileSearchIndex` (HMAC digests of every spelling of a name —
 * a small, offline-checkable name oracle). Both are unreadable by any client,
 * so both must be stripped for every role.
 *
 * The route talks to Mongo, so these are structural tests over the source plus
 * one behavioural test over the exported row shaper.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const read = (...parts) => readFileSync(join(here, "..", ...parts), "utf8");

const ROUTE = read("app", "api", "profile", "route.js");

/* ------------------------------------------------------------------ */
/* The vault bookkeeping never leaves the server                       */
/* ------------------------------------------------------------------ */

test("the roster drops vaultRef and profileSearchIndex for every role", () => {
  assert.match(
    ROUTE,
    /delete rest\.personal_info_id\.vaultRef/,
    "vaultRef is a handle into the encrypted vault",
  );
  assert.match(
    ROUTE,
    /delete rest\.personal_info_id\.profileSearchIndex/,
    "the search index is a brute-forceable digest of the name",
  );
  /* Neither delete may sit behind a role check: the digests are a name oracle
     for any role, so masking the identity is not sufficient on its own. */
  const shaper = ROUTE.match(/export function rosterRowForClient[\s\S]*?\n\}/);
  assert.ok(shaper, "the row shaper must exist");
  assert.doesNotMatch(
    shaper[0],
    /canViewPII|CAN_VIEW_PII_ROLES|role ===/,
    "the strip must not be conditional on the role",
  );
});

test("the roster routes identity through the broker, not the raw lookup", () => {
  assert.match(
    ROUTE,
    /resolvePiiBatch\(\{ vaultRefs, role \}\)/,
    "one batched vault read decides masked vs revealed",
  );
  assert.match(
    ROUTE,
    /rosterRowForClient\(u, resolvedByRef\)/,
    "every row goes through the shaper",
  );
  /* The old password-only map is what shipped the plaintext personal block. */
  assert.doesNotMatch(
    ROUTE,
    /const \{ password, \.\.\.rest \} = u;\s*\n\s*return rest;/,
    "the password-only strip must be gone",
  );
});

test("the batch resolve is one vault query, not one per row", () => {
  assert.match(
    ROUTE,
    /const vaultRefs = filteredUsers[\s\S]*?\.filter\(Boolean\)/,
    "refs are collected before the batch call",
  );
  assert.match(
    ROUTE,
    /vaultRefs\.length\s*\?\s*await resolvePiiBatch/,
    "an empty page must not query the vault at all",
  );
});

test("the row shaper does not fall back to the legacy block", () => {
  /* The reverse of this test's earlier form, which required `/legacy/` to be
     present so a row without a vault entry would "still render". After the
     strip there is no plaintext block to render from, and the construct was
     also a masked-row leak. The property is now the opposite: the shaper must
     route every row through the broker and never read a stripped block. */
  const shaper =
    ROUTE.match(/export function rosterRowForClient[\s\S]*?\n\}/)?.[0] || "";
  assert.ok(shaper, "rosterRowForClient must exist");
  /* Matches the construct, not the word: the explanatory comment legitimately
     uses "legacy" several times, and a bare /legacy/ would fail on prose. */
  assert.doesNotMatch(
    shaper,
    /^\s*const legacy\s*=/m,
    "no legacy plaintext fallback may remain",
  );
  assert.doesNotMatch(
    shaper,
    /profile\.(personal|gadData|contact)\s*\|\|/,
    "no stripped block may be read as a fallback",
  );
  assert.match(
    shaper,
    /applyRowPii/,
    "identity is merged by the broker, which preserves GEMS-owned fields",
  );
});

/* ------------------------------------------------------------------ */
/* Behavioural: the shaper never emits a leak                          */
/* ------------------------------------------------------------------ */

process.env.PII_ENCRYPTION_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

/* Mirrors `resolvePiiBatch` + `rosterRowForClient` + `applyRowPii` without
   loading mongoose. `role` decides masked vs revealed, exactly as the broker
   does, so the mirror cannot accidentally reproduce a revealed shape. */
function initialsOf(value) {
  return value ? String(value)[0].toUpperCase() : null;
}

function maskRow(pii) {
  return {
    personal: {
      first_name: initialsOf(pii.first_name),
      middle_name: null,
      last_name: initialsOf(pii.last_name),
      birthday: null,
    },
    gadData: {
      sexAtBirth: pii.sexAtBirth || null,
      isPWD: pii.isPWD ?? null,
      isIndigenousPerson: pii.isIndigenousPerson ?? null,
      gender_preference: null,
    },
    contact: { email: null, mobileNumber: null },
    displayName: `${initialsOf(pii.first_name)}*** ${initialsOf(pii.last_name)}***`,
    masked: true,
  };
}

/* Mirrors the route's `gemsOwnedPersonal`: only these keys of the legacy
   block may seed the merge base. */
const GEMS_OWNED_PERSONAL_FIELDS = ["currentStatus"];

function gemsOwnedPersonal(personal) {
  if (!personal) return {};
  const out = {};
  for (const key of GEMS_OWNED_PERSONAL_FIELDS) {
    if (personal[key] !== undefined) out[key] = personal[key];
  }
  return out;
}

function shapeRow(user, resolvedByRef) {
  const { password: _password, ...rest } = user;
  const profile = rest.personal_info_id;
  if (profile) {
    const ref = profile.vaultRef;
    const resolved = ref ? resolvedByRef?.get(String(ref)) || null : null;

    /* No legacy fallback: mirrors the route, which dropped it. Reading the
       stripped blocks here would make every behavioural test below assert
       against behaviour the route no longer has. */
    const chosen = resolved;
    const personal = { ...gemsOwnedPersonal(profile.personal), ...(chosen?.personal || {}) };
    const currentStatus = profile.personal?.currentStatus;
    if (currentStatus !== undefined) personal.currentStatus = currentStatus;

    rest.personal_info_id = {
      ...profile,
      personal,
      gadData: { ...(chosen?.gadData || {}) },
      displayName: chosen?.displayName,
      masked: chosen?.masked ?? false,
    };
    if (chosen?.contact) rest.personal_info_id.contact = { ...chosen.contact };
    else delete rest.personal_info_id.contact;

    delete rest.personal_info_id.vaultRef;
    delete rest.personal_info_id.profileSearchIndex;
  }
  return rest;
}

const PII = {
  first_name: "MarkLouisse",
  last_name: "Jardiniano",
  sexAtBirth: "Male",
  isPWD: false,
};

const ROW = {
  _id: "user-1",
  username: "25b1895",
  password: "$2a$10$hash",
  school_year: "2025-2026",
  semester: "1st",
  personal_info_id: {
    _id: "prof-1",
    vaultRef: "11111111-2222-3333-4444-555555555555",
    profileSearchIndex: ["deadbeef01", "deadbeef02"],
    gemsPublicId: "GEMS-A3F9C2",
    personal: {
      first_name: "MarkLouisse",
      last_name: "Jardiniano",
      currentStatus: "Student",
      /* The four fields `maskedRowPii` does NOT emit. They sat in the merge base
         in plaintext, so a masked row leaked them until the shaper stopped
         seeding the merge with the legacy block. */
      civil_status: "Single",
      nationality: "Filipino",
      bloodType: "O+",
      religion_other: "Iglesia ni Cristo",
      birthday: "1998-04-17",
    },
    gadData: { sexAtBirth: "Male", isPWD: false },
    affiliation: { academic_information: { college: "CCS", course: "BSIT" } },
    contact: { email: "mark@example.com", mobileNumber: "09171234567" },
  },
};

test("a roster row never carries vaultRef or the search digests", () => {
  const row = shapeRow(ROW, new Map());

  assert.strictEqual(row.personal_info_id.vaultRef, undefined);
  assert.strictEqual(row.personal_info_id.profileSearchIndex, undefined);

  const flat = JSON.stringify(row);
  assert.ok(!flat.includes("11111111-2222"), "the vault ref leaked");
  assert.ok(!flat.includes("deadbeef"), "a search digest leaked");
  assert.ok(!flat.includes("$2a$10$hash"), "the password hash leaked");
});

test("a roster row keeps the GEMS-owned fields the list screen reads", () => {
  const row = shapeRow(ROW, new Map());

  assert.strictEqual(row.personal_info_id.personal.currentStatus, "Student");
  assert.strictEqual(
    row.personal_info_id.affiliation.academic_information.college,
    "CCS",
  );
  assert.strictEqual(row.school_year, "2025-2026");
  assert.strictEqual(row.personal_info_id.gemsPublicId, "GEMS-A3F9C2");
});

test("a masked roster row exposes initials, never the name or contact", () => {
  const resolved = new Map([[ROW.personal_info_id.vaultRef, maskRow(PII)]]);
  const row = shapeRow(ROW, resolved);

  assert.strictEqual(row.personal_info_id.personal.first_name, "M");
  assert.strictEqual(row.personal_info_id.personal.last_name, "J");
  assert.strictEqual(row.personal_info_id.masked, true);
  assert.strictEqual(row.personal_info_id.displayName, "M*** J***");

  const flat = JSON.stringify(row);
  ["MarkLouisse", "Jardiniano", "mark@example.com", "09171234567"].forEach(
    (leak) => assert.ok(!flat.includes(leak), `row leaked "${leak}"`),
  );
});

test("the masked shape never re-introduces the legacy plaintext block", () => {
  /* The trap: seeding the merge base with the legacy `personal` block put back
     every key the masked shape omits. `maskedRowPii` returns only the initials
     and a null birthday, so `civil_status`, `nationality`, `bloodType` and
     `religion_other` used to survive into a masked row. */
  const resolved = new Map([[ROW.personal_info_id.vaultRef, maskRow(PII)]]);
  const row = shapeRow(ROW, resolved);
  const personal = row.personal_info_id.personal;

  assert.notStrictEqual(personal.first_name, "MarkLouisse");
  assert.notStrictEqual(personal.last_name, "Jardiniano");

  /* Every field the masked shape does not return must be absent, not null —
     an merged leftover is exactly the leak. */
  [
    "civil_status",
    "nationality",
    "bloodType",
    "religion_other",
    "birthday",
  ].forEach((field) =>
    assert.ok(
      !(field in personal) || personal[field] == null,
      `masked row still carries legacy ${field}: ${JSON.stringify(personal[field])}`,
    ),
  );

  const flat = JSON.stringify(row);
  [
    "Single",
    "Filipino",
    "O+",
    "Iglesia ni Cristo",
    "1998-04-17",
  ].forEach((leak) =>
    assert.ok(!flat.includes(leak), `masked row leaked "${leak}"`),
  );
});

test("a resolved row does not use the legacy block as a merge base", () => {
  /* This used to assert the shape `/resolved ? null/` - i.e. that the fallback
     variable was built but nulled for resolved rows. That pinned the
     implementation, not the property: the fallback has since been deleted
     outright, and the old regex failed on code that is strictly safer than
     what it demanded.

     The property is that no plaintext block reaches the broker as a merge
     base, for ANY row. Asserting that directly also covers the unresolved
     case, which the old shape-based check never did - and that unresolved case
     was a real masked-row leak. */
  const shaper = ROUTE.match(/export function rosterRowForClient[\s\S]*?\n\}/)?.[0] || "";
  assert.ok(shaper, "rosterRowForClient must exist");

  assert.doesNotMatch(
    shaper,
    /legacy:/,
    "the broker must not be handed a legacy fallback at all",
  );
  assert.doesNotMatch(
    shaper,
    /profile\.(personal|gadData|contact)\s*\|\|/,
    "no stripped block may be read as a fallback",
  );
  assert.match(
    shaper,
    /gemsOwnedPersonal\(profile\.personal\)/,
    "the merge base must be narrowed to the GEMS-owned fields",
  );
});

/* Option B: the two authorized roles (Admin, GAD Focal Person) keep the full
   identity. The roster's revealed shape must therefore return every field
   `revealProfilePii` does — the merge base no longer carries plaintext, so
   anything missing from that shape is silently lost. */
const REVEALED_PII = {
  first_name: "MarkLouisse",
  middle_name: "Dela",
  last_name: "Jardiniano",
  birthday: "1998-04-17",
  civil_status: "Single",
  religion: "Roman Catholic",
  religion_other: "Iglesia ni Cristo",
  nationality: "Filipino",
  bloodType: "O+",
  headOfHousehold: "MarkLouisse Jardiniano",
  sexAtBirth: "Male",
  isPWD: false,
  email: "mark@example.com",
  mobileNumber: "09171234567",
};

/* Mirrors `revealProfilePii` from the broker. */
function revealRow(pii) {
  return {
    personal: {
      first_name: pii.first_name || null,
      middle_name: pii.middle_name || null,
      last_name: pii.last_name || null,
      birthday: pii.birthday || null,
      civil_status: pii.civil_status || null,
      religion: pii.religion || null,
      religion_other: pii.religion_other || null,
      nationality: pii.nationality || null,
      bloodType: pii.bloodType || null,
      headOfHousehold: pii.headOfHousehold || null,
    },
    gadData: {
      sexAtBirth: pii.sexAtBirth || null,
      gender_preference: null,
      isPWD: pii.isPWD ?? null,
      pwd_type: null,
      isIndigenousPerson: null,
      socioEconomicStatus: null,
    },
    contact: {
      email: pii.email || null,
      mobileNumber: pii.mobileNumber || null,
      permanentAddress: null,
      currentAddress: null,
    },
    displayName: `${pii.first_name} ${pii.last_name}`,
    masked: false,
  };
}

test("an authorized role keeps every revealed field on a roster row", () => {
  const resolved = new Map([[ROW.personal_info_id.vaultRef, revealRow(REVEALED_PII)]]);
  const row = shapeRow(ROW, resolved);
  const personal = row.personal_info_id.personal;

  assert.strictEqual(row.personal_info_id.masked, false);

  /* Presence-based: a null is a legitimately empty value, an absent key is lost
     data. This is the check that catches a narrowed merge base dropping fields. */
  [
    "first_name",
    "middle_name",
    "last_name",
    "birthday",
    "civil_status",
    "religion",
    "religion_other",
    "nationality",
    "bloodType",
    "headOfHousehold",
  ].forEach((field) =>
    assert.ok(field in personal, `authorized role lost personal.${field}`),
  );

  assert.strictEqual(personal.first_name, "MarkLouisse");
  assert.strictEqual(personal.religion_other, "Iglesia ni Cristo");
  assert.strictEqual(personal.bloodType, "O+");
  assert.strictEqual(personal.headOfHousehold, "MarkLouisse Jardiniano");
  assert.strictEqual(row.personal_info_id.contact.email, "mark@example.com");
  assert.strictEqual(row.personal_info_id.contact.mobileNumber, "09171234567");
});

test("the revealed row shape returns every field the single-row shape does", () => {
  /* `revealProfilePii` is the single-profile path; `revealedRowPii` is the
     roster path. They must agree, or a role-gated screen loses fields on one
     and not the other. */
  const BROKER = read("lib", "profileBroker.js");
  const shape = (name) =>
    BROKER.match(new RegExp(`export function ${name}[\\s\\S]*?\\n\\}`))?.[0] || "";

  const single = shape("revealProfilePii");
  const roster = shape("revealedRowPii");
  assert.ok(single && roster, "both reveal shapes must exist");

  ["religion_other", "bloodType", "headOfHousehold"].forEach((field) => {
    assert.match(
      roster,
      new RegExp(`${field}:`),
      `revealedRowPii must return ${field}, as revealProfilePii does`,
    );
  });
});

test("Option B keeps reveal limited to the two authorized roles", () => {
  const BROKER = read("lib", "profileBroker.js");
  assert.match(
    BROKER,
    /export const CAN_VIEW_PII_ROLES = \["Admin", "GAD Focal Person"\]/,
    "the authorized set is exactly these two roles",
  );
  assert.match(
    BROKER,
    /revealForced\(\) \|\| canViewPII\(role\)/,
    "reveal is role-gated, so a Dean stays masked",
  );
  /* The roster must pass the caller's role through to the batch resolve. */
  assert.match(
    ROUTE,
    /resolvePiiBatch\(\{ vaultRefs, role \}\)/,
    "the roster must pass the role so an authorized caller is revealed",
  );
});

test("a row with no vault entry renders identifiers only, never plaintext", () => {
  /* The inverse of this test's earlier form, which required the plaintext block
     to be served when the vault could not answer. That was the masked-row leak:
     `personal.first_name` came straight off the stripped block, bypassing the
     broker. Now such a row renders without identity, which is the honest
     result for a row holding none - and the GEMS-owned field survives, because
     that field is not PII and the vault never held it. */
  const legacyOnly = {
    ...ROW,
    personal_info_id: { ...ROW.personal_info_id, vaultRef: null },
  };
  const row = shapeRow(legacyOnly, new Map());

  assert.strictEqual(
    row.personal_info_id.personal.first_name,
    undefined,
    "a stripped block must not supply a name",
  );
  assert.strictEqual(
    row.personal_info_id.personal.currentStatus,
    "Student",
    "the GEMS-owned field is not PII and must survive",
  );
  assert.strictEqual(row.personal_info_id.vaultRef, undefined);
});

