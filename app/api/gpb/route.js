

import { connectDB } from "@/lib/db";
import GPB from "@/models/gpb";
import "@/models/event";
import "@/models/gaa_budget";
import "@/models/projects";
import GAABudget from "@/models/gaa_budget";
import { logActivity } from "@/lib/activityLog";


export async function GET() {
  try {
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

    if (!gaaBudgetId) {
      return Response.json(
        {
          success: false,
          message: "GAA Budget is required",
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

    const budget = await GAABudget.findById(gaaBudgetId);

    if (!budget) {
      return Response.json(
        {
          success: false,
          message: "Selected budget not found",
        },
        { status: 404 }
      );
    }

    if (budget.year !== year) {
      return Response.json(
        {
          success: false,
          message: `Budget year (${budget.year}) does not match GPB year (${year})`,
        },
        { status: 400 }
      );
    }

    const newGPB = await GPB.create({
      year,
      gaaBudgetId,
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
      description: `GPB created for year ${year}`,
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