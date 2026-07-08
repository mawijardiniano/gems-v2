import { connectDB } from "@/lib/db";
import {
  createNotifications,
  getPlanningDirectorIds,
  normalizeRole,
} from "@/lib/notifications";
import Project from "@/models/projects";
import UserAuth from "@/models/user";

export async function PUT(req, { params }) {
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

    let actor = null;

    if (body.userId) {
      actor = await UserAuth.findById(body.userId, "_id role username").lean();

      if (actor) {
        project.lastUpdatedBy = actor._id;
      }
    }

    await project.save();

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

    return Response.json({ data: project });
  } catch (err) {
    console.error("PUT error:", err);
    return Response.json(
      { error: "Update failed", details: err.message },
      { status: 500 },
    );
  }
}

export async function GET(req, { params }) {
  await connectDB();
  const { id } = await params;
  const projects = await Project.findById(id).populate("events");
  if (!projects) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ data: projects });
}

export async function DELETE(req, { params }) {
  await connectDB();
  const { id } = await params;
  const projects = await Project.findByIdAndDelete(id);
  if (!projects) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ data: projects });
}
