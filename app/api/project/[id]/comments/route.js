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

  const { id } = await params;
  const body = await req.json();

  const { field, message, type, userId } = body;

  const project = await Project.findById(id);

  if (!project) {
    return Response.json(
      { message: "Project not found" },
      { status: 404 }
    );
  }

  project[field].comments.push({
    userId,
    message,
    type,
  });

  await project.save();

  return Response.json({
    message: "Comment added successfully",
    data: project[field].comments,
  });
}

export async function DELETE(req, { params }) {
  await connectDB();

  const { id } = await params;
  const { searchParams } = new URL(req.url);

  const field = searchParams.get("field");
  const commentId = searchParams.get("commentId");

  try {
    const project = await Project.findById(id);

    if (!project) {
      return Response.json(
        { message: "Project not found" },
        { status: 404 }
      );
    }

    if (!field || !commentId) {
      return Response.json(
        { message: "Missing field or commentId" },
        { status: 400 }
      );
    }

    if (!project[field] || !project[field].comments) {
      return Response.json(
        { message: "Invalid field" },
        { status: 400 }
      );
    }

    project[field].comments = project[field].comments.filter(
      (c) => c._id.toString() !== commentId
    );

    await project.save();

    return Response.json({
      message: "Comment deleted successfully",
      data: project[field].comments,
    });
  } catch (err) {
    return Response.json(
      { message: err.message },
      { status: 500 }
    );
  }
}