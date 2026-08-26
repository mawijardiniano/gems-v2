import { connectDB } from "@/lib/db";
import GAABudget from "@/models/gaa_budget";
import Project from "@/models/projects";
import { requireAuth } from "@/lib/auth";
import { buildBudgetSummary } from "@/lib/budgetLinking";
import {NextResponse} from "next/server"

export async function GET(req, { params }) {
   const { error, status } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });
  await connectDB();

  const { year } = await params;

  const budget = await GAABudget.findOne({ year: Number(year) });

  const usedResult = await Project.aggregate([
    { $match: { year: Number(year) } },
    {
      $group: {
        _id: null,
        totalUsed: {
          $sum: {
            $ifNull: ["$gad_budget.value", 0],
          },
        },
      },
    },
  ]);

  const usedBudget = usedResult[0]?.totalUsed || 0;

  return Response.json({
    budgetSummary: buildBudgetSummary({ budget, usedBudget }),
  });
}
