import { test } from "node:test";
import assert from "node:assert";

import {
  ayToGpbYear,
  currentAcademicYear,
  gpbYearToAY,
  isAcademicYear,
  normalizeAcademicYear,
  resolveAcademicYear,
  sortAcademicYearsDesc,
} from "../lib/academicYear.js";

test("normalizeAcademicYear accepts YYYY-YYYY and rejects bad input", () => {
  assert.strictEqual(normalizeAcademicYear("2025-2026"), "2025-2026");
  assert.strictEqual(normalizeAcademicYear(" 2025-2026 "), "2025-2026");
  assert.strictEqual(normalizeAcademicYear("2025-2027"), null);
  assert.strictEqual(normalizeAcademicYear("2025"), null);
  assert.strictEqual(normalizeAcademicYear(""), null);
  assert.strictEqual(normalizeAcademicYear(null), null);
});

test("isAcademicYear flags valid years", () => {
  assert.strictEqual(isAcademicYear("2024-2025"), true);
  assert.strictEqual(isAcademicYear("nope"), false);
});

test("currentAcademicYear follows the August cut-off", () => {
  assert.strictEqual(currentAcademicYear(new Date(2026, 7, 1)), "2026-2027");
  assert.strictEqual(currentAcademicYear(new Date(2026, 6, 31)), "2025-2026");
});

test("GPB year bridges convert both ways", () => {
  assert.strictEqual(gpbYearToAY(2025), "2025-2026");
  assert.strictEqual(gpbYearToAY("bad"), null);
  assert.strictEqual(ayToGpbYear("2025-2026"), 2025);
  assert.strictEqual(ayToGpbYear("bad"), null);
});

test("resolveAcademicYear prefers query, then active term, then computed", () => {
  assert.strictEqual(
    resolveAcademicYear({ query: "2024-2025", activeTerm: "2025-2026" }),
    "2024-2025",
  );
  assert.strictEqual(
    resolveAcademicYear({ query: "bad", activeTerm: "2025-2026" }),
    "2025-2026",
  );
  assert.ok(resolveAcademicYear({}).match(/^\d{4}-\d{4}$/));
});

test("sortAcademicYearsDesc dedupes and orders newest-first", () => {
  assert.deepStrictEqual(
    sortAcademicYearsDesc(["2024-2025", "2026-2027", "2025-2026", "bad", "2025-2026"]),
    ["2026-2027", "2025-2026", "2024-2025"],
  );
});
