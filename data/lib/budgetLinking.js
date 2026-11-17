

export const NO_BUDGET_WARNING =
  "No GAA budget allocated for this year yet. The project was saved and will count toward utilization once a budget arrives.";

export const OVER_BUDGET_WARNING =
  "This project exceeds the remaining GAA budget. The project was saved, but the year is now over budget.";


export function buildBudgetSummary({ budget, usedBudget = 0 } = {}) {
  const used = Number(usedBudget) || 0;

  const totalBudget = Number(budget?.gadAnnualBudget);
  if (!budget || !Number.isFinite(totalBudget)) {
    return {
      hasBudget: false,
      totalBudget: null,
      usedBudget: used,
      remainingBudget: null,
      overBudget: false,
      overBy: 0,
    };
  }

  const remainingBudget = totalBudget - used;
  const overBudget = remainingBudget < 0;

  return {
    hasBudget: true,
    totalBudget,
    usedBudget: used,
    remainingBudget,
    overBudget,
    overBy: overBudget ? Math.abs(remainingBudget) : 0,
  };
}

export function validateBudgetLink(budget, year) {
  if (!budget) {
    return { ok: false, status: 404, message: "Selected budget not found" };
  }
  if (Number(budget.year) !== Number(year)) {
    return {
      ok: false,
      status: 400,
      message: `Budget year (${budget.year}) does not match GPB year (${year})`,
    };
  }
  return { ok: true };
}


export async function linkBudgetToMatchingGpb(GPBModel, budget) {
  if (!budget) return null;
  const gpb = await GPBModel.findOne({ year: Number(budget.year) });
  if (!gpb) return null;
  gpb.gaaBudgetId = budget._id;
  await gpb.save();
  return gpb;
}
