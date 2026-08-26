import { connectDB } from "@/lib/db";
import GPB from "@/models/gpb";
import mongoose from "mongoose";
import "@/models/event";
import GAABudget from "@/models/gaa_budget";
import Project from "@/models/projects";
import "@/models/profile";
import UserAuth from "@/models/user";
import { logActivity } from "@/lib/activityLog";
 import { requireAuth } from "@/lib/auth";
import { validateBudgetLink } from "@/lib/budgetLinking";
import {NextResponse} from "next/server"


export async function GET(req, { params }) {
   const { error, status } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });
  await connectDB();

  const { year } = await params;
  const yearNum = Number(year);

  if (Number.isNaN(yearNum)) {
    return Response.json({ message: "Invalid year" }, { status: 400 });
  }

  const projectPopulate = [
    {
      path: "events",
      model: "Event",
      populate: {
        path: "attended_users.user_id",
        model: "UserAuth",
        select: "username role personal_info_id",
        populate: {
          path: "personal_info_id",
          model: "GemsProfile",
          select: "gadData.sexAtBirth",
        },
      },
    },
    {
      path: "createdBy",
      model: "UserAuth",
      select: "username role personal_info_id",
      populate: { path: "personal_info_id", model: "GemsProfile" },
    },
    {
      path: "comments.userId",
      model: "UserAuth",
      select: "username role personal_info_id",
      populate: { path: "personal_info_id", model: "GemsProfile" },
    },
  ];

  let gpb = await GPB.findOne({ year: yearNum })
    .populate({
      path: "projects",
      populate: projectPopulate,
    })
    .populate("gaaBudgetId");

  if (!gpb) {
    return Response.json({ message: "GPB not found" }, { status: 404 });
  }

  if (!Array.isArray(gpb.projects) || gpb.projects.length === 0) {
    const orphanProjects = await Project.find({ year: yearNum }).populate(
      projectPopulate,
    );

    if (orphanProjects.length > 0) {
      await GPB.updateOne(
        { _id: gpb._id },
        {
          $addToSet: {
            projects: { $each: orphanProjects.map((project) => project._id) },
          },
        },
      );

      const gpbObject = gpb.toObject();
      gpbObject.projects = orphanProjects;

      return Response.json({
        data: gpbObject,
        repairedProjectLinks: true,
      });
    }
  }

  return Response.json({ data: gpb });
}

export async function DELETE(req, { params }) {
   const { error, status } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });
  await connectDB();

  const { year } = await params;
  const yearNum = Number(year);

  if (Number.isNaN(yearNum)) {
    return Response.json({ message: "Invalid year" }, { status: 400 });
  }

  const gpb = await GPB.findOneAndDelete({
    year: yearNum,
  });

  if (!gpb) {
    return Response.json({ message: "GPB not found" }, { status: 404 });
  }

  await logActivity({
    req,
    action: "GPB_DELETE",
    description: `GPB deleted for year ${yearNum}`,
    resource_type: "gpb",
    resource_id: gpb._id,
    severity: "warning",
  });

  return Response.json({
    message: "GPB deleted successfully",
    data: gpb,
  });
}


export async function PATCH(req, { params }) {
  const { error, status } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });
  await connectDB();

  const { year } = await params;
  const yearNum = Number(year);

  if (Number.isNaN(yearNum)) {
    return Response.json({ message: "Invalid year" }, { status: 400 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const gaaBudgetId = body?.gaaBudgetId ?? null;

    const gpb = await GPB.findOne({ year: yearNum });
    if (!gpb) {
      return Response.json({ message: "GPB not found" }, { status: 404 });
    }

  
    if (gaaBudgetId === null || gaaBudgetId === "") {
      gpb.gaaBudgetId = null;
      await gpb.save();

      await logActivity({
        req,
        action: "GPB_BUDGET_DETACH",
        description: `GAA budget detached from GPB for year ${yearNum}`,
        resource_type: "gpb",
        resource_id: gpb._id,
        severity: "warning",
      });

      const populated = await GPB.findById(gpb._id).populate("gaaBudgetId");
      return Response.json({
        success: true,
        message: "GAA budget detached successfully",
        data: populated,
      });
    }

 
    if (!mongoose.Types.ObjectId.isValid(gaaBudgetId)) {
      return Response.json(
        { success: false, message: "Invalid budget id" },
        { status: 400 },
      );
    }

    const budget = await GAABudget.findById(gaaBudgetId);
    const validation = validateBudgetLink(budget, yearNum);
    if (!validation.ok) {
      return Response.json(
        { success: false, message: validation.message },
        { status: validation.status },
      );
    }

    gpb.gaaBudgetId = budget._id;
    await gpb.save();

    await logActivity({
      req,
      action: "GPB_BUDGET_ATTACH",
      description: `GAA budget for year ${budget.year} attached to GPB for year ${yearNum}`,
      resource_type: "gpb",
      resource_id: gpb._id,
      severity: "info",
    });

    const populated = await GPB.findById(gpb._id).populate("gaaBudgetId");
    return Response.json({
      success: true,
      message: "GAA budget attached successfully",
      data: populated,
    });
  } catch (err) {
    console.error("PATCH GPB ERROR:", err);
    return Response.json(
      {
        success: false,
        message: err.message,
      },
      { status: 500 }
    );
  }
}
