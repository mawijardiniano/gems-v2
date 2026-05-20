import { connectDB } from "@/lib/db";
import Project from "@/models/project";

export async function POST(req, { params }) {
  await connectDB();

  try {
    const { id } = await params;
    const { field, userId, message, type } = await req.json();

    if (!field || !userId || !message) {
      return Response.json(
        { error: "field, userId and message are required" },
        { status: 400 }
      );
    }

    const project = await Project.findById(id);
    if (!project) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    // Parse dot notation e.g. "cause_gender_issue.0"
    const dotIndex = field.lastIndexOf(".");
    const hasIndex =
      dotIndex !== -1 && !isNaN(Number(field.slice(dotIndex + 1)));

    const baseField = hasIndex ? field.slice(0, dotIndex) : field;
    const itemIndex = hasIndex ? Number(field.slice(dotIndex + 1)) : null;

    if (!project[baseField]) {
      return Response.json({ error: "Field not found" }, { status: 404 });
    }

    const newComment = {
      userId,
      message,
      type,
      ...(itemIndex !== null && { fieldIndex: itemIndex }),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    project[baseField].comments.push(newComment);
    project.markModified(baseField);
    await project.save();

    return Response.json({
      success: true,
      comment: project[baseField].comments[
        project[baseField].comments.length - 1
      ],
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  await connectDB();

  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const field = searchParams.get("field");
    const commentId = searchParams.get("commentId");

    if (!field || !commentId) {
      return Response.json(
        { error: "field and commentId are required" },
        { status: 400 }
      );
    }

    const project = await Project.findById(id);
    if (!project) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    // Parse dot notation — base field is everything before the last dot
    const dotIndex = field.lastIndexOf(".");
    const hasIndex =
      dotIndex !== -1 && !isNaN(Number(field.slice(dotIndex + 1)));
    const baseField = hasIndex ? field.slice(0, dotIndex) : field;

    if (!project[baseField]?.comments) {
      return Response.json({ error: "Field not found" }, { status: 404 });
    }

    project[baseField].comments = project[baseField].comments.filter(
      (c) => c._id.toString() !== commentId
    );

    project.markModified(baseField);
    await project.save();

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}