import { connectDB } from "@/lib/db";
import Project from "@/models/projects";
import "@/models/event";

export async function GET(req) {
  await connectDB();
  const projects = await Project.find().populate("events");
  return Response.json({ data: projects });
}

export async function POST(req) {
  await connectDB();
  const body = await req.json();
  const project = await Project.create(body);
  return Response.json({ data: project });
}
