import GPB from "@/models/gpb";
import GAABudget from "@/models/gaa_budget";
import Project from "@/models/projects";
import { buildBudgetSummary } from "@/data/lib/budgetLinking";
import { roundCentavos } from "@/data/lib/gaaBudgetInput";

/**
 * Which projects belong to a year's plan: the ones in its GPB, or — before
 * the year has a GPB — every project of that year. The summary, the GPB page
 * and the matrix PDF all use this rule, so their totals add up the same rows.
 */
export function yearProjectsMatch(gpb, year) {
  return gpb
    ? { _id: { $in: Array.isArray(gpb.projects) ? gpb.projects : [] } }
    : { year };
}

/**
 * The budget figures for one year, from a single source of truth: the year's
 * GPB. The budget is the one *attached* to the GPB and "used" is the sum of
 * the projects *in* the GPB.
 *
 * Screens used to disagree: the year page's cards looked the budget up by year
 * and summed every project with that year, the table showed only the GPB's
 * projects, and the dashboard and matrix PDF read the attached budget. After
 * "Change Budget" or a detach, one screen said "To follow" while another still
 * showed the old budget. With no GPB yet (a project being added to a new
 * year), the budget is looked up by year and every project of the year counts.
 *
 * @param {number} year
 * @param {{ extraUsed?: number }} [opts] amount to add (a project being created)
 */
export async function computeYearBudgetSummary(year, { extraUsed = 0 } = {}) {
  const gpb = await GPB.findOne({ year })
    .select("gaaBudgetId projects")
    .populate("gaaBudgetId")
    .lean();

  const budget = gpb
    ? gpb.gaaBudgetId || null
    : await GAABudget.findOne({ year }).lean();

  const match = yearProjectsMatch(gpb, year);
  const [used] = await Project.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        total: { $sum: { $ifNull: ["$gad_budget.value", 0] } },
      },
    },
  ]);

  const usedBudget = roundCentavos((used?.total || 0) + Number(extraUsed || 0));
  const summary = buildBudgetSummary({ budget, usedBudget });

  /* Centavo arithmetic: a plan that uses the budget exactly is not over by
     a floating-point sliver. */
  if (summary.hasBudget) {
    summary.remainingBudget = roundCentavos(summary.remainingBudget);
    summary.overBudget = summary.remainingBudget < 0;
    summary.overBy = summary.overBudget ? Math.abs(summary.remainingBudget) : 0;
  }
  return { summary, budget, gpb, hasGpb: Boolean(gpb) };
}
