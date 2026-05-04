import { connectDB } from "@/lib/db";
import GAABudget from "@/models/gaa_budget";
import Project from "@/models/projects";

export async function GET(req, { params }) {
  await connectDB();

  const { year } = await params;

  const budget = await GAABudget.findOne({ year: Number(year) });

  if (!budget) {
    return Response.json(
      { message: "Budget not found" },
      { status: 404 }
    );
  }

const usedResult = await Project.aggregate([
  { $match: { year: Number(year) } },
  {
    $group: {
      _id: null,
      totalUsed: {
        $sum: {
          $ifNull: ["$gad_budget.value", 0]
        }
      }
    }
  }
]);

  const usedBudget = usedResult[0]?.totalUsed || 0;

  const remainingBudget = budget.gadAnnualBudget - usedBudget;

  return Response.json({
    budgetSummary: {
      totalBudget: budget.gadAnnualBudget,
      usedBudget,
      remainingBudget
    }
  });
}