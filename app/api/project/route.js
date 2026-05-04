import { connectDB } from "@/lib/db";
import Project from "@/models/projects";
import "@/models/event";
import GPB from "@/models/gpb"
import GAABudget from "@/models/gaa_budget";

export async function GET(req) {
  await connectDB();
  const projects = await Project.find().populate("events");
  return Response.json({ data: projects });
}


export async function POST(req) {
  await connectDB();

  const body = await req.json();

  const budget = await GAABudget.findOne({ year: body.year });

  if (!budget) {
    return Response.json(
      { message: "No GAABudget found for this year" },
      { status: 400 }
    );
  }

  const used = await Project.aggregate([
    { $match: { year: body.year } },
    { $group: { _id: null, total: { $sum: "$gad_budget.value" } } }
  ]);

  const usedBudget = used[0]?.total || 0;
  const remainingBudget = budget.gadAnnualBudget - usedBudget;

  if (body.gad_budget > remainingBudget) {
    return Response.json(
      {
        message: "Insufficient GAD budget",
        budgetSummary: {
          totalBudget: budget.gadAnnualBudget,
          usedBudget,
          remainingBudget,
          requested: body.gad_budget
        }
      },
      { status: 400 }
    );
  }

  const projectData = {
    year: body.year,

    gender_issue: {
      value: body.gender_issue,
      comments: [],
    },

    cause_gender_issue: {
      value: body.cause_gender_issue,
      comments: [],
    },

    gad_objective: {
      value: body.gad_objective,
      comments: [],
    },

    supporting_statistics_data: {
      value: body.supporting_statistics_data,
      comments: [],
    },

    relevant_agency: {
      value: body.relevant_agency,
      comments: [],
    },

    gad_activity: {
      value: body.gad_activity,
      comments: [],
    },

    performance_indicator_target: {
      value: body.performance_indicator_target,
      comments: [],
    },

    gad_budget: {
      value: body.gad_budget,
      comments: [],
    },

    source_budget: {
      value: body.source_budget,
      comments: [],
    },

    responsible_office: {
      value: body.responsible_office,
      comments: [],
    },

    events: body.events || [],
  };

  const project = await Project.create(projectData);

  const gpb = await GPB.findOneAndUpdate(
    { year: body.year },
    {
      $setOnInsert: {
        year: body.year,
        gaaBudgetId: budget._id,
      },
    },
    { new: true, upsert: true }
  );

  await GPB.updateOne(
    { _id: gpb._id },
    { $addToSet: { projects: project._id } }
  );

  return Response.json({
    message: "Project created successfully",
    data: project,
  });
}

export async function DELETE() {
  await connectDB();

  await GPB.updateMany(
    {},
    { $set: { projects: [] } }
  );

  const result = await Project.deleteMany({});

  return Response.json({
    message: "All projects deleted successfully",
    deletedCount: result.deletedCount,
  });
}


// export async function POST(req) {
//   await connectDB();

//   const body = await req.json();
//   const project = await Project.create(body);

//   let gpb = await GPB.findOne({ year: project.year });

//   if (!gpb) {
//     gpb = await GPB.create({ year: project.year });
//   }

//   await GPB.findByIdAndUpdate(gpb._id, {
//     $addToSet: { projects: project._id },
//   });

//   return Response.json({
//     message: "Project created and linked to GPB",
//     data: project,
//   });
// }