import { connectDB } from "@/data/lib/db";
import GPB from "@/models/gpb";
import mongoose from "mongoose";
import "@/models/event";
import GAABudget from "@/models/gaa_budget";
import Project from "@/models/projects";
import "@/models/profile";
import UserAuth from "@/models/user";
import { logActivity } from "@/data/lib/activityLog";
import { requireAuth } from "@/data/lib/auth";
import { validateBudgetLink } from "@/data/lib/budgetLinking";
import { canAccessGpb } from "@/data/lib/roleAccess";
import { clearProjectReportCaches } from "@/data/lib/cache";
import { deleteFileFromBucket } from "@/data/lib/delete";
import { parseGpbYear } from "@/data/lib/gpbYear";
import {
  withGeneratedAccomplishment,
  hydrateProjectAttendanceSex,
} from "@/data/lib/accomplishmentSummary";
import { NextResponse } from "next/server";
import {
  GPB_LOCKED_MESSAGE,
  isGpbLocked,
  isGpbManagerRole,
} from "@/data/lib/projectAccess";

const PROJECT_POPULATE = [
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

/* `generated_accomplishment` is derived live from linked events so every
   consumer (monitoring page, GAD AR table, printouts) reads the same
   up-to-date value. */
const prepareProjects = (projects) =>
  Promise.all(
    (Array.isArray(projects) ? projects : []).map(async (project) => {
      const plain = project?.toObject ? project.toObject() : project;
      await hydrateProjectAttendanceSex(plain);
      return withGeneratedAccomplishment(plain);
    }),
  );

export async function GET(req, { params }) {
  const { error, status, user } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });

  /* Same gate as GET /api/gpb: this endpoint returns the fullest read of a plan
     - every project, event, attendee and comment - so it may not be looser than
     the page that shows it. Fails closed on a missing or unknown role. */
  if (!canAccessGpb(user?.role)) {
    return NextResponse.json(
      { error: "You are not allowed to view the GPB" },
      { status: 403 },
    );
  }

  const yearNum = parseGpbYear((await params).year);
  if (yearNum === null) {
    return Response.json({ message: "Invalid year" }, { status: 400 });
  }

  try {
    await connectDB();

    const gpb = await GPB.findOne({ year: yearNum })
      .populate({ path: "projects", populate: PROJECT_POPULATE })
      .populate("gaaBudgetId");

    if (!gpb) {
      return Response.json({ message: "GPB not found" }, { status: 404 });
    }

    /* Projects saved before they were linked to their GPB (or whose link
       write failed) carry the year but are missing from `projects`. They are
       shown, and linked again only by a role that manages the plan and only
       while it is not approved: a read by the Planning Director must not
       change the plan. */
    if (!Array.isArray(gpb.projects) || gpb.projects.length === 0) {
      const orphanProjects = await Project.find({ year: yearNum }).populate(
        PROJECT_POPULATE,
      );

      if (orphanProjects.length > 0) {
        let repaired = false;
        if (isGpbManagerRole(user?.role) && !isGpbLocked(gpb)) {
          await GPB.updateOne(
            { _id: gpb._id },
            {
              $addToSet: {
                projects: { $each: orphanProjects.map((p) => p._id) },
              },
            },
          );
          clearProjectReportCaches();
          repaired = true;
        }

        const gpbObject = gpb.toObject();
        gpbObject.projects = await prepareProjects(orphanProjects);
        return Response.json({
          data: gpbObject,
          repairedProjectLinks: repaired,
        });
      }
    }

    const gpbData = gpb.toObject();
    gpbData.projects = await prepareProjects(gpbData.projects);

    return Response.json({ data: gpbData });
  } catch (err) {
    console.error("GET GPB year ERROR:", err);
    return Response.json(
      { message: "Unable to load the GPB." },
      { status: 500 },
    );
  }
}

export async function DELETE(req, { params }) {
  const { error, status, user } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });

  /* Deleting a year removes the plan and its links outright, and there is no
     soft-delete to fall back on. Only the roles that manage GPBs may do it
     (the page hides it from coordinators and the planning director, who could
     still call it while the check was the read gate). */
  if (!isGpbManagerRole(user?.role)) {
    return NextResponse.json(
      { error: "You are not allowed to delete the GPB" },
      { status: 403 },
    );
  }

  const yearNum = parseGpbYear((await params).year);
  if (yearNum === null) {
    return Response.json({ message: "Invalid year" }, { status: 400 });
  }

  try {
    await connectDB();

    const existing = await GPB.findOne({ year: yearNum })
      .select("status_of_gpb.status")
      .lean();
    if (!existing) {
      return Response.json({ message: "GPB not found" }, { status: 404 });
    }
    /* An approved plan is final until it is disapproved. The status is part
       of the delete filter too, so an approval that lands between the check
       and the delete is not lost. */
    if (isGpbLocked(existing)) {
      return Response.json({ message: GPB_LOCKED_MESSAGE }, { status: 409 });
    }

    const gpb = await GPB.findOneAndDelete({
      _id: existing._id,
      "status_of_gpb.status": { $ne: "approved" },
    });

    if (!gpb) {
      return Response.json({ message: GPB_LOCKED_MESSAGE }, { status: 409 });
    }

    /* The signed copy belongs to this plan alone. */
    const scannedKey = gpb.status_of_gpb?.scanned_copy?.key;
    if (scannedKey) {
      try {
        await deleteFileFromBucket(scannedKey);
      } catch (fileError) {
        console.error("GPB scanned copy delete failed:", fileError);
      }
    }
    clearProjectReportCaches();

    await logActivity({
      req,
      action: "GPB_DELETE",
      description: `GPB deleted for year ${yearNum}`,
      resource_type: "gpb",
      resource_id: gpb._id,
      severity: "warning",
    });

    return Response.json({ success: true, message: "GPB deleted successfully" });
  } catch (err) {
    console.error("DELETE GPB ERROR:", err);
    return Response.json(
      { message: "Unable to delete the GPB." },
      { status: 500 },
    );
  }
}

export async function PATCH(req, { params }) {
  const { error, status, user } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });
  /* Attaching or detaching a year's budget changes the plan's totals. */
  if (!isGpbManagerRole(user.role)) {
    return NextResponse.json(
      { error: "You are not allowed to change the GPB budget" },
      { status: 403 },
    );
  }

  const yearNum = parseGpbYear((await params).year);
  if (yearNum === null) {
    return Response.json({ message: "Invalid year" }, { status: 400 });
  }

  try {
    await connectDB();

    const body = await req.json().catch(() => ({}));
    const gaaBudgetId = body?.gaaBudgetId ?? null;

    const gpb = await GPB.findOne({ year: yearNum });
    if (!gpb) {
      return Response.json({ message: "GPB not found" }, { status: 404 });
    }
    if (isGpbLocked(gpb)) {
      return Response.json({ message: GPB_LOCKED_MESSAGE }, { status: 409 });
    }

    if (gaaBudgetId === null || gaaBudgetId === "") {
      gpb.gaaBudgetId = null;
      await gpb.save();
      clearProjectReportCaches();

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
    clearProjectReportCaches();

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
        message: "Unable to update the GPB budget.",
      },
      { status: 500 },
    );
  }
}
