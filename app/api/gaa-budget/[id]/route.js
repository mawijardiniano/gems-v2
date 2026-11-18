import { NextResponse } from "next/server";
import mongoose from "mongoose";
import GAABudget from "@/models/gaa_budget";
import GPB from "@/models/gpb";
import { connectDB } from "@/data/lib/db";
import { logActivity } from "@/data/lib/activityLog";
import { requireAuth } from "@/data/lib/auth";
import { linkBudgetToMatchingGpb } from "@/data/lib/budgetLinking";
import {
  GPB_LOCKED_MESSAGE,
  canViewProjectDetails,
  isGpbLocked,
  isGpbManagerRole,
} from "@/data/lib/projectAccess";
import { parseBudgetInput } from "@/data/lib/gaaBudgetInput";

const notFound = () =>
  NextResponse.json({ error: "Not found" }, { status: 404 });

const forbidden = (action) =>
  NextResponse.json(
    { error: `You are not allowed to ${action} GAA budgets.` },
    { status: 403 },
  );

/* A budget attached to an approved GPB is part of that plan and is locked
   with it (see data/lib/projectAccess.js). */
async function linkedToApprovedGpb(budgetId) {
  const gpbs = await GPB.find({ gaaBudgetId: budgetId })
    .select("status_of_gpb.status")
    .lean();
  return gpbs.some(isGpbLocked);
}

export async function GET(req, { params }) {
  const { error, status, user } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });
  if (!canViewProjectDetails(user.role)) return forbidden("view");
  await connectDB();
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return notFound();
  try {
    const budget = await GAABudget.findById(id).lean();
    if (!budget) return notFound();
    return NextResponse.json({ success: true, data: budget });
  } catch (err) {
    console.error("GET /api/gaa-budget/[id] failed:", err);
    return NextResponse.json(
      { error: "Unable to load the GAA budget." },
      { status: 500 },
    );
  }
}

export async function PUT(req, { params }) {
  const { error, status, user } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });
  if (!isGpbManagerRole(user.role)) return forbidden("edit");
  await connectDB();
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return notFound();

  const parsed = parseBudgetInput(await req.json().catch(() => null));
  if (parsed.error) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { year: nextYear, totalGAA, gadPercent } = parsed;

  try {
    const budget = await GAABudget.findById(id);
    if (!budget) return notFound();

    if (await linkedToApprovedGpb(id)) {
      return NextResponse.json({ error: GPB_LOCKED_MESSAGE }, { status: 409 });
    }

    const yearChanged = nextYear !== Number(budget.year);
    if (yearChanged) {
      const linkedGpbs = await GPB.find({ gaaBudgetId: id }).select("year");
      const mismatched = linkedGpbs.filter((g) => Number(g.year) !== nextYear);
      if (mismatched.length > 0) {
        return NextResponse.json(
          {
            error: `Cannot change the budget year to ${nextYear}: it is linked to GPB record(s) for year(s) ${mismatched
              .map((g) => g.year)
              .join(", ")}. Detach or re-attach those GPBs first.`,
          },
          { status: 400 },
        );
      }
    }

    budget.year = nextYear;
    budget.totalGAA = totalGAA;
    budget.gadPercent = gadPercent;
    await budget.save();

    /* Same as on create: a budget now covering a new year attaches to that
       year's GPB if it has none. */
    if (yearChanged) await linkBudgetToMatchingGpb(GPB, budget);

    await logActivity({
      req,
      action: "GAA_BUDGET_UPDATE",
      description: `GAA Budget updated for year ${nextYear}`,
      resource_type: "gaa_budget",
      resource_id: id,
      severity: "info",
    });
    return NextResponse.json({ success: true, data: budget });
  } catch (err) {
    if (err?.code === 11000) {
      return NextResponse.json(
        { error: `A GAA Budget for year ${nextYear} already exists.` },
        { status: 400 },
      );
    }
    console.error("PUT /api/gaa-budget/[id] failed:", err);
    return NextResponse.json(
      { error: "Unable to update the GAA budget." },
      { status: 500 },
    );
  }
}

export async function DELETE(req, { params }) {
  const { error, status, user } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });
  if (!isGpbManagerRole(user.role)) return forbidden("delete");
  await connectDB();
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return notFound();
  try {
    if (await linkedToApprovedGpb(id)) {
      return NextResponse.json({ error: GPB_LOCKED_MESSAGE }, { status: 409 });
    }

    const deleted = await GAABudget.findByIdAndDelete(id);
    if (!deleted) return notFound();

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
    console.error("DELETE /api/gaa-budget/[id] failed:", err);
    return NextResponse.json(
      { error: "Unable to delete the GAA budget." },
      { status: 500 },
    );
  }
}
