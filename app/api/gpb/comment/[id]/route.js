import { connectDB } from "@/lib/db";
import Project from "@/models/projects";
import GPB from "@/models/gpb";
export async function POST(req, { params }) {
  await connectDB();

  try {
    const { id } = params;
    const { fields, userId, message, type } = await req.json();

    if (!fields?.length || !userId || !message) {
      return Response.json(
        { error: "fields, userId and message are required" },
        { status: 400 }
      );
    }

    const gpb = await GPB.findOne({ "projects._id": id });

    if (!gpb) {
      return Response.json({ error: "GPB not found" }, { status: 404 });
    }

    const project = gpb.projects.id(id);

    if (!project) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    const newComment = {
      userId,
      message,
      type,
      fields,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    project.comments.push(newComment);

    await gpb.save();

    return Response.json({
      success: true,
      comment: project.comments.at(-1),
    });
  } catch (error) {
    console.error("COMMENT API ERROR:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  await connectDB();

  try {
    const { id } = params;
    const { searchParams } = new URL(req.url);
    const commentId = searchParams.get("commentId");

    if (!commentId) {
      return Response.json(
        { error: "commentId is required" },
        { status: 400 }
      );
    }

const gpb = await GPB.findOne({ "projects._id": id });
const project = gpb.projects.id(id);
    if (!project) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

project.comments = project.comments.filter(
  (c) => c._id.toString() !== commentId
);

await gpb.save();

    return Response.json({ success: true });
  } catch (error) {
    console.error("DELETE COMMENT ERROR:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}