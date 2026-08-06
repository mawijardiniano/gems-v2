import { NextResponse } from "next/server";
import mongoose from "mongoose";
import GAABudget from "@/models/gaa_budget";
import GPB from "@/models/gpb";
import { connectDB } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { requireAuth } from "@/lib/auth";

export async function GET(req, { params }) {
  const { error, status } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });
  await connectDB();
  const { id } = await params;
  try {
    const budget = await GAABudget.findById(id);
    if (!budget)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: budget });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  const { error, status } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });
  await connectDB();
  const { id } = await params;
  const body = await req.json();
  try {
    const budget = await GAABudget.findById(id);
    if (!budget) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    budget.year = body.year;
    budget.totalGAA = body.totalGAA;
    budget.gadPercent = body.gadPercent;
    await budget.save();
    await logActivity({
      req,
      action: "GAA_BUDGET_UPDATE",
      description: `GAA Budget updated for year ${body.year}`,
      resource_type: "gaa_budget",
      resource_id: id,
      severity: "info",
    });
    return NextResponse.json({ success: true, data: budget });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const { error, status } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });
  await connectDB();
  const { id } = await params;
  try {
    const deleted = await GAABudget.findByIdAndDelete(id);
    if (!deleted)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Clear the budget reference from any GPB records that use this budget
    await GPB.updateMany({ gaaBudgetId: id }, { $set: { gaaBudgetId: null } });

    await logActivity({
      req,
      action: "GAA_BUDGET_DELETE",
      description: `GAA Budget deleted`,
      resource_type: "gaa_budget",
      resource_id: id,
      severity: "warning",
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
