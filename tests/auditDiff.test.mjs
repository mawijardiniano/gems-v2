/* The diff is what makes the trail evidentiary rather than descriptive.
 *
 * An entry saying "GPB updated" cannot settle a dispute; one saying
 * `budget: 500000 -> 800000` can. That raises two failure modes worth pinning
 * down with tests, because both are silent:
 *
 *   1. False positives — a save that changed nothing still produces change
 *      rows, so the trail is noise and real changes are lost in it.
 *   2. PII leakage — a vaulted field's value is copied into a collection every
 *      Admin can read.
 *
 * diffFields is imported directly rather than through the route layer so the
 * behaviour is checked once, for all callers.
 */
import { test } from "node:test";
import assert from "node:assert";
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

/* lib/activityLog.js reaches for the Mongoose model via the project's "@/..."
   alias, which only Next's bundler resolves. Teach this process the same alias
   so the pure diff helper can be imported without a database.
   `registerHooks` is the synchronous form, which keeps the resolver in-process
   rather than loading a second module thread per test file. */
const ROOT = pathToFileURL(process.cwd() + "/").href;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const base = new URL(specifier.slice(2), ROOT);
      for (const candidate of [base.href, `${base.href}.js`, `${base.href}.mjs`, `${base.href}/index.js`]) {
        if (existsSync(fileURLToPath(candidate))) {
          return nextResolve(candidate, context);
        }
      }
    }
    return nextResolve(specifier, context);
  },
});

const { diffFields } = await import("../lib/activityLog.js");

test("records a changed field with before and after", () => {
  const changes = diffFields({ budget: 500000 }, { budget: 800000 }, ["budget"]);
  assert.deepEqual(changes, [
    { field: "budget", before: 500000, after: 800000, redacted: false },
  ]);
});

test("omits fields that did not change", () => {
  const changes = diffFields(
    { budget: 500000, status: "draft" },
    { budget: 500000, status: "draft" },
    ["budget", "status"],
  );
  assert.deepEqual(changes, []);
});

test("records a field added from nothing", () => {
  const changes = diffFields({}, { status: "approved" }, ["status"]);
  assert.deepEqual(changes, [
    { field: "status", before: null, after: "approved", redacted: false },
  ]);
});

test("records a field cleared to null", () => {
  const changes = diffFields({ status: "approved" }, { status: null }, ["status"]);
  assert.deepEqual(changes, [
    { field: "status", before: "approved", after: null, redacted: false },
  ]);
});

test("ignores fields absent from both sides", () => {
  /* Only fields the caller asked about are considered, and a field neither
     object holds was never touched by this update. */
  const changes = diffFields({ a: 1 }, { a: 2 }, ["a", "never_existed"]);
  assert.deepEqual(changes, [
    { field: "a", before: 1, after: 2, redacted: false },
  ]);
});

test("treats a Date and its ISO string as equal", () => {
  /* Documents round-trip through Mongo and lean()/toObject() differently. If
     these compared unequal, every save would log a phantom change. */
  const when = new Date("2026-01-15T00:00:00.000Z");
  const changes = diffFields(
    { appointedAt: when },
    { appointedAt: "2026-01-15T00:00:00.000Z" },
    ["appointedAt"],
  );
  assert.deepEqual(changes, []);
});

test("normalises a Date to an ISO string when it did change", () => {
  const changes = diffFields(
    { appointedAt: new Date("2026-01-15T00:00:00.000Z") },
    { appointedAt: new Date("2026-06-01T00:00:00.000Z") },
    ["appointedAt"],
  );
  assert.equal(changes[0].before, "2026-01-15T00:00:00.000Z");
  assert.equal(changes[0].after, "2026-06-01T00:00:00.000Z");
});

test("reads dotted paths", () => {
  const changes = diffFields(
    { value: { semester: "1st" } },
    { value: { semester: "2nd" } },
    ["value.semester"],
  );
  assert.deepEqual(changes, [
    { field: "value.semester", before: "1st", after: "2nd", redacted: false },
  ]);
});

test("compares arrays by content", () => {
  const same = diffFields({ tags: ["a", "b"] }, { tags: ["a", "b"] }, ["tags"]);
  assert.deepEqual(same, []);

  const changed = diffFields(
    { tags: ["a", "b"] },
    { tags: ["a", "c"] },
    ["tags"],
  );
  assert.equal(changed.length, 1);
  assert.deepEqual(changed[0].after, ["a", "c"]);
});

test("withholds the value of a redacted (vaulted) field", () => {
  const changes = diffFields(
    { birth_date: "1990-01-01" },
    { birth_date: "1991-02-02" },
    ["birth_date"],
    { redactedFields: ["birth_date"] },
  );
  assert.deepEqual(changes, [
    { field: "birth_date", before: "[vaulted]", after: "[vaulted]", redacted: true },
  ]);

  /* The guarantee that matters: the real values appear nowhere in the record. */
  const serialised = JSON.stringify(changes);
  assert.ok(!serialised.includes("1990"));
  assert.ok(!serialised.includes("1991"));
});

test("still reports a redacted field that did not change as unchanged", () => {
  /* Redaction must not turn every PII field into an always-changing one — an
     entry per save saying nothing happened is worse than no entry. */
  const changes = diffFields(
    { birth_date: "1990-01-01" },
    { birth_date: "1990-01-01" },
    ["birth_date"],
    { redactedFields: ["birth_date"] },
  );
  assert.deepEqual(changes, []);
});
