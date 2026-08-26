

import { connectDB } from "@/lib/db";
import GPB from "@/models/gpb";
import "@/models/event";
import "@/models/gaa_budget";
import "@/models/projects";
import GAABudget from "@/models/gaa_budget";
import { logActivity } from "@/lib/activityLog";
import { requireAuth } from "@/lib/auth";
import { validateBudgetLink } from "@/lib/budgetLinking";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const { error, status } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });

    await connectDB();

    const gpb = await GPB.find()
      .populate("gaaBudgetId")
      .populate({
        path: "projects",
        populate: {
          path: "events",
          model: "Event",
        },
      })
      .sort({ year: -1 });

    return Response.json({
      success: true,
      data: gpb,
    });
  } catch (error) {
    console.error("GET GPB ERROR:", error);

    return Response.json(
      {
        success: false,
        message: error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const { error, status } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });

    await connectDB();

    const body = await req.json();

    const { year, gaaBudgetId } = body;

    if (!year) {
      return Response.json(
        {
          success: false,
          message: "Year is required",
        },
        { status: 400 }
      );
    }

    const existingGPB = await GPB.findOne({ year });

    if (existingGPB) {
      return Response.json(
        {
          success: false,
          message: `GPB for year ${year} already exists`,
        },
        { status: 400 }
      );
    }

    let budget = null;
    if (gaaBudgetId) {
      budget = await GAABudget.findById(gaaBudgetId);

      const validation = validateBudgetLink(budget, year);
      if (!validation.ok) {
        return Response.json(
          {
            success: false,
            message: validation.message,
          },
          { status: validation.status }
        );
      }
    }

    const newGPB = await GPB.create({
      year,
      ...(gaaBudgetId ? { gaaBudgetId: budget._id } : {}),
      projects: [],
      status_of_gpb: {
        status: "draft",
        reason: "",
        scanned_copy: {
          url: "",
          key: "",
        },
      },
    });

    const populated = await GPB.findById(newGPB._id)
      .populate("gaaBudgetId")
      .populate("projects");

    await logActivity({
      req,
      action: "GPB_CREATE",
      description: `GPB created for year ${year}${budget ? "" : " (without GAA budget)"}`,
      resource_type: "gpb",
      resource_id: newGPB._id,
      severity: "info",
    });

    return Response.json({
      success: true,
      message: "GPB created successfully",
      data: populated,
    });
  } catch (error) {
    console.error("CREATE GPB ERROR:", error);

    return Response.json(
      {
        success: false,
        message: error.message,
      },
      { status: 500 }
    );
  }
}