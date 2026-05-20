import { connectDB } from "@/lib/db";
import Project from "@/models/projects";

export async function GET(req, { params }) {
  await connectDB();

  try {
    const { id } = await params;

    const project = await Project.findById(id);

    if (!project) {
      return Response.json(
        { message: "Project not found" },
        { status: 404 }
      );
    }

    return Response.json({
      gender_issue: project.gender_issue.comments,
      cause_gender_issue: project.cause_gender_issue.comments,
      gad_objective: project.gad_objective.comments,
      supporting_statistics_data: project.supporting_statistics_data.comments,
      relevant_agency: project.relevant_agency.comments,
      gad_activity: project.gad_activity.comments,
      performance_indicator_target: project.performance_indicator_target.comments,
      gad_budget: project.gad_budget.comments,
      source_budget: project.source_budget.comments,
      responsible_office: project.responsible_office.comments,
    });

  } catch (error) {
    return Response.json(
      { message: error.message },
      { status: 500 }
    );
  }
}


export async function POST(req, { params }) {
  await connectDB();

  try {
    const { id } = await params;
    const { field, message, type, userId } = await req.json();

    const project = await Project.findById(id);

    if (!project) {
      return Response.json({ message: "Project not found" }, { status: 404 });
    }

    if (!field || !message || !userId) {
      return Response.json({ message: "Missing required fields" }, { status: 400 });
    }

   const parts = field.split(".");
const baseField = parts[0];
const fieldIndex = parts[1] !== undefined ? Number(parts[1]) : null;

    const target = project[baseField];

    if (!target) {
      return Response.json({ message: "Field not found" }, { status: 400 });
    }

    if (!Array.isArray(target.comments)) {
      target.comments = [];
    }

    target.comments.push({
      userId,
      message,
      type,
      fieldIndex
    });

    project.markModified(baseField);
    await project.save();

    return Response.json({
      success: true,
      data: target.comments,
    });

  } catch (error) {
    return Response.json(
      { message: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  await connectDB();

  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);

    const fieldRaw = searchParams.get("field");
    const commentId = searchParams.get("commentId");

    if (!fieldRaw || !commentId) {
      return Response.json(
        { message: "Missing field or commentId" },
        { status: 400 }
      );
    }

    const project = await Project.findById(id);

    if (!project) {
      return Response.json(
        { message: "Project not found" },
        { status: 404 }
      );
    }

    // ✅ FIX: remove ".0" or ".1" safely
    const baseField = fieldRaw.split(".")[0];

    const target = project[baseField];

    if (!target || !Array.isArray(target.comments)) {
      return Response.json(
        { message: "Invalid field or no comments found" },
        { status: 400 }
      );
    }

    // ✅ delete comment correctly
    target.comments = target.comments.filter(
      (c) => c._id.toString() !== commentId
    );

    project.markModified(baseField);
    await project.save();

    return Response.json({
      success: true,
      data: target.comments,
    });
  } catch (error) {
    return Response.json(
      { message: error.message },
      { status: 500 }
    );
  }
}