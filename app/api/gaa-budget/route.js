import GAABudget from "@/models/gaa_budget";
import GPB from "@/models/gpb";
import { connectDB } from "@/data/lib/db";
import { linkBudgetToMatchingGpb } from "@/data/lib/budgetLinking";
import { logActivity } from "@/data/lib/activityLog";
import { requireAuth } from "@/data/lib/auth";
import { NextResponse } from "next/server";
import {
  canViewProjectDetails,
  isGpbManagerRole,
} from "@/data/lib/projectAccess";
import { parseBudgetInput } from "@/data/lib/gaaBudgetInput";

/* GAA budgets are read on the GPB, budget and events-dashboard pages, and
   written only by a GAD Focal Person or an Admin (the budget page is
   read-only for coordinators). Both used to need only a signed-in account. */

export async function POST(req) {
  const { error, status, user } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });
  if (!isGpbManagerRole(user.role)) {
    return NextResponse.json(
      { success: false, message: "You are not allowed to add GAA budgets." },
      { status: 403 },
    );
  }
  await connectDB();

  const parsed = parseBudgetInput(await req.json().catch(() => null));
  if (parsed.error) {
    return NextResponse.json(
      { success: false, message: parsed.error },
      { status: 400 },
    );
  }
  const { year, totalGAA, gadPercent } = parsed;

  try {
    const existingBudget = await GAABudget.findOne({ year });
    if (existingBudget) {
      return NextResponse.json(
        {
          success: false,
          message: `A GAA Budget for year ${year} already exists.`,
        },
        { status: 400 },
      );
    }

    const budget = new GAABudget({
      year,
      totalGAA,
      gadPercent,
      /* Whoever is signed in — not an id from the request body. */
      enteredBy: user._id,
    });

    await budget.save();

    await logActivity({
      req,
      action: "GAA_BUDGET_CREATE",
      description: `GAA Budget created for year ${year}`,
      resource_type: "gaa_budget",
      resource_id: budget._id,
      severity: "info",
    });

    await linkBudgetToMatchingGpb(GPB, budget);

    return NextResponse.json({ success: true, data: budget });
  } catch (err) {
    /* Two creates for the same year raced past the check above. */
    if (err?.code === 11000) {
      return NextResponse.json(
        {
          success: false,
          message: `A GAA Budget for year ${year} already exists.`,
        },
        { status: 400 },
      );
    }
    console.error("POST /api/gaa-budget failed:", err);
    return NextResponse.json(
      { error: "Unable to save the GAA budget." },
      { status: 500 },
    );
  }
}

export async function GET(req) {
  const { error, status, user } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });
  if (!canViewProjectDetails(user.role)) {
    return NextResponse.json(
      { error: "You are not allowed to view GAA budgets." },
      { status: 403 },
    );
  }
  await connectDB();
  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year");
  try {
    const query = {};
    if (year) {
      const yearNumber = Number(year);
      if (!Number.isInteger(yearNumber)) {
        return NextResponse.json({ error: "Invalid year" }, { status: 400 });
      }
      query.year = yearNumber;
    }
    const budgets = await GAABudget.find(query).sort({ year: -1 }).lean();
    return NextResponse.json({ success: true, data: budgets });
  } catch (err) {
    console.error("GET /api/gaa-budget failed:", err);
    return NextResponse.json(
      { error: "Unable to load GAA budgets." },
      { status: 500 },
    );
  }
}
