import { connectDB } from "@/lib/db";
import GPB from "@/models/gpb";
import "@/models/event";
import "@/models/gaa_budget";
import Project from "@/models/projects";
import "@/models/profile";
import UserAuth from "@/models/user";
import { logActivity } from "@/lib/activityLog";

export async function GET(req, { params }) {
  await connectDB();

  const { year } = await params;
  const yearNum = Number(year);

  if (Number.isNaN(yearNum)) {
    return Response.json({ message: "Invalid year" }, { status: 400 });
  }

  const projectPopulate = [
    {
      path: "events",
      model: "Event",
    },
    {
      path: "comments.userId",
      model: "UserAuth",
      select: "username role personal_info_id",
      populate: { path: "personal_info_id", model: "GemsProfile" },
    },
  ];

  let gpb = await GPB.findOne({ year: yearNum })
    .populate({
      path: "projects",
      populate: projectPopulate,
    })
    .populate("gaaBudgetId");

  if (!gpb) {
    return Response.json({ message: "GPB not found" }, { status: 404 });
  }

  if (!Array.isArray(gpb.projects) || gpb.projects.length === 0) {
    const orphanProjects = await Project.find({ year: yearNum }).populate(
      projectPopulate,
    );

    if (orphanProjects.length > 0) {
      await GPB.updateOne(
        { _id: gpb._id },
        {
          $addToSet: {
            projects: { $each: orphanProjects.map((project) => project._id) },
          },
        },
      );

      const gpbObject = gpb.toObject();
      gpbObject.projects = orphanProjects;

      return Response.json({
        data: gpbObject,
        repairedProjectLinks: true,
      });
    }
  }

  return Response.json({ data: gpb });
}

export async function DELETE(req, { params }) {
  await connectDB();

  const { year } = await params;
  const yearNum = Number(year);

  if (Number.isNaN(yearNum)) {
    return Response.json({ message: "Invalid year" }, { status: 400 });
  }

  const gpb = await GPB.findOneAndDelete({
    year: yearNum,
  });

  if (!gpb) {
    return Response.json({ message: "GPB not found" }, { status: 404 });
  }

  await logActivity({
    req,
    action: "GPB_DELETE",
    description: `GPB deleted for year ${yearNum}`,
    resource_type: "gpb",
    resource_id: gpb._id,
    severity: "warning",
  });

  return Response.json({
    message: "GPB deleted successfully",
    data: gpb,
  });
}
