import { connectDB } from "@/lib/db";
import {
  createNotifications,
  getPlanningDirectorIds,
  normalizeRole,
} from "@/lib/notifications";
import Project from "@/models/projects";
import UserAuth from "@/models/user";
import { logActivity } from "@/lib/activityLog";
import { requireAuth } from "@/lib/auth";
import { findDuplicates } from "@/lib/duplicateDetection";
import {NextResponse} from "next/server"

export async function PUT(req, { params }) {
    const { error, status } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });
  await connectDB();

  const { id } = await params;
  const body = await req.json();

  try {
    const project = await Project.findById(id);

    if (!project) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const mergeField = (key) => {
      if (body[key] === undefined) return;

      project[key] = {
        value: body[key]?.value !== undefined ? body[key].value : body[key],
      };
    };

mergeField("project_type");
    mergeField("gender_issue");
    mergeField("cause_gender_issue");
    mergeField("gad_objective");
    mergeField("supporting_statistics_data");
    mergeField("relevant_agency");
    mergeField("gad_activity");
    mergeField("performance_indicator_target");
    mergeField("gad_budget");
    mergeField("source_budget");
    mergeField("responsible_office");

    // GAD AR fields
    if (body.actual_accomplishment !== undefined) {
      project.actual_accomplishment = Array.isArray(body.actual_accomplishment)
        ? body.actual_accomplishment
        : [body.actual_accomplishment || ""];
    }
    if (body.actual_expenditures !== undefined) {
      project.actual_expenditures = Number(body.actual_expenditures) || 0;
    }

    let actor = null;

    if (body.userId) {
      actor = await UserAuth.findById(body.userId, "_id role username").lean();

      if (actor) {
        project.lastUpdatedBy = actor._id;
      }
    }

    await project.save();

    await logActivity({
      req,
      action: "PROJECT_UPDATE",
      description: `GPB project updated for year ${project.year}`,
      resource_type: "project",
      resource_id: id,
      severity: "info",
      metadata: {
        year: project.year,
        updatedFields: Object.keys(body).filter((key) => key !== "userId"),
      },
    });

    if (actor && normalizeRole(actor.role) !== "planning director") {
      const planningDirectorIds = await getPlanningDirectorIds(actor._id);

      await createNotifications({
        recipientIds: planningDirectorIds,
        senderId: actor._id,
        type: "project_updated",
        title: "Project updated",
        message: `${actor.username} updated a GPB project for year ${project.year}.`,
        projectId: project._id,
        metadata: {
          year: project.year,
          updatedFields: Object.keys(body).filter((key) => key !== "userId"),
        },
      });
    }

    // Check for duplicate Gender Issue / GAD Mandate in the same year (warn only, exclude self)
    let duplicateWarnings = [];
    try {
      const existingProjects = await Project.find({
        year: project.year,
        _id: { $ne: id },
      }).select("gender_issue");
      duplicateWarnings = findDuplicates(body.gender_issue, existingProjects, 0.7);
    } catch (err) {
      console.error("Duplicate check error:", err);
    }

    return Response.json({ data: project, duplicateWarnings });
  } catch (err) {
    console.error("PUT error:", err);
    return Response.json(
      { error: "Update failed", details: err.message },
      { status: 500 },
    );
  }
}

export async function GET(req, { params }) {
    const { error, status } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });
  await connectDB();
  const { id } = await params;
  const projects = await Project.findById(id).populate("events");
  if (!projects) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ data: projects });
}

export async function DELETE(req, { params }) {
    const { error, status } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });
  await connectDB();
  const { id } = await params;
  const projects = await Project.findByIdAndDelete(id);
  if (!projects) return Response.json({ error: "Not found" }, { status: 404 });

  await logActivity({
    req,
    action: "PROJECT_DELETE",
    description: `GPB project deleted`,
    resource_type: "project",
    resource_id: id,
    severity: "warning",
  });

  return Response.json({ data: projects });
}
