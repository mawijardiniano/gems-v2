import { connectDB } from "@/data/lib/db";
import Project from "@/models/projects";
import "@/models/event";
import "@/models/profile";
import GPB from "@/models/gpb";
import { logActivity } from "@/data/lib/activityLog";
import { requireAuth } from "@/data/lib/auth";
import { findDuplicates } from "@/data/lib/duplicateDetection";
import { normalizeRefNumber, nextRefNumber } from "@/data/lib/referenceNumber";
import {
  PROJECT_EVENTS_POPULATE,
  withGeneratedAccomplishment,
  hydrateProjectAttendanceSex,
} from "@/data/lib/accomplishmentSummary";
import {
  NO_BUDGET_WARNING,
  OVER_BUDGET_WARNING,
} from "@/data/lib/budgetLinking";
import { computeYearBudgetSummary } from "@/data/lib/yearBudgetSummary";
import { clearProjectReportCaches } from "@/data/lib/cache";
import {
  PROJECT_PICKER_FIELDS,
  canViewProjectDetails,
  isGpbLocked,
  isProjectCreatorRole,
  GPB_LOCKED_MESSAGE,
} from "@/data/lib/projectAccess";
import { NextResponse } from "next/server";

export async function GET(req) {
  const { error, status, user } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });

  await connectDB();

  /* Roles without the GPB or project pages (a Dean picking a project for an
     event) get picker fields only: budgets and the attendance of linked
     events used to reach every signed-in account through this list. */
  if (!canViewProjectDetails(user.role)) {
    const picker = await Project.find().select(PROJECT_PICKER_FIELDS).lean();
    return Response.json({ data: picker });
  }

  /* Events are deep-populated so the actual accomplishment can be derived live
     from linked events + attendance instead of a stale saved snapshot. */
  const projects = await Project.find().populate(PROJECT_EVENTS_POPULATE);
  /* Sex counts come from the vault, not the encrypted legacy column. */
  await Promise.all(projects.map(hydrateProjectAttendanceSex));
  return Response.json({ data: projects.map(withGeneratedAccomplishment) });
}

/* Bad input (a field of the wrong type) is the caller's 400; anything else is
   a JSON 500 instead of an unhandled error. */
export async function POST(req) {
  try {
    return await createProject(req);
  } catch (err) {
    console.error("POST project error:", err);
    const clientError =
      err?.name === "ValidationError" || err?.name === "CastError";
    return Response.json(
      {
        message: clientError
          ? "Invalid project data"
          : "Unable to create the project.",
      },
      { status: clientError ? 400 : 500 },
    );
  }
}

async function createProject(req) {
  const { error, status, user } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });

  if (!isProjectCreatorRole(user.role)) {
    return Response.json(
      { message: "You are not allowed to add GPB projects." },
      { status: 403 },
    );
  }

  await connectDB();

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return Response.json({ message: "Invalid request body" }, { status: 400 });
  }
  const year = Number(body.year);
  const requestedBudget = Number(body.gad_budget || 0);
  /* The creator is whoever is signed in — never a userId from the body, which
     let anyone create projects in another person's name. */
  const actorId = user._id;

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return Response.json({ message: "Invalid year" }, { status: 400 });
  }

  if (!Number.isFinite(requestedBudget) || requestedBudget < 0) {
    return Response.json(
      { message: "GAD budget must be zero or a positive amount" },
      { status: 400 },
    );
  }

  /* An approved GPB is final: no projects are added until it is disapproved. */
  const yearGpb = await GPB.findOne({ year }).select("status_of_gpb.status").lean();
  if (isGpbLocked(yearGpb)) {
    return Response.json({ message: GPB_LOCKED_MESSAGE }, { status: 409 });
  }

  /* The same figures the GPB page shows (data/lib/yearBudgetSummary.js):
     the budget attached to the year's GPB and the projects in it. */
  const { summary: afterAdding, budget } = await computeYearBudgetSummary(
    year,
    { extraUsed: requestedBudget },
  );

  let overBudgetWarning = null;
  let budgetSummary = null;

  if (afterAdding.hasBudget && afterAdding.overBudget) {
    overBudgetWarning = OVER_BUDGET_WARNING;
    budgetSummary = afterAdding;
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

    /* Events are linked from the event side (POST/PUT /api/events checks
       that link); a client-supplied list let a project claim, and on delete
       destroy, somebody else's events. */
    events: [],
  };

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
  clearProjectReportCaches();

  let duplicateWarnings = [];
  try {
    const existingProjects = await Project.find({
      year,
      _id: { $ne: project._id },
    }).select("gender_issue");
    duplicateWarnings = findDuplicates(
      body.gender_issue,
      existingProjects,
      0.7,
    );
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
