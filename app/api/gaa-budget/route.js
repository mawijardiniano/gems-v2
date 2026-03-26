import { NextResponse } from "next/server";
import mongoose from "mongoose";
import GAABudget from "@/models/gaa_budget";
import { connectDB } from "@/lib/db";

export async function POST(req) {
  await connectDB();
  const body = await req.json();
  try {
    const budget = new GAABudget({
      year: body.year,
      totalGAA: body.totalGAA,
      gadPercent: body.gadPercent,
      enteredBy: body.enteredBy,
    });
    await budget.save();
    return NextResponse.json({ success: true, data: budget });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
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
