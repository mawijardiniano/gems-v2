import { test } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";

/*
 * Duplicate detection after the PII strip.
 *
 * Both checks used to read plaintext columns (`personal.first_name`,
 * `personal.last_name`, `personal.birthday`, `contact.email`). Those columns
 * are the strip's target, so the checks had to move onto the blind index —
 * and a filter that matches nothing is indistinguishable from "no duplicate",
 * which is the failure direction that matters: it waves through a second
 * record for a person who is already registered.
 *
 * lib/identityVault.js loads here (no mongoose), so the digest helpers are
 * exercised for real; the route is checked by reading its source.
 */

const KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
process.env.PII_ENCRYPTION_KEY = KEY;

const { buildSearchIndex, blindIndexTokens } = await import(
  "../lib/identityVault.js"
);

/* Mirrors searchIndexQuery in lib/profileBroker.js. */
function searchIndexQuery(term) {
  const tokens = blindIndexTokens(term);
  return tokens.length ? tokens : null;
}

function read(...parts) {
  return readFileSync(new URL(`../${parts.join("/")}`, import.meta.url), "utf8");
}

const ROUTE = read("app", "api", "profile", "route.js");

/* ---------------------------------------------------------------------------
   The digests themselves
   --------------------------------------------------------------------------- */

test("the index digest for a whole field is its first token", () => {
  /* The name check matches on `[0]`, the whole-field digest. That is only
     correct while `blindIndexTokens` puts the whole string first. */
  const multi = blindIndexTokens("Vic Ronel");
  assert.strictEqual(multi.length, 3, "whole + two tokens");
  assert.notStrictEqual(
    multi[0],
    blindIndexTokens("Vic")[0],
    "the whole-field digest must differ from a single-token digest",
  );

  const single = blindIndexTokens("Nabos");
  assert.strictEqual(single.length, 1);
});

test("the email is indexed whole, not split into local part and domain", () => {
  /* Splitting it would make every gmail.com registration collide. */
  const digests = buildSearchIndex({ email: "mcruz@example.ph" });
  assert.ok(
    digests.includes(blindIndexTokens("mcruz@example.ph")[0]),
    "the exact address must be answerable",
  );
  assert.ok(
    !digests.includes(blindIndexTokens("@example.ph")[0]),
    "the domain alone must not be indexed",
  );
});

test("an email digest does not collide with a name digest", () => {
  const withEmail = buildSearchIndex({ email: "a@b.com" });
  const withName = buildSearchIndex({ first_name: "a", last_name: "b" });
  for (const d of withEmail) {
    assert.ok(
      !withName.includes(d),
      "a domain-looking name must not answer an email lookup",
    );
  }
});

/* ---------------------------------------------------------------------------
   The query shapes
   --------------------------------------------------------------------------- */

test("the duplicate-name filter uses a flat $all, not a nested one", () => {
  /* The trap this test exists for: `$all: [[a], [b]]` asks the index to
     contain the ARRAY `[a]` as one of its elements. It never does, so the
     filter matched nothing and the check reported "no duplicate" for every
     registration. The flat form is the one that means "contains a and b". */
  const body = ROUTE.match(/\$all:\s*\[[^\]]*\]/g) || [];
  assert.ok(body.length > 0, "expected an $all filter on the blind index");

  for (const filter of body) {
    assert.ok(
      !/\[\s*\[/.test(filter),
      `a nested $all matches nothing: ${filter}`,
    );
  }
});

test("the duplicate checks no longer read the stripped columns", () => {
  /* These are the four columns the strip removes. A query against any of them
     is a check that silently stops working. */
  const stripped = [
    '"personal.first_name"',
    '"personal.last_name"',
    '"personal.birthday"',
    '"contact.email"',
  ];

  for (const column of stripped) {
    assert.ok(
      !ROUTE.includes(column),
      `duplicate detection still reads ${column}, which the strip removes`,
    );
  }
});

test("the name check falls through to the vault for the birthday", () => {
  /* The birthday is encrypted with a random IV, so equal dates never produce
     equal ciphertext: it cannot be matched in a query and has to be compared
     after decryption. If this call disappears, the check degrades to
     name-only and starts rejecting same-name different-person registrations. */
  assert.match(
    ROUTE,
    /findSameNameAndBirthday\s*\(/,
    "the birthday comparison must happen after decryption",
  );
  assert.match(
    ROUTE,
    /loadDecryptedPiiBatch\s*\(/,
    "the second factor is read from the vault",
  );
});

test("both duplicate checks go through the blind index", () => {
  /* The name check and the email check each need `searchIndexQuery`. Two call
     sites, or one of them is still on a plaintext column. */
  const calls = ROUTE.match(/searchIndexQuery\s*\(/g) || [];
  assert.ok(
    calls.length >= 3,
    `expected the name check (2 lookups) and the email check to use the index, found ${calls.length}`,
  );
});
