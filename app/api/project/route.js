import { connectDB } from "@/lib/db";
import Project from "@/models/projects";
import "@/models/event";
import "@/models/profile";
import GPB from "@/models/gpb";
import GAABudget from "@/models/gaa_budget";
import UserAuth from "@/models/user";
import { logActivity } from "@/lib/activityLog";
import { requireAuth } from "@/lib/auth";
import { findDuplicates } from "@/lib/duplicateDetection";
import { normalizeRefNumber, nextRefNumber } from "@/lib/referenceNumber";
import {
  PROJECT_EVENTS_POPULATE,
  withGeneratedAccomplishment,
} from "@/lib/accomplishmentSummary";
import {
  NO_BUDGET_WARNING,
  OVER_BUDGET_WARNING,
  buildBudgetSummary,
} from "@/lib/budgetLinking";
import { deleteFileFromBucket } from "@/lib/delete";
import { deleteEventCascade } from "@/lib/eventCascade";
import { NextResponse } from "next/server";

export async function GET(req) {
  const { error, status } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });

  await connectDB();
  /* Events are deep-populated so the actual accomplishment can be derived live
     from linked events + attendance instead of a stale saved snapshot. */
  const projects = await Project.find().populate(PROJECT_EVENTS_POPULATE);
  return Response.json({ data: projects.map(withGeneratedAccomplishment) });
}

export async function POST(req) {
  const { error, status } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });

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

  let overBudgetWarning = null;
  let budgetSummary = null;

  if (budget) {
    const used = await Project.aggregate([
      { $match: { year } },
      { $group: { _id: null, total: { $sum: "$gad_budget.value" } } },
    ]);

    const usedBudget = used[0]?.total || 0;
    const remainingBudget = budget.gadAnnualBudget - usedBudget;

    if (requestedBudget > remainingBudget) {
      overBudgetWarning = OVER_BUDGET_WARNING;
      budgetSummary = buildBudgetSummary({
        budget,
        usedBudget: usedBudget + requestedBudget,
      });
    }
  }

  /* Callers may supply their own reference number (e.g. copied from a printed
     GPB); otherwise the next free `GPB-<year>-<seq>` is assigned below. */
  const providedRef = normalizeRefNumber(body.reference_number);

  if (providedRef) {
    const clash = await Project.exists({ year, reference_number: providedRef });
    if (clash) {
      return Response.json(
        {
          message: `Reference number ${providedRef} is already used by another ${year} project.`,
        },
        { status: 409 },
      );
    }
  }

  const projectData = {
    year,
    reference_number: providedRef || null,
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

    /* Index-paired with `gad_activity`; always stored as an array so the
       pair stays aligned when a project is edited. */
    gad_activity_description: {
      value: Array.isArray(body.gad_activity_description)
        ? body.gad_activity_description
        : [body.gad_activity_description || ""],
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
      value: Array.isArray(body.responsible_office)
        ? body.responsible_office.filter(Boolean)
        : [body.responsible_office || ""].filter(Boolean),
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

  /* Auto-assigned numbers can collide when two projects are created at the same
     moment; the unique index rejects the loser and we retry with the next one. */
  const MAX_REF_ATTEMPTS = 3;
  let project = null;
  let lastRefError = null;

  for (let attempt = 0; attempt < MAX_REF_ATTEMPTS; attempt += 1) {
    if (!providedRef) {
      const usedRefs = await Project.find({ year }).select("reference_number");
      projectData.reference_number = nextRefNumber(
        year,
        usedRefs.map((doc) => doc.reference_number),
      );
    }

    try {
      project = await Project.create(projectData);
      break;
    } catch (err) {
      lastRefError = err;

      if (err?.code === 11000) {
        /* A custom number lost the race — report it like the upfront check. */
        if (providedRef) {
          return Response.json(
            {
              message: `Reference number ${providedRef} is already used by another ${year} project.`,
            },
            { status: 409 },
          );
        }

        continue;
      }

      throw err;
    }
  }

  if (!project) throw lastRefError;

  await logActivity({
    req,
    action: "PROJECT_CREATE",
    description: `GPB project created for year ${year}`,
    resource_type: "project",
    resource_id: project._id,
    severity: "info",
    metadata: { year, actorId },
  });

  const setOnInsert = { year };
  if (budget) {
    setOnInsert.gaaBudgetId = budget._id;
  }

  const gpb = await GPB.findOneAndUpdate(
    { year },
    {
      $setOnInsert: setOnInsert,
    },
    { new: true, upsert: true },
  );

  await GPB.updateOne(
    { _id: gpb._id },
    { $addToSet: { projects: project._id } },
  );

  let duplicateWarnings = [];
  try {
    const existingProjects = await Project.find({ year, _id: { $ne: project._id } })
      .select("gender_issue");
    duplicateWarnings = findDuplicates(body.gender_issue, existingProjects, 0.7);
  } catch (err) {
    console.error("Duplicate check error:", err);
  }

  return Response.json({
    message: "Project created successfully",
    data: project,
    duplicateWarnings,
    ...(budget ? {} : { warning: NO_BUDGET_WARNING }),
    ...(overBudgetWarning ? { warning: overBudgetWarning, budgetSummary } : {}),
  });
}

export async function DELETE(req) {
  const { error, status } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });

  await connectDB();

  /* Capture the linked events and evidence keys before wiping the projects so
     the bulk delete does not leave orphaned events in the calendar or orphaned
     files in the bucket. */
  const doomed = await Project.find({}).select(
    "events expenditure_evidence milestones",
  );
  const eventIds = doomed.flatMap((p) =>
    Array.isArray(p.events) ? p.events : [],
  );
  const evidenceKeys = doomed
    .flatMap((p) => [
      ...(Array.isArray(p.expenditure_evidence) ? p.expenditure_evidence : []),
      ...(Array.isArray(p.milestones) ? p.milestones : []).flatMap((m) =>
        Array.isArray(m?.proofs) ? m.proofs : [],
      ),
    ])
    .map((file) => file?.key)
    .filter(Boolean);

  await GPB.updateMany({}, { $set: { projects: [] } });

  const result = await Project.deleteMany({});

  let deletedEvents = 0;
  for (const eventId of eventIds) {
    const cascade = await deleteEventCascade(eventId);
    if (cascade.deleted) deletedEvents += 1;
  }

  let deletedEvidenceFiles = 0;
  for (const key of evidenceKeys) {
    try {
      await deleteFileFromBucket(key);
      deletedEvidenceFiles += 1;
    } catch (err) {
      console.error(`Failed to delete evidence file ${key}:`, err);
    }
  }

  await logActivity({
    req,
    action: "PROJECT_BULK_DELETE",
    description: `All GPB projects deleted (${result.deletedCount})`,
    resource_type: "project",
    severity: "critical",
    metadata: { deletedCount: result.deletedCount, deletedEvents, deletedEvidenceFiles },
  });

  return Response.json({
    message: "All projects deleted successfully",
    deletedCount: result.deletedCount,
    deletedEvents,
    deletedEvidenceFiles,
  });
}
