import { connectDB } from "@/data/lib/db";
import { requireAuth } from "@/data/lib/auth";
import { canViewProjectDetails } from "@/data/lib/projectAccess";
import { computeYearBudgetSummary } from "@/data/lib/yearBudgetSummary";
import { NextResponse } from "next/server";

/* Budget cards on the GPB year page. Same figures as the rest of the app:
   the budget attached to the year's GPB and the projects in it. */
export async function GET(req, { params }) {
  const { error, status, user } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });
  if (!canViewProjectDetails(user.role)) {
    return NextResponse.json(
      { error: "You are not allowed to view budgets." },
      { status: 403 },
    );
  }

  const { year } = await params;
  const yearNum = Number(year);
  if (!Number.isInteger(yearNum)) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  }

  try {
    await connectDB();
    const { summary } = await computeYearBudgetSummary(yearNum);
    return Response.json({ budgetSummary: summary });
  } catch (err) {
    console.error("GET budget summary failed:", err);
    return NextResponse.json(
      { error: "Unable to load the budget summary." },
      { status: 500 },
    );
  }
}
