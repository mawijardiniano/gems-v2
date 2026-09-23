import { test } from "node:test";
import assert from "node:assert";

// Pure helpers for GPB project reference numbers — no DB or network required,
// so we can exercise the real implementations directly.
import {
  REF_NUMBER_PREFIX,
  formatRefNumber,
  parseRefNumber,
  normalizeRefNumber,
  highestSequenceForYear,
  nextRefNumber,
  EVENT_TYPE_PREFIXES,
  formatEventRefNumber,
  parseEventRefNumber,
  eventYearFromDate,
  highestEventSequence,
  nextEventRefNumber,
} from "../lib/referenceNumber.js";

test("REF_NUMBER_PREFIX is GPB", () => {
  assert.strictEqual(REF_NUMBER_PREFIX, "GPB");
});

test("formatRefNumber builds GPB-<year>-<seq> with 3-digit padding", () => {
  assert.strictEqual(formatRefNumber(2025, 1), "GPB-2025-001");
  assert.strictEqual(formatRefNumber(2025, 12), "GPB-2025-012");
  assert.strictEqual(formatRefNumber("2024", 123), "GPB-2024-123");
});

test("formatRefNumber keeps numbers above 999 unclipped", () => {
  assert.strictEqual(formatRefNumber(2025, 1000), "GPB-2025-1000");
});

test("formatRefNumber returns an empty string for invalid input", () => {
  assert.strictEqual(formatRefNumber(undefined, 1), "");
  assert.strictEqual(formatRefNumber("not-a-year", 1), "");
  assert.strictEqual(formatRefNumber(2025, 0), "");
  assert.strictEqual(formatRefNumber(2025, null), "");
});

test("parseRefNumber round-trips formatted numbers", () => {
  assert.deepStrictEqual(parseRefNumber("GPB-2025-001"), {
    year: 2025,
    sequence: 1,
  });
  assert.deepStrictEqual(parseRefNumber("gpb-2024-010"), {
    year: 2024,
    sequence: 10,
  });
});

test("parseRefNumber rejects malformed values", () => {
  assert.strictEqual(parseRefNumber(""), null);
  assert.strictEqual(parseRefNumber(null), null);
  assert.strictEqual(parseRefNumber("2025-001"), null);
  assert.strictEqual(parseRefNumber("GPB-25-1"), null);
  assert.strictEqual(parseRefNumber("GPB-2025-"), null);
});

test("normalizeRefNumber trims and handles empty input", () => {
  assert.strictEqual(normalizeRefNumber("  GPB-2025-001 "), "GPB-2025-001");
  assert.strictEqual(normalizeRefNumber(null), "");
  assert.strictEqual(normalizeRefNumber(undefined), "");
});

test("highestSequenceForYear ignores other years and invalid values", () => {
  const refs = ["GPB-2025-001", "GPB-2025-004", "GPB-2024-009", null, "manual"];

  assert.strictEqual(highestSequenceForYear(refs, 2025), 4);
  assert.strictEqual(highestSequenceForYear(refs, 2024), 9);
  assert.strictEqual(highestSequenceForYear(refs, 2026), 0);
  assert.strictEqual(highestSequenceForYear(null, 2025), 0);
});

test("nextRefNumber starts at 001 and continues after the highest used", () => {
  assert.strictEqual(nextRefNumber(2025, []), "GPB-2025-001");
  assert.strictEqual(nextRefNumber(2025, ["GPB-2025-001"]), "GPB-2025-002");
  assert.strictEqual(
    nextRefNumber(2025, ["GPB-2025-001", "GPB-2025-003"]),
    "GPB-2025-004",
  );
  // A number from another year must not affect the sequence.
  assert.strictEqual(nextRefNumber(2026, ["GPB-2025-010"]), "GPB-2026-001");
});

/* ── Event reference numbers ─────────────────────────────────────────────── */

test("EVENT_TYPE_PREFIXES covers every type of activity", () => {
  assert.deepStrictEqual(Object.keys(EVENT_TYPE_PREFIXES).sort(), [
    "Academic",
    "Administrative",
    "Extension",
    "GAD",
    "Others",
    "Research",
    "Students",
  ]);
  assert.strictEqual(EVENT_TYPE_PREFIXES.GAD, "GAD");
});

test("formatEventRefNumber embeds the activity prefix, year and sequence", () => {
  assert.strictEqual(formatEventRefNumber("GAD", 2025, 1), "GAD-2025-001");
  assert.strictEqual(formatEventRefNumber("Academic", 2025, 12), "ACA-2025-012");
  assert.strictEqual(
    formatEventRefNumber("Administrative", "2024", 7),
    "ADM-2024-007",
  );
});

test("formatEventRefNumber rejects unknown types and invalid numbers", () => {
  assert.strictEqual(formatEventRefNumber("Unknown", 2025, 1), "");
  assert.strictEqual(formatEventRefNumber("", 2025, 1), "");
  assert.strictEqual(formatEventRefNumber("GAD", "not-a-year", 1), "");
  assert.strictEqual(formatEventRefNumber("GAD", 2025, 0), "");
});

test("eventYearFromDate reads the year from the event start date", () => {
  assert.strictEqual(eventYearFromDate("2025-03-14T08:00:00.000Z"), 2025);
  assert.strictEqual(eventYearFromDate(new Date("2026-01-02T00:00:00Z")), 2026);
  assert.strictEqual(eventYearFromDate("not-a-date"), null);
});

test("parseEventRefNumber round-trips formatted event numbers", () => {
  assert.deepStrictEqual(parseEventRefNumber("GAD-2025-001"), {
    prefix: "GAD",
    year: 2025,
    sequence: 1,
  });
  assert.deepStrictEqual(parseEventRefNumber("ACA-2024-010"), {
    prefix: "ACA",
    year: 2024,
    sequence: 10,
  });
});

test("parseEventRefNumber rejects malformed values", () => {
  assert.strictEqual(parseEventRefNumber(""), null);
  assert.strictEqual(parseEventRefNumber(null), null);
  assert.strictEqual(parseEventRefNumber("GPB-2025-001"), null);
  assert.strictEqual(parseEventRefNumber("GAD-2025-"), null);
});

test("highestEventSequence only counts the same type and year", () => {
  const refs = ["GAD-2025-001", "GAD-2025-004", "ACA-2025-009", "GAD-2024-002"];

  assert.strictEqual(highestEventSequence(refs, "GAD", 2025), 4);
  assert.strictEqual(highestEventSequence(refs, "Academic", 2025), 9);
  assert.strictEqual(highestEventSequence(refs, "GAD", 2024), 2);
  assert.strictEqual(highestEventSequence(refs, "GAD", 2026), 0);
  assert.strictEqual(highestEventSequence(refs, "Unknown", 2025), 0);
});

test("nextEventRefNumber keeps a separate counter per type of activity", () => {
  assert.strictEqual(nextEventRefNumber("GAD", 2025, []), "GAD-2025-001");
  assert.strictEqual(
    nextEventRefNumber("GAD", 2025, ["GAD-2025-001", "GAD-2025-002"]),
    "GAD-2025-003",
  );
  // Other activity types and other years must not affect the sequence.
  assert.strictEqual(
    nextEventRefNumber("GAD", 2025, ["ACA-2025-050", "GAD-2024-009"]),
    "GAD-2025-001",
  );
});
