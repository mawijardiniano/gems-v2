import { connectDB } from "@/data/lib/db";
import GPB from "@/models/gpb";
import "@/models/event";
import "@/models/gaa_budget";
import "@/models/projects";
import GAABudget from "@/models/gaa_budget";
import { logActivity } from "@/data/lib/activityLog";
import { requireAuth } from "@/data/lib/auth";
import { canAccessGpb, canViewGpbReports } from "@/data/lib/roleAccess";
import { isGpbManagerRole } from "@/data/lib/projectAccess";
import { validateBudgetLink } from "@/data/lib/budgetLinking";
import { parseGpbYear } from "@/data/lib/gpbYear";
import { clearProjectReportCaches } from "@/data/lib/cache";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const { error, status, user } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });

    /* The /gpb page is gated by role in app/(pages)/(event)/layout.jsx; without
       this the API handed the same plans, budgets and projects to every signed-in
       user. Fail closed on an unknown role. */
    if (!canAccessGpb(user?.role)) {
      /* The President picks a GPB year for the read-only reports, so it gets
         the years and nothing else. */
      if (canViewGpbReports(user?.role)) {
        await connectDB();
        const years = await GPB.find()
          .select("year status_of_gpb.status")
          .sort({ year: -1 })
          .lean();
        return Response.json({ success: true, data: years });
      }
      return NextResponse.json(
        { error: "You are not allowed to view the GPB" },
        { status: 403 },
      );
    }

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
        message: "Unable to load GPBs.",
      },
      { status: 500 },
    );
  }
}

export async function POST(req) {
  try {
    const { error, status, user } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });

    /* Creating a year's GPB is the Focal Person's (or an Admin's) job, as on
       the GPB page; it used to need only a signed-in account. */
    if (!isGpbManagerRole(user.role)) {
      return Response.json(
        { success: false, message: "You are not allowed to create a GPB" },
        { status: 403 },
      );
    }

    await connectDB();

    const body = (await req.json().catch(() => null)) || {};

    const year = parseGpbYear(body.year);
    const { gaaBudgetId } = body;

    if (year === null) {
      return Response.json(
        {
          success: false,
          message: "Year is required",
        },
        { status: 400 },
      );
    }

    const existingGPB = await GPB.findOne({ year });

    if (existingGPB) {
      return Response.json(
        {
          success: false,
          message: `GPB for year ${year} already exists`,
        },
        { status: 400 },
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
          { status: validation.status },
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

    clearProjectReportCaches();

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
        message:
          error?.code === 11000
            ? "A GPB for that year already exists"
            : "Unable to create the GPB.",
      },
      { status: 500 },
    );
  }
}
