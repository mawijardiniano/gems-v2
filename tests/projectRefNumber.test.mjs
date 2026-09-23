import { test } from "node:test";
import assert from "node:assert";

// Pure helpers for the project-module reference numbers (Research & Extension,
// Academic) — no DB or network required, so we exercise the real
// implementations directly.
import {
  PROJECT_TYPE_PREFIXES,
  formatProjectRefNumber,
  parseProjectRefNumber,
  highestProjectSequence,
  nextProjectRefNumber,
} from "../lib/referenceNumber.js";

test("PROJECT_TYPE_PREFIXES reserves GPB, RNE and ACD", () => {
  assert.deepStrictEqual(PROJECT_TYPE_PREFIXES, {
    GPB: "GPB",
    RNE: "RNE",
    ACD: "ACD",
  });
});

test("formatProjectRefNumber builds <PREFIX>-<year>-<seq> with 3-digit padding", () => {
  assert.strictEqual(formatProjectRefNumber("RNE", 2025, 1), "RNE-2025-001");
  assert.strictEqual(formatProjectRefNumber("ACD", 2025, 12), "ACD-2025-012");
  assert.strictEqual(formatProjectRefNumber("rne", "2024", 7), "RNE-2024-007");
  assert.strictEqual(formatProjectRefNumber("GPB", 2025, 1000), "GPB-2025-1000");
});

test("formatProjectRefNumber rejects unknown prefixes and invalid numbers", () => {
  assert.strictEqual(formatProjectRefNumber("XYZ", 2025, 1), "");
  assert.strictEqual(formatProjectRefNumber("", 2025, 1), "");
  assert.strictEqual(formatProjectRefNumber("RNE", "not-a-year", 1), "");
  assert.strictEqual(formatProjectRefNumber("RNE", 2025, 0), "");
  assert.strictEqual(formatProjectRefNumber("RNE", 2025, null), "");
});

test("parseProjectRefNumber round-trips formatted numbers", () => {
  assert.deepStrictEqual(parseProjectRefNumber("RNE-2025-001"), {
    prefix: "RNE",
    year: 2025,
    sequence: 1,
  });
  assert.deepStrictEqual(parseProjectRefNumber("ACD-2024-010"), {
    prefix: "ACD",
    year: 2024,
    sequence: 10,
  });
});

test("parseProjectRefNumber rejects event and malformed numbers", () => {
  assert.strictEqual(parseProjectRefNumber(""), null);
  assert.strictEqual(parseProjectRefNumber(null), null);
  // Event prefixes belong to the event number space, not the project one.
  assert.strictEqual(parseProjectRefNumber("GAD-2025-001"), null);
  assert.strictEqual(parseProjectRefNumber("ACA-2025-001"), null);
  assert.strictEqual(parseProjectRefNumber("RNE-25-1"), null);
  assert.strictEqual(parseProjectRefNumber("RNE-2025-"), null);
});

test("highestProjectSequence only counts the same prefix and year", () => {
  const refs = ["RNE-2025-001", "RNE-2025-004", "ACD-2025-009", "RNE-2024-002", null, "manual"];

  assert.strictEqual(highestProjectSequence(refs, "RNE", 2025), 4);
  assert.strictEqual(highestProjectSequence(refs, "ACD", 2025), 9);
  assert.strictEqual(highestProjectSequence(refs, "RNE", 2024), 2);
  assert.strictEqual(highestProjectSequence(refs, "RNE", 2026), 0);
  assert.strictEqual(highestProjectSequence(refs, "XYZ", 2025), 0);
  assert.strictEqual(highestProjectSequence(null, "RNE", 2025), 0);
});

test("nextProjectRefNumber keeps a separate counter per prefix and year", () => {
  assert.strictEqual(nextProjectRefNumber("RNE", 2025, []), "RNE-2025-001");
  assert.strictEqual(
    nextProjectRefNumber("RNE", 2025, ["RNE-2025-001", "RNE-2025-003"]),
    "RNE-2025-004",
  );
  assert.strictEqual(
    nextProjectRefNumber("ACD", 2025, ["RNE-2025-050"]),
    "ACD-2025-001",
  );
  assert.strictEqual(nextProjectRefNumber("RNE", 2026, ["RNE-2025-010"]), "RNE-2026-001");
});
