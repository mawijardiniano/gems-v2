import { connectDB } from "@/lib/db";
import Project from "@/models/projects";

export async function GET(req, { params }) {
  await connectDB();
  const { id } = await params;
  const projects = await Project.findById(id).populate("events");
  if (!projects) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ data: projects });
}

export async function PUT(req, { params }) {
  await connectDB();
  const { id } = await params;
  const body = await req.json();
  const projects = await Project.findByIdAndUpdate(id, body, {
    new: true,
  });
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
