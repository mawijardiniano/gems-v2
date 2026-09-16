import { connectDB } from "@/lib/db";
import {
  createNotifications,
  getPlanningDirectorIds,
  normalizeRole,
} from "@/lib/notifications";
import Project from "@/models/projects";
import "@/models/event";
import "@/models/profile";
import { logActivity } from "@/lib/activityLog";
import { requireAuth } from "@/lib/auth";
import { findDuplicates } from "@/lib/duplicateDetection";
import { withGeneratedAccomplishment } from "@/lib/accomplishmentSummary";
import { deleteFileFromBucket } from "@/lib/delete";
import { deleteEventCascade } from "@/lib/eventCascade";
import GPB from "@/models/gpb";
import {NextResponse} from "next/server"

const PROJECT_STATUSES = ["for-review", "ongoing", "completed"];

const MILESTONE_STATUSES = ["pending", "ongoing", "completed"];

/* Roles (besides the creator) allowed to manage schedule, status and milestones */
const PROJECT_EDITOR_ROLES = ["gad focal person", "admin"];

const MAX_MILESTONES = 50;

/** Returns the Date for a valid input, null for empty input, or undefined when invalid. */
const parseDateInput = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
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

    const status = String(raw.status ?? "pending").trim().toLowerCase();
    if (!MILESTONE_STATUSES.includes(status)) {
      return { error: `Invalid status for milestone "${title}"` };
    }

    milestones.push({
      title,
      target_date: targetDate,
      actual_date: actualDate,
      status,
    });
  }

  return { milestones };
};

export async function PUT(req, { params }) {
    const { error, status, user } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });
  await connectDB();

  const { id } = await params;
  const body = await req.json();

  try {
    const project = await Project.findById(id);

    if (!project) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const touchesActuals =
      body.actual_accomplishment !== undefined ||
      body.actual_accomplishment_override !== undefined ||
      body.actual_expenditures !== undefined ||
      body.expenditure_evidence !== undefined;

    if (touchesActuals) {

      const creatorId = project.createdBy ? String(project.createdBy) : "";

      if (!user || creatorId !== String(user._id)) {
        return Response.json(
          { error: "Only the project creator can edit actuals" },
          { status: 403 },
        );
      }
    }

    const scheduleTouched =
      body.start_date !== undefined ||
      body.end_date !== undefined ||
      body.project_status !== undefined;
    const milestonesTouched = body.milestones !== undefined;

    if (scheduleTouched || milestonesTouched) {
      const creatorId = project.createdBy ? String(project.createdBy) : "";
      const isCreator = !!user && creatorId === String(user._id);
      const isProjectEditorRole = PROJECT_EDITOR_ROLES.includes(
        normalizeRole(user?.role),
      );

      if (!isCreator && !isProjectEditorRole) {
        return Response.json(
          {
            error:
              milestonesTouched && !scheduleTouched
                ? "Only the project creator or a GAD Focal Person can manage milestones"
                : "Only the project creator or a GAD Focal Person can set the schedule and status",
          },
          { status: 403 },
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
    mergeField("performance_indicator_target");
    mergeField("gad_budget");
    mergeField("source_budget");
    if (body.responsible_office !== undefined) {
      const raw = body.responsible_office?.value ?? body.responsible_office;
      project.responsible_office = {
        value: Array.isArray(raw) ? raw.filter(Boolean) : [raw || ""].filter(Boolean),
      };
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

    if (body.start_date !== undefined) {
      const parsedStart = parseDateInput(body.start_date);
      if (parsedStart === undefined) {
        return Response.json(
          { error: "Invalid start date" },
          { status: 400 },
        );
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

    const actor = user;

    if (actor) {
      project.lastUpdatedBy = actor._id;
    }

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
      duplicateWarnings = findDuplicates(body.gender_issue, existingProjects, 0.7);
    } catch (err) {
      console.error("Duplicate check error:", err);
    }

    return Response.json({ data: project, duplicateWarnings });
  } catch (err) {
    console.error("PUT error:", err);
    return Response.json(
      { error: "Update failed", details: err.message },
      { status: 500 },
    );
  }
}

export async function GET(req, { params }) {
    const { error, status } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });
  await connectDB();
  const { id } = await params;
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
        select: "gadData.sexAtBirth personal.currentStatus",
      },
    },
  });
  if (!projects) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ data: withGeneratedAccomplishment(projects) });
}

export async function DELETE(req, { params }) {
    const { error, status } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });
  await connectDB();
  const { id } = await params;
  const projects = await Project.findByIdAndDelete(id);
  if (!projects) return Response.json({ error: "Not found" }, { status: 404 });

  /* Deleting a project must not leave orphaned records behind — unlink it from
     every GPB, remove the events it owned (with their files + reports) and
     delete the evidence files it stored in the bucket. */
  await GPB.updateMany({}, { $pull: { projects: projects._id } });

  const eventIds = Array.isArray(projects.events) ? projects.events : [];
  let deletedEvents = 0;
  for (const eventId of eventIds) {
    const result = await deleteEventCascade(eventId);
    if (result.deleted) deletedEvents += 1;
  }

  const evidence = Array.isArray(projects.expenditure_evidence)
    ? projects.expenditure_evidence
    : [];
  let deletedEvidenceFiles = 0;
  for (const file of evidence) {
    if (!file?.key) continue;
    try {
      await deleteFileFromBucket(file.key);
      deletedEvidenceFiles += 1;
    } catch (err) {
      console.error(`Failed to delete evidence file ${file.key}:`, err);
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
    data: projects,
    deletedEvents,
    deletedEvidenceFiles,
  });
}
