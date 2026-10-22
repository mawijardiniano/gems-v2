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
import { withGeneratedAccomplishment, hydrateProjectAttendanceSex } from "@/lib/accomplishmentSummary";
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
          /* `sexAtBirth` is read from the vault, not from this column — see
             `withResolvedAttendanceSex` below. `vaultRef` is selected so the
             identity can be resolved in one batch for the whole report.
             Only real schema paths are projected: `gadData.sexAtBirth` and
             `personal.currentStatus` were removed from GemsProfile, and
             projecting them made Mongoose drop the joined profile (and its
             `vaultRef`) entirely. `affiliation.person_type` is the
             student/employee discriminator that replaced `personal.currentStatus`. */
          select: "vaultRef affiliation.person_type",
        },
      },
    },
    {
      path: "createdBy",
      model: "UserAuth",
      select: "username role personal_info_id",
      populate: {
        path: "personal_info_id",
        model: "GemsProfile",
        /* `vaultRef` only: `personal` was removed from the Profile schema, so
           projecting it would drop the joined profile entirely. */
        select: "vaultRef affiliation",
      },
    },
    {
      path: "comments.userId",
      model: "UserAuth",
      select: "username role personal_info_id",
      populate: {
        path: "personal_info_id",
        model: "GemsProfile",
        select: "vaultRef affiliation",
      },
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
      gpbObject.projects = await Promise.all(
        orphanProjects.map(async (project) => {
          const plain = project.toObject ? project.toObject() : project;
          await hydrateProjectAttendanceSex(plain);
          return withGeneratedAccomplishment(plain);
        }),
      );

      return Response.json({
        data: gpbObject,
        repairedProjectLinks: true,
      });
    }
  }

  /* `generated_accomplishment` is derived live from linked events so every consumer
     (monitoring page, GAD AR table, printouts) reads the same up-to-date value. */
  const gpbData = gpb.toObject();
  gpbData.projects = Array.isArray(gpbData.projects)
    ? await Promise.all(
        gpbData.projects.map(async (project) => {
          await hydrateProjectAttendanceSex(project);
          return withGeneratedAccomplishment(project);
        }),
      )
    : [];

  return Response.json({ data: gpbData });
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
