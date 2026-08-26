import { test } from "node:test";
import assert from "node:assert";

// Pure helpers for late-budget support — no DB or network required,
// so we can exercise the real implementations directly.
import {
  NO_BUDGET_WARNING,
  OVER_BUDGET_WARNING,
  buildBudgetSummary,
  validateBudgetLink,
  linkBudgetToMatchingGpb,
} from "../lib/budgetLinking.js";

test("NO_BUDGET_WARNING is a non-empty message", () => {
  assert.strictEqual(typeof NO_BUDGET_WARNING, "string");
  assert.ok(NO_BUDGET_WARNING.length > 0);
});

test("OVER_BUDGET_WARNING is a non-empty message", () => {
  assert.strictEqual(typeof OVER_BUDGET_WARNING, "string");
  assert.ok(OVER_BUDGET_WARNING.length > 0);
});

test("buildBudgetSummary returns a 'to follow' shape without a budget", () => {
  const summary = buildBudgetSummary({ budget: null, usedBudget: 12500 });

  assert.strictEqual(summary.hasBudget, false);
  assert.strictEqual(summary.totalBudget, null);
  assert.strictEqual(summary.remainingBudget, null);
  // Utilization stays visible even while the budget is pending.
  assert.strictEqual(summary.usedBudget, 12500);
  assert.strictEqual(summary.overBudget, false);
  assert.strictEqual(summary.overBy, 0);
});

test("buildBudgetSummary handles being called without arguments", () => {
  const summary = buildBudgetSummary();

  assert.strictEqual(summary.hasBudget, false);
  assert.strictEqual(summary.usedBudget, 0);
});

test("buildBudgetSummary computes remaining budget correctly", () => {
  const summary = buildBudgetSummary({
    budget: { gadAnnualBudget: 1_000_000 },
    usedBudget: 250_000,
  });

  assert.strictEqual(summary.hasBudget, true);
  assert.strictEqual(summary.totalBudget, 1_000_000);
  assert.strictEqual(summary.usedBudget, 250_000);
  assert.strictEqual(summary.remainingBudget, 750_000);
  assert.strictEqual(summary.overBudget, false);
  assert.strictEqual(summary.overBy, 0);
});

test("buildBudgetSummary flags over-budget spending", () => {
  const summary = buildBudgetSummary({
    budget: { gadAnnualBudget: 100 },
    usedBudget: 150,
  });

  assert.strictEqual(summary.hasBudget, true);
  assert.strictEqual(summary.remainingBudget, -50);
  assert.strictEqual(summary.overBudget, true);
  assert.strictEqual(summary.overBy, 50);
});

test("validateBudgetLink rejects a missing budget with 404", () => {
  const result = validateBudgetLink(null, 2027);

  assert.deepStrictEqual(result, {
    ok: false,
    status: 404,
    message: "Selected budget not found",
  });
});

test("validateBudgetLink rejects a year mismatch with 400", () => {
  const result = validateBudgetLink({ year: 2027 }, 2028);

  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.status, 400);
  assert.ok(result.message.includes("2027"));
  assert.ok(result.message.includes("2028"));
});

test("validateBudgetLink accepts a matching year (string or number)", () => {
  assert.deepStrictEqual(validateBudgetLink({ year: 2028 }, 2028), { ok: true });
  assert.deepStrictEqual(validateBudgetLink({ year: "2028" }, 2028), {
    ok: true,
  });
});

test("linkBudgetToMatchingGpb returns null when there is no budget", async () => {
  const result = await linkBudgetToMatchingGpb({}, null);
  assert.strictEqual(result, null);
});

test("linkBudgetToMatchingGpb returns null when no GPB matches the year", async () => {
  let findOneCalls = 0;
  const GPBModel = {
    findOne: async () => {
      findOneCalls += 1;
      return null;
    },
  };

  const result = await linkBudgetToMatchingGpb(GPBModel, {
    _id: "budget-1",
    year: 2030,
  });

  assert.strictEqual(result, null);
  assert.strictEqual(findOneCalls, 1);
});

test("linkBudgetToMatchingGpb attaches the budget to the same-year GPB", async () => {
  const fakeGpb = {
    year: 2030,
    gaaBudgetId: null,
    savedWith: null,
    save: async function () {
      this.savedWith = this.gaaBudgetId;
    },
  };
  let queriedYear = null;

  const GPBModel = {
    findOne: async ({ year }) => {
      queriedYear = year;
      return fakeGpb;
    },
  };

  const result = await linkBudgetToMatchingGpb(GPBModel, {
    _id: "budget-42",
    year: 2030,
  });

  assert.strictEqual(queriedYear, 2030, "Should query by numeric budget year");
  assert.strictEqual(result, fakeGpb, "Should return the linked GPB");
  assert.strictEqual(fakeGpb.gaaBudgetId, "budget-42", "Should set the link");
});
