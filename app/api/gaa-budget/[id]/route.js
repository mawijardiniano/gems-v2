import { NextResponse } from "next/server";
import mongoose from "mongoose";
import GAABudget from "@/models/gaa_budget";
import GPB from "@/models/gpb";
import { connectDB } from "@/lib/db";

export async function GET(req, { params }) {
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
    return NextResponse.json({ success: true, data: budget });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  await connectDB();
  const { id } = await params;
  try {
    const deleted = await GAABudget.findByIdAndDelete(id);
    if (!deleted)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    
    // Clear the budget reference from any GPB records that use this budget
    await GPB.updateMany(
      { gaaBudgetId: id },
      { $set: { gaaBudgetId: null } }
    );
    
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
