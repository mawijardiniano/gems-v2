import { NextResponse } from "next/server";
import mongoose from "mongoose";
import GAABudget from "@/models/gaa_budget";
import GPB from "@/models/gpb";
import { connectDB } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
export async function POST(req) {
  await connectDB();
  const body = await req.json();

  try {
    const existingBudget = await GAABudget.findOne({
      year: Number(body.year),
    });

    if (existingBudget) {
      return NextResponse.json(
        {
          success: false,
          message: `A GAA Budget for year ${body.year} already exists.`,
        },
        { status: 400 }
      );
    }

    const budget = new GAABudget({
      year: body.year,
      totalGAA: body.totalGAA,
      gadPercent: body.gadPercent,
      enteredBy: body.enteredBy,
    });

    await budget.save();

    await logActivity({
      req,
      action: "GAA_BUDGET_CREATE",
      description: `GAA Budget created for year ${body.year}`,
      resource_type: "gaa_budget",
      resource_id: budget._id,
      severity: "info",
    });

    const gpb = await GPB.findOne({
      year: Number(body.year),
    });

    if (gpb) {
      gpb.gaaBudgetId = budget._id;
      await gpb.save();
    }

    return NextResponse.json({
      success: true,
      data: budget,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}

export async function GET(req) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year");
  try {
    let query = {};
    if (year) query.year = Number(year);
    const budgets = await GAABudget.find(query).sort({ year: -1 });
    return NextResponse.json({ success: true, data: budgets });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
