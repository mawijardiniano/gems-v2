import { parseGanttActivities } from "@/data/lib/ganttParse.js";

import { connectDB } from "@/data/lib/db";
import {
  createNotifications,
  getPlanningDirectorIds,
  normalizeRole,
} from "@/data/lib/notifications";
import Project from "@/models/projects";
import "@/models/event";
import "@/models/profile";
import { logActivity } from "@/data/lib/activityLog";
import { requireAuth } from "@/data/lib/auth";
import { findDuplicates } from "@/data/lib/duplicateDetection";
import {
  withGeneratedAccomplishment,
  hydrateProjectAttendanceSex,
} from "@/data/lib/accomplishmentSummary";
import { normalizeRefNumber } from "@/data/lib/referenceNumber";
import { deleteFileFromBucket } from "@/data/lib/delete";
import { deleteEventCascade } from "@/data/lib/eventCascade";
import GPB from "@/models/gpb";
import Event from "@/models/event";
import { NextResponse } from "next/server";
import { parseAppDate } from "@/data/lib/appTime";
import mongoose from "mongoose";
import {
  GPB_LOCKED_MESSAGE,
  canManageProject,
  canViewProjectDetails,
  isGpbLocked,
  planFieldsTouched,
} from "@/data/lib/projectAccess";
import {
  collectProjectFileKeys,
  findForeignProjectKey,
} from "@/data/lib/projectFileKeys";

const PROJECT_STATUSES = ["for-review", "ongoing", "completed"];

const MILESTONE_STATUSES = ["pending", "ongoing", "completed"];

const MAX_MILESTONES = 50;

const MAX_MILESTONE_PROOFS = 10;

/* Optional free-text approval metadata (approved resolution # + other details) */
const APPROVAL_TEXT_FIELDS = ["approved_resolution_no", "other_details"];

const MAX_APPROVAL_TEXT_LENGTH = 500;

/** Returns the Date for a valid input, null for empty input, or undefined when invalid. */
/* "YYYY-MM-DD" from a form is that Manila day (data/lib/appTime.js); it used
   to be stored as UTC midnight. */
const parseDateInput = parseAppDate;

/** Validates and normalizes the proof files attached to a milestone. */
const parseMilestoneProofs = (input) => {
  if (input === undefined || input === null) return { proofs: [] };
  if (!Array.isArray(input)) return { error: "invalid proof files" };

  const proofs = input
    .filter(
      (file) => file && typeof file === "object" && (file.url || file.key),
    )
    .map((file) => ({
      url: file.url || "",
      key: file.key || "",
      name: file.name || null,
    }));

  if (proofs.length > MAX_MILESTONE_PROOFS) {
    return { error: `too many proof files (max ${MAX_MILESTONE_PROOFS})` };
  }

  return { proofs };
};

/** Validates and normalizes an incoming milestones array. */
const parseMilestones = (input) => {
  if (!Array.isArray(input)) {
    return { error: "Invalid milestones payload" };
  }

  if (input.length > MAX_MILESTONES) {
    return { error: `Too many milestones (max ${MAX_MILESTONES})` };
  }

  const milestones = [];

  for (const raw of input) {
    if (!raw || typeof raw !== "object") {
      return { error: "Invalid milestone entry" };
    }

    const title = String(raw.title ?? "").trim();
    if (!title) {
      return { error: "Each milestone needs a title/activity" };
    }
    if (title.length > 300) {
      return { error: "Milestone title is too long (max 300 characters)" };
    }

    const targetDate = parseDateInput(raw.target_date);
    if (targetDate === undefined) {
      return { error: `Invalid target date for milestone "${title}"` };
    }

    const actualDate = parseDateInput(raw.actual_date);
    if (actualDate === undefined) {
      return { error: `Invalid actual date for milestone "${title}"` };
    }

    const status = String(raw.status ?? "pending")
      .trim()
      .toLowerCase();
    if (!MILESTONE_STATUSES.includes(status)) {
      return { error: `Invalid status for milestone "${title}"` };
    }

    const parsedProofs = parseMilestoneProofs(raw.proofs);
    if (parsedProofs.error) {
      return { error: `Milestone "${title}": ${parsedProofs.error}` };
    }

    /* A milestone can only be completed when proof of completion is attached. */
    if (status === "completed" && parsedProofs.proofs.length === 0) {
      return {
        error: `Milestone "${title}" is marked completed — upload at least one proof file`,
      };
    }

    milestones.push({
      title,
      target_date: targetDate,
      actual_date: actualDate,
      status,
      proofs: parsedProofs.proofs,
      source_activity: String(raw.source_activity ?? "")
        .trim()
        .slice(0, 300),
    });
  }

  return { milestones };
};

export async function PUT(req, { params }) {
  const { error, status, user } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });
  await connectDB();

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const project = await Project.findById(id);

    if (!project) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    /* Every change — plan fields, actuals, schedule, milestones, Gantt,
       approval details — needs the project's creator, a GAD Focal Person or
       an Admin. Only some of those used to be checked; the rest (budget,
       gender issue, offices, Gantt) were open to any signed-in account. */
    if (!canManageProject(user, project)) {
      return Response.json(
        {
          error:
            "Only the project's creator, a GAD Focal Person or an Admin can change this project",
        },
        { status: 403 },
      );
    }

    /* An approved GPB freezes the plan itself. Implementation records
       (actuals, milestones, schedule and status, Gantt) stay editable. */
    if (planFieldsTouched(body).length > 0) {
      const gpb = await GPB.findOne({ year: project.year })
        .select("status_of_gpb.status")
        .lean();
      if (isGpbLocked(gpb)) {
        return Response.json({ error: GPB_LOCKED_MESSAGE }, { status: 409 });
      }
    }

    /* Evidence and proof keys are deleted with the project, so they must be
       the caller's own uploads or already on this project. */
    if (findForeignProjectKey(body, { userId: user._id, existing: project })) {
      return Response.json(
        { error: "One of the attached files was not uploaded by you." },
        { status: 400 },
      );
    }

    if (body.gad_budget !== undefined) {
      const amount = Number(body.gad_budget?.value ?? body.gad_budget);
      if (!Number.isFinite(amount) || amount < 0) {
        return Response.json(
          { error: "GAD budget must be zero or a positive amount" },
          { status: 400 },
        );
      }
    }
    if (body.actual_expenditures !== undefined) {
      const spent = Number(body.actual_expenditures);
      if (!Number.isFinite(spent) || spent < 0) {
        return Response.json(
          { error: "Actual expenditures must be zero or a positive amount" },
          { status: 400 },
        );
      }
    }

    const mergeField = (key) => {
      if (body[key] === undefined) return;

      project[key] = {
        value: body[key]?.value !== undefined ? body[key].value : body[key],
      };
    };

    mergeField("project_type");
    mergeField("gender_issue");
    mergeField("cause_gender_issue");
    mergeField("gad_objective");
    mergeField("supporting_statistics_data");
    mergeField("relevant_agency");
    mergeField("gad_activity");
    mergeField("gad_activity_description");
    mergeField("performance_indicator_target");
    mergeField("gad_budget");
    mergeField("source_budget");
    if (body.responsible_office !== undefined) {
      const raw = body.responsible_office?.value ?? body.responsible_office;
      project.responsible_office = {
        value: Array.isArray(raw)
          ? raw.filter(Boolean)
          : [raw || ""].filter(Boolean),
      };
    }

    /* Approval metadata: optional free text — only the length is validated */
    for (const key of APPROVAL_TEXT_FIELDS) {
      if (body[key] === undefined) continue;

      const text = String(body[key]?.value ?? body[key] ?? "").trim();

      if (text.length > MAX_APPROVAL_TEXT_LENGTH) {
        return Response.json(
          {
            error: `${
              key === "approved_resolution_no"
                ? "Approved resolution number"
                : "Other details"
            } is too long (max ${MAX_APPROVAL_TEXT_LENGTH} characters)`,
          },
          { status: 400 },
        );
      }

      project[key] = { value: text };
    }

    if (body.project_status !== undefined) {
      const nextStatus = String(body.project_status || "").trim();
      if (!PROJECT_STATUSES.includes(nextStatus)) {
        return Response.json(
          { error: "Invalid project status" },
          { status: 400 },
        );
      }
      project.project_status = nextStatus;
    }

    if (body.milestones !== undefined) {
      const parsedMilestones = parseMilestones(body.milestones);
      if (parsedMilestones.error) {
        return Response.json(
          { error: parsedMilestones.error },
          { status: 400 },
        );
      }
      project.milestones = parsedMilestones.milestones;
    }

    if (body.gantt_activities !== undefined) {
      const parsedGantt = parseGanttActivities(
        body.gantt_activities,
        parseDateInput,
      );
      if (parsedGantt.error) {
        return Response.json({ error: parsedGantt.error }, { status: 400 });
      }
      project.gantt_activities = parsedGantt.activities;
    }

    if (body.start_date !== undefined) {
      const parsedStart = parseDateInput(body.start_date);
      if (parsedStart === undefined) {
        return Response.json({ error: "Invalid start date" }, { status: 400 });
      }
      project.start_date = parsedStart;
    }

    if (body.end_date !== undefined) {
      const parsedEnd = parseDateInput(body.end_date);
      if (parsedEnd === undefined) {
        return Response.json({ error: "Invalid end date" }, { status: 400 });
      }
      project.end_date = parsedEnd;
    }

    if (
      project.start_date &&
      project.end_date &&
      project.end_date.getTime() < project.start_date.getTime()
    ) {
      return Response.json(
        { error: "End date must be on or after the start date" },
        { status: 400 },
      );
    }

    /* `actual_accomplishment_override` decides whether the saved text is kept as
       manual override (true) or the accomplishment is derived from linked events
       (false). Resetting to auto clears the stored snapshot so nothing stale shows. */
    if (
      body.actual_accomplishment !== undefined ||
      body.actual_accomplishment_override !== undefined
    ) {
      const override =
        body.actual_accomplishment_override !== undefined
          ? Boolean(body.actual_accomplishment_override)
          : Boolean(project.actual_accomplishment_override);

      project.actual_accomplishment_override = override;

      if (!override) {
        project.actual_accomplishment = [];
      } else if (body.actual_accomplishment !== undefined) {
        project.actual_accomplishment = Array.isArray(
          body.actual_accomplishment,
        )
          ? body.actual_accomplishment
          : [body.actual_accomplishment || ""];
      }
    }
    if (body.actual_expenditures !== undefined) {
      project.actual_expenditures = Number(body.actual_expenditures) || 0;
    }
    if (body.expenditure_evidence !== undefined) {
      project.expenditure_evidence = Array.isArray(body.expenditure_evidence)
        ? body.expenditure_evidence
            .filter((f) => f && (f.url || f.key))
            .map((f) => ({
              url: f.url || "",
              key: f.key || "",
              name: f.name || null,
            }))
        : [];
    }

    /* Reference numbers are normally assigned automatically; this allows an
       explicit correction while keeping them unique within the same year. */
    if (body.reference_number !== undefined) {
      const nextRef = normalizeRefNumber(body.reference_number);

      if (nextRef) {
        const clash = await Project.exists({
          year: project.year,
          reference_number: nextRef,
          _id: { $ne: project._id },
        });

        if (clash) {
          return Response.json(
            {
              message: `Reference number ${nextRef} is already used by another ${project.year} project.`,
            },
            { status: 409 },
          );
        }
      }

      project.reference_number = nextRef || null;
    }

    const actor = user;
    project.lastUpdatedBy = actor._id;

    await project.save();

    await logActivity({
      req,
      action: "PROJECT_UPDATE",
      description: `GPB project updated for year ${project.year}`,
      resource_type: "project",
      resource_id: id,
      severity: "info",
      metadata: {
        year: project.year,
        updatedFields: Object.keys(body).filter((key) => key !== "userId"),
      },
    });

    if (actor && normalizeRole(actor.role) !== "planning director") {
      const planningDirectorIds = await getPlanningDirectorIds(actor._id);

      await createNotifications({
        recipientIds: planningDirectorIds,
        senderId: actor._id,
        type: "project_updated",
        title: "Project updated",
        message: `${actor.username} updated a GPB project for year ${project.year}.`,
        projectId: project._id,
        metadata: {
          year: project.year,
          updatedFields: Object.keys(body).filter((key) => key !== "userId"),
        },
      });
    }

    let duplicateWarnings = [];
    try {
      const existingProjects = await Project.find({
        year: project.year,
        _id: { $ne: id },
      }).select("gender_issue");
      duplicateWarnings = findDuplicates(
        body.gender_issue,
        existingProjects,
        0.7,
      );
    } catch (err) {
      console.error("Duplicate check error:", err);
    }

    return Response.json({ data: project, duplicateWarnings });
  } catch (err) {
    console.error("PUT error:", err);
    /* Bad input is the caller's (400); anything else must not leak internals. */
    const clientError =
      err?.name === "ValidationError" || err?.name === "CastError";
    return Response.json(
      { error: clientError ? "Invalid project data" : "Update failed" },
      { status: clientError ? 400 : 500 },
    );
  }
}

export async function GET(req, { params }) {
  const { error, status, user } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });
  await connectDB();
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  /* Attendance, budgets and actuals are for roles with the GPB or project
     pages, and for the people who may manage this project. */
  const basic = await Project.findById(id).select("createdBy").lean();
  if (!basic) return Response.json({ error: "Not found" }, { status: 404 });
  if (!canViewProjectDetails(user.role) && !canManageProject(user, basic)) {
    return Response.json(
      { error: "You are not allowed to view this project." },
      { status: 403 },
    );
  }
  const projects = await Project.findById(id).populate({
    path: "events",
    model: "Event",
    populate: {
      path: "attended_users.user_id",
      model: "UserAuth",
      select: "username role personal_info_id",
      populate: {
        path: "personal_info_id",
        model: "GemsProfile",
        /* `sexAtBirth` is filled from the vault below; `vaultRef` is what
           makes that lookup possible. Only real schema paths are projected:
           `gadData.sexAtBirth` and `personal.currentStatus` were removed from
           GemsProfile, and projecting them dropped the joined profile entirely. */
        select: "vaultRef",
      },
    },
  });
  if (!projects) return Response.json({ error: "Not found" }, { status: 404 });
  await hydrateProjectAttendanceSex(projects);
  return Response.json({ data: withGeneratedAccomplishment(projects) });
}

export async function DELETE(req, { params }) {
  const { error, status, user } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });
  await connectDB();
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const project = await Project.findById(id);
  if (!project) return Response.json({ error: "Not found" }, { status: 404 });

  /* Deleting cascades to events, reports and files, so it needs the
     project's creator, a GAD Focal Person or an Admin — it used to need only
     a signed-in account. */
  if (!canManageProject(user, project)) {
    return Response.json(
      {
        error:
          "Only the project's creator, a GAD Focal Person or an Admin can delete this project",
      },
      { status: 403 },
    );
  }

  const gpb = await GPB.findOne({ year: project.year })
    .select("status_of_gpb.status")
    .lean();
  if (isGpbLocked(gpb)) {
    return Response.json({ error: GPB_LOCKED_MESSAGE }, { status: 409 });
  }

  await Project.deleteOne({ _id: project._id });

  /* Unlink it from every GPB, remove the events it owns (with their files and
     reports) and delete the evidence + milestone proof files it stored. */
  await GPB.updateMany({}, { $pull: { projects: project._id } });

  /* Only events that point back at this project are its own. An id that
     merely sits in `project.events` (older data, or a client-supplied list)
     may be somebody else's event and is unlinked, not deleted. */
  const linkedIds = Array.isArray(project.events) ? project.events : [];
  const ownedEvents = await Event.find({
    _id: { $in: linkedIds },
    project: project._id,
  })
    .select("_id")
    .lean();
  let deletedEvents = 0;
  for (const { _id: eventId } of ownedEvents) {
    const result = await deleteEventCascade(eventId);
    if (result.deleted) deletedEvents += 1;
  }

  let deletedEvidenceFiles = 0;
  for (const key of collectProjectFileKeys(project)) {
    try {
      await deleteFileFromBucket(key);
      deletedEvidenceFiles += 1;
    } catch (err) {
      console.error(`Failed to delete project file ${key}:`, err);
    }
  }

  await logActivity({
    req,
    action: "PROJECT_DELETE",
    description: `GPB project deleted`,
    resource_type: "project",
    resource_id: id,
    severity: "warning",
    metadata: {
      deletedEvents,
      deletedEvidenceFiles,
    },
  });

  return Response.json({
    data: project,
    deletedEvents,
    deletedEvidenceFiles,
  });
}
