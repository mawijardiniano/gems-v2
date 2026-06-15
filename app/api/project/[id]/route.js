import { connectDB } from "@/lib/db";
import Project from "@/models/projects";

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

    await project.save();

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
