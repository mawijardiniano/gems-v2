import { connectDB } from "@/lib/db";
import Project from "@/models/projects";
import "@/models/event";
import GPB from "@/models/gpb";
import GAABudget from "@/models/gaa_budget";
import UserAuth from "@/models/user";
import { logActivity } from "@/lib/activityLog";

export async function GET(req) {
  await connectDB();
  const projects = await Project.find().populate("events");
  return Response.json({ data: projects });
}

export async function POST(req) {
  await connectDB();

  const body = await req.json();
  const year = Number(body.year);
  const requestedBudget = Number(body.gad_budget || 0);
  const actorId = body.userId || null;

  if (Number.isNaN(year)) {
    return Response.json({ message: "Invalid year" }, { status: 400 });
  }

  if (Number.isNaN(requestedBudget)) {
    return Response.json({ message: "Invalid GAD budget" }, { status: 400 });
  }

  const budget = await GAABudget.findOne({ year });

  if (!budget) {
    return Response.json(
      { message: "No GAA Budget found for this year" },
      { status: 400 },
    );
  }

  const used = await Project.aggregate([
    { $match: { year } },
    { $group: { _id: null, total: { $sum: "$gad_budget.value" } } },
  ]);

  const usedBudget = used[0]?.total || 0;
  const remainingBudget = budget.gadAnnualBudget - usedBudget;

  if (requestedBudget > remainingBudget) {
    return Response.json(
      {
        message: "Insufficient GAD budget",
        budgetSummary: {
          totalBudget: budget.gadAnnualBudget,
          usedBudget,
          remainingBudget,
          requested: requestedBudget,
        },
      },
      { status: 400 },
    );
  }

  const projectData = {
    year,
    project_type: {
      value: body.project_type || "",
    },

    gender_issue: {
      value: body.gender_issue || "",
    },

    cause_gender_issue: {
      value: Array.isArray(body.cause_gender_issue)
        ? body.cause_gender_issue
        : [body.cause_gender_issue || ""],
    },

    gad_objective: {
      value: Array.isArray(body.gad_objective)
        ? body.gad_objective
        : [body.gad_objective || ""],
    },

    supporting_statistics_data: {
      value: body.supporting_statistics_data || "",
    },

    relevant_agency: {
      value: body.relevant_agency || "",
    },

    gad_activity: {
      value: Array.isArray(body.gad_activity)
        ? body.gad_activity
        : [body.gad_activity || ""],
    },

    performance_indicator_target: {
      value: Array.isArray(body.performance_indicator_target)
        ? body.performance_indicator_target
        : [body.performance_indicator_target || ""],
    },

    gad_budget: {
      value: requestedBudget,
    },

    source_budget: {
      value: body.source_budget || "",
    },

    responsible_office: {
      value: body.responsible_office || "",
    },

    createdBy: actorId,
    lastUpdatedBy: actorId,

    events: body.events || [],
  };

  if (actorId) {
    const actorExists = await UserAuth.exists({ _id: actorId });
    if (!actorExists) {
      projectData.createdBy = null;
      projectData.lastUpdatedBy = null;
    }
  }

  const project = await Project.create(projectData);

  await logActivity({
    req,
    action: "PROJECT_CREATE",
    description: `GPB project created for year ${year}`,
    resource_type: "project",
    resource_id: project._id,
    severity: "info",
    metadata: { year, actorId },
  });

  const gpb = await GPB.findOneAndUpdate(
    { year },
    {
      $setOnInsert: {
        year,
        gaaBudgetId: budget._id,
      },
    },
    { new: true, upsert: true },
  );

  await GPB.updateOne(
    { _id: gpb._id },
    { $addToSet: { projects: project._id } },
  );

  return Response.json({
    message: "Project created successfully",
    data: project,
  });
}

export async function DELETE() {
  await connectDB();

  await GPB.updateMany({}, { $set: { projects: [] } });

  const result = await Project.deleteMany({});

  await logActivity({
    req,
    action: "PROJECT_BULK_DELETE",
    description: `All GPB projects deleted (${result.deletedCount})`,
    resource_type: "project",
    severity: "critical",
    metadata: { deletedCount: result.deletedCount },
  });

  return Response.json({
    message: "All projects deleted successfully",
    deletedCount: result.deletedCount,
  });
}
