import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { logActivity } from "@/lib/activityLog";
import { normalizeRole } from "@/lib/notifications";
import {
  normalizeRefNumber,
  nextProjectRefNumber,
} from "@/lib/referenceNumber";
import {
  PROJECT_EVENTS_POPULATE,
  withGeneratedAccomplishment,
} from "@/lib/accomplishmentSummary";
import UserAuth from "@/models/user";
import "@/models/event";
import "@/models/profile";

/*
 * Shared route handlers for the office-managed project modules
 * (Research & Extension and Academic projects).
 *
 * The two modules have identical CRUD/comment flows — only their field lists,
 * enums and reference-number prefixes differ — so the logic lives here and the
 * route files bind their model + config. Semantics intentionally mirror the
 * GAD project routes (app/api/project/*) so behaviour stays consistent.
 */

const MILESTONE_STATUSES = ["pending", "ongoing", "completed"];
const MAX_MILESTONES = 50;
const MAX_MILESTONE_PROOFS = 10;
const MAX_REF_ATTEMPTS = 3;

/* Roles (besides the creator) allowed to manage schedule, status, milestones
   and approval details on a module project. */
const DEFAULT_EDITOR_ROLES = ["gad focal person", "gad coordinator", "admin"];

/** Returns the Date for a valid input, null for empty input, or undefined when invalid. */
const parseDateInput = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

/** Unwraps `{ value }` field shapes coming from the forms. */
const unwrap = (value) =>
  value && typeof value === "object" && !Array.isArray(value) && "value" in value
    ? value.value
    : value;

/** Validates and normalizes the proof files attached to a milestone. */
const parseMilestoneProofs = (input) => {
  if (input === undefined || input === null) return { proofs: [] };
  if (!Array.isArray(input)) return { error: "invalid proof files" };

  const proofs = input
    .filter((file) => file && typeof file === "object" && (file.url || file.key))
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

    const status = String(raw.status ?? "pending").trim().toLowerCase();
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
    });
  }

  return { milestones };
};

/** Normalizes a FieldSchema value according to its declared kind. */
const buildFieldValue = (kind, raw) => {
  const value = unwrap(raw);

  if (kind === "array") {
    if (Array.isArray(value)) {
      return {
        value: value.map((item) => String(item ?? "").trim()).filter(Boolean),
      };
    }
    if (value === null || value === undefined || value === "") {
      return { value: [] };
    }
    return { value: [String(value).trim()].filter(Boolean) };
  }

  if (kind === "number") {
    const number = Number(value);
    return { value: Number.isFinite(number) ? number : 0 };
  }

  if (kind === "nullableNumber") {
    if (value === null || value === undefined || value === "") {
      return { value: null };
    }
    const number = Number(value);
    return { value: Number.isFinite(number) ? number : null };
  }

  return {
    value: value === null || value === undefined ? "" : String(value).trim(),
  };
};

/** Same coercion as buildFieldValue but for plain top-level fields (no `{ value }` wrapper). */
const buildPlainValue = (kind, raw) => {
  const value = unwrap(raw);

  if (kind === "array") {
    if (Array.isArray(value)) {
      return value.map((item) => String(item ?? "").trim()).filter(Boolean);
    }
    if (value === null || value === undefined || value === "") return [];
    return [String(value).trim()].filter(Boolean);
  }

  if (kind === "number") {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  if (kind === "nullableNumber") {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  return value === null || value === undefined ? "" : String(value).trim();
};

/** Normalizes the expenditure evidence file list. */
const parseEvidenceFiles = (input) =>
  Array.isArray(input)
    ? input
        .filter((file) => file && (file.url || file.key))
        .map((file) => ({
          url: file.url || "",
          key: file.key || "",
          name: file.name || null,
        }))
    : [];

const buildPopulate = (query, populatePaths = []) => {
  let populated = query.populate(PROJECT_EVENTS_POPULATE);
  for (const path of populatePaths) {
    populated = populated.populate({ path, select: "username role" });
  }
  return populated;
};

/**
 * Binds a project model to its list/create handlers.
 *
 * Config:
 * - model          mongoose model
 * - prefix         reference-number prefix key (e.g. "RNE")
 * - label          human label used in log messages and errors
 * - resourceType   activity-log resource type
 * - actionPrefix   activity-log action prefix (e.g. "RE_PROJECT")
 * - fieldSpecs     { fieldName: "string" | "array" | "number" | "nullableNumber" }
 * - enumFields     { fieldName: [allowedValues] }
 * - requiredEnums  enum fields that must be present on create
 * - populatePaths  extra refs to populate (e.g. ["createdBy", "project_leader"])
 * - buildExtra     (body, userId) => plain doc fields set during create
 */
export function createCollectionHandlers({
  model,
  prefix,
  label,
  resourceType,
  actionPrefix,
  fieldSpecs = {},
  plainSpecs = {},
  enumFields = {},
  requiredEnums = [],
  populatePaths = [],
  buildExtra,
}) {
  const GET = async (req) => {
    const { error, status } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });

    await connectDB();

    const docs = await buildPopulate(model.find(), populatePaths);
    return Response.json({
      data: docs.map(withGeneratedAccomplishment),
    });
  };

  const POST = async (req) => {
    const { error, status } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });

    await connectDB();

    const body = await req.json();
    const year = Number(body.year);

    if (!Number.isFinite(year) || !Number.isInteger(year)) {
      return Response.json({ message: "Invalid year" }, { status: 400 });
    }

    const title = String(unwrap(body.title) ?? "").trim();
    if (!title) {
      return Response.json({ message: "Title is required" }, { status: 400 });
    }

    for (const field of requiredEnums) {
      const options = enumFields[field] || [];
      const value = String(unwrap(body[field]) ?? "").trim();

      if (!options.includes(value)) {
        return Response.json(
          { message: `Invalid ${field}. Allowed: ${options.join(", ")}` },
          { status: 400 },
        );
      }
    }

    const providedRef = normalizeRefNumber(body.reference_number);

    if (providedRef) {
      const clash = await model.exists({ year, reference_number: providedRef });
      if (clash) {
        return Response.json(
          {
            message: `Reference number ${providedRef} is already used by another ${year} ${label} project.`,
          },
          { status: 409 },
        );
      }
    }

    const actorId = body.userId || null;
    const data = {
      year,
      reference_number: providedRef || null,
      createdBy: actorId,
      lastUpdatedBy: actorId,
      ...(buildExtra ? buildExtra(body, actorId) : {}),
    };

    for (const [field, kind] of Object.entries(fieldSpecs)) {
      data[field] = buildFieldValue(kind, body[field]);
    }

    for (const [field, kind] of Object.entries(plainSpecs)) {
      data[field] = buildPlainValue(kind, body[field]);
    }

    for (const field of Object.keys(enumFields)) {
      if (requiredEnums.includes(field)) {
        data[field] = String(unwrap(body[field]) ?? "").trim();
        continue;
      }

      if (body[field] === undefined || body[field] === null) continue;

      const value = String(unwrap(body[field]) ?? "").trim();
      if (!value) continue;

      if (!enumFields[field].includes(value)) {
        return Response.json(
          {
            message: `Invalid ${field}. Allowed: ${enumFields[field].join(", ")}`,
          },
          { status: 400 },
        );
      }
      data[field] = value;
    }

    if (body.start_date !== undefined) {
      const parsedStart = parseDateInput(body.start_date);
      if (parsedStart === undefined) {
        return Response.json({ message: "Invalid start date" }, { status: 400 });
      }
      data.start_date = parsedStart;
    }

    if (body.end_date !== undefined) {
      const parsedEnd = parseDateInput(body.end_date);
      if (parsedEnd === undefined) {
        return Response.json({ message: "Invalid end date" }, { status: 400 });
      }
      data.end_date = parsedEnd;
    }

    if (
      data.start_date &&
      data.end_date &&
      data.end_date.getTime() < data.start_date.getTime()
    ) {
      return Response.json(
        { message: "End date must be on or after the start date" },
        { status: 400 },
      );
    }

    if (body.events !== undefined) {
      data.events = Array.isArray(body.events)
        ? body.events.filter(Boolean)
        : [];
    }

    if (actorId) {
      const actorExists = await UserAuth.exists({ _id: actorId });
      if (!actorExists) {
        data.createdBy = null;
        data.lastUpdatedBy = null;
      }
    }

    /* Auto-assigned numbers can collide when two projects are created at the
       same moment; the unique index rejects the loser and we retry. */
    let project = null;
    let lastRefError = null;

    for (let attempt = 0; attempt < MAX_REF_ATTEMPTS; attempt += 1) {
      if (!providedRef) {
        const usedRefs = await model.find({ year }).select("reference_number");
        data.reference_number = nextProjectRefNumber(
          prefix,
          year,
          usedRefs.map((doc) => doc.reference_number),
        );
      }

      try {
        project = await model.create(data);
        break;
      } catch (err) {
        lastRefError = err;

        if (err?.code === 11000) {
          /* A custom number lost the race — report it like the upfront check. */
          if (providedRef) {
            return Response.json(
              {
                message: `Reference number ${providedRef} is already used by another ${year} ${label} project.`,
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
      action: `${actionPrefix}_CREATE`,
      description: `${label} project created for year ${year}`,
      resource_type: resourceType,
      resource_id: project._id,
      severity: "info",
      metadata: { year, actorId },
    });

    const populated = await buildPopulate(
      model.findById(project._id),
      populatePaths,
    );

    return Response.json({
      message: `${label} project created successfully`,
      data: withGeneratedAccomplishment(populated),
    });
  };

  return { GET, POST };
}

/**
 * Binds a project model to its single-item handlers (get / update / delete).
 *
 * Same config as createCollectionHandlers plus:
 * - statuses       allowed values for `project_status`
 * - editorRoles    roles (besides the creator) allowed to touch schedule,
 *                  milestones and approval details
 */
export function createItemHandlers({
  model,
  label,
  resourceType,
  actionPrefix,
  fieldSpecs = {},
  plainSpecs = {},
  enumFields = {},
  statuses = [],
  populatePaths = [],
  editorRoles = DEFAULT_EDITOR_ROLES,
}) {
  const GET = async (req, { params }) => {
    const { error, status } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });

    await connectDB();

    const { id } = await params;
    const project = await buildPopulate(model.findById(id), populatePaths);

    if (!project) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    return Response.json({ data: withGeneratedAccomplishment(project) });
  };

  const PUT = async (req, { params }) => {
    const { error, status, user } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });

    await connectDB();

    const { id } = await params;
    const body = await req.json();

    try {
      const project = await model.findById(id);

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
      const approvalTouched =
        body.approved_resolution_no !== undefined ||
        body.other_details !== undefined;

      if (scheduleTouched || milestonesTouched || approvalTouched) {
        const creatorId = project.createdBy ? String(project.createdBy) : "";
        const isCreator = !!user && creatorId === String(user._id);
        const isEditorRole = editorRoles.includes(normalizeRole(user?.role));

        if (!isCreator && !isEditorRole) {
          let message = `Only the project creator or an authorized ${label} editor can update this project`;

          if (approvalTouched && !scheduleTouched && !milestonesTouched) {
            message = `Only the project creator or an authorized ${label} editor can update the approval details`;
          } else if (milestonesTouched && !scheduleTouched) {
            message = `Only the project creator or an authorized ${label} editor can manage milestones`;
          }

          return Response.json({ error: message }, { status: 403 });
        }
      }

      for (const [field, kind] of Object.entries(fieldSpecs)) {
        if (body[field] === undefined) continue;
        project[field] = buildFieldValue(kind, body[field]);
      }

      for (const [field, kind] of Object.entries(plainSpecs)) {
        if (body[field] === undefined) continue;
        project[field] = buildPlainValue(kind, body[field]);
      }

      for (const field of Object.keys(enumFields)) {
        if (body[field] === undefined) continue;

        const value = String(unwrap(body[field]) ?? "").trim();
        if (!value) continue;

        if (!enumFields[field].includes(value)) {
          return Response.json({ error: `Invalid ${field}` }, { status: 400 });
        }

        project[field] = value;
      }

      if (body.project_status !== undefined) {
        const nextStatus = String(body.project_status || "").trim();

        if (!statuses.includes(nextStatus)) {
          return Response.json({ error: "Invalid project status" }, { status: 400 });
        }

        project.project_status = nextStatus;
      }

      if (body.milestones !== undefined) {
        const parsedMilestones = parseMilestones(body.milestones);

        if (parsedMilestones.error) {
          return Response.json({ error: parsedMilestones.error }, { status: 400 });
        }

        project.milestones = parsedMilestones.milestones;
        project.markModified("milestones");
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

      /* `actual_accomplishment_override` decides whether the saved text is kept
         as manual override (true) or the accomplishment is derived from linked
         events (false). Resetting to auto clears the stored snapshot. */
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
        project.expenditure_evidence = parseEvidenceFiles(
          body.expenditure_evidence,
        );
      }

      if (body.events !== undefined) {
        project.events = Array.isArray(body.events)
          ? body.events.filter(Boolean)
          : [];
      }

      /* Reference numbers are normally assigned automatically; this allows an
         explicit correction while keeping them unique within the same year. */
      if (body.reference_number !== undefined) {
        const nextRef = normalizeRefNumber(body.reference_number);

        if (nextRef) {
          const clash = await model.exists({
            year: project.year,
            reference_number: nextRef,
            _id: { $ne: project._id },
          });

          if (clash) {
            return Response.json(
              {
                message: `Reference number ${nextRef} is already used by another ${project.year} ${label} project.`,
              },
              { status: 409 },
            );
          }
        }

        project.reference_number = nextRef || null;
      }

      if (user) {
        project.lastUpdatedBy = user._id;
      }

      await project.save();

      await logActivity({
        req,
        action: `${actionPrefix}_UPDATE`,
        description: `${label} project updated for year ${project.year}`,
        resource_type: resourceType,
        resource_id: id,
        severity: "info",
        metadata: {
          year: project.year,
          updatedFields: Object.keys(body).filter((key) => key !== "userId"),
        },
      });

      const populated = await buildPopulate(model.findById(id), populatePaths);

      return Response.json({ data: withGeneratedAccomplishment(populated) });
    } catch (err) {
      console.error(`${actionPrefix}_UPDATE error:`, err);
      return Response.json(
        { error: "Update failed", details: err.message },
        { status: 500 },
      );
    }
  };

  const DELETE = async (req, { params }) => {
    const { error, status, user } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });

    await connectDB();

    const { id } = await params;

    try {
      const project = await model.findById(id);

      if (!project) {
        return Response.json({ error: "Not found" }, { status: 404 });
      }

      /* Deleting is destructive — only the creator or an authorized editor. */
      const creatorId = project.createdBy ? String(project.createdBy) : "";
      const isCreator = !!user && creatorId === String(user._id);
      const isEditorRole = editorRoles.includes(normalizeRole(user?.role));

      if (!isCreator && !isEditorRole) {
        return Response.json(
          {
            error: `Only the project creator or an authorized ${label} editor can delete this project`,
          },
          { status: 403 },
        );
      }

      /* Linked events stay in the calendar: they are standalone records that
         simply stop resolving to a project once it is gone. */
      const deleted = await model.findByIdAndDelete(id);

      await logActivity({
        req,
        action: `${actionPrefix}_DELETE`,
        description: `${label} project deleted`,
        resource_type: resourceType,
        resource_id: id,
        severity: "critical",
        metadata: { year: deleted.year },
      });

      return Response.json({ data: deleted });
    } catch (err) {
      console.error(`${actionPrefix}_DELETE error:`, err);
      return Response.json(
        { error: "Delete failed", details: err.message },
        { status: 500 },
      );
    }
  };

  return { GET, PUT, DELETE };
}

/**
 * Binds a project model to its comment handlers (list / add / delete).
 *
 * Module projects have no GPB approval workflow, so comments are recorded and
 * activity-logged without the planning-director notification fan-out.
 */
export function createCommentHandlers({
  model,
  resourceType,
  actionPrefix,
  commentFields = ["general"],
}) {
  const allowedFields = commentFields.includes("general")
    ? commentFields
    : [...commentFields, "general"];

  const GET = async (req, { params }) => {
    const { error, status } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });

    await connectDB();

    try {
      const { id } = await params;

      const project = await model.findById(id).populate({
        path: "comments.userId",
        model: "UserAuth",
        select: "username role personal_info_id",
      });

      if (!project) {
        return Response.json({ message: "Project not found" }, { status: 404 });
      }

      const comments = Array.isArray(project.comments) ? project.comments : [];

      const byField = allowedFields.reduce((acc, field) => {
        acc[field] = comments.filter((comment) =>
          Array.isArray(comment.fields)
            ? comment.fields.includes(field)
            : comment.field === field,
        );
        return acc;
      }, {});

      return Response.json({ data: comments, byField });
    } catch (error) {
      return Response.json({ message: error.message }, { status: 500 });
    }
  };

  const POST = async (req, { params }) => {
    const { error, status, user } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });

    await connectDB();

    try {
      const { id } = await params;
      const { fields, field, message, type, userId } = await req.json();

      const rawFields = Array.isArray(fields)
        ? fields
        : field
          ? [field]
          : ["general"];

      const cleanFields = rawFields.filter(
        (f) => typeof f === "string" && allowedFields.includes(f),
      );
      const targetFields = cleanFields.length ? cleanFields : ["general"];

      const actorId = userId || user?._id;

      if (!message || !actorId) {
        return Response.json(
          { message: "userId and message are required" },
          { status: 400 },
        );
      }

      const project = await model.findById(id);

      if (!project) {
        return Response.json({ message: "Project not found" }, { status: 404 });
      }

      const actor = await UserAuth.findById(
        actorId,
        "_id role username",
      ).lean();

      if (!actor) {
        return Response.json({ message: "User not found" }, { status: 404 });
      }

      const now = new Date();

      project.comments.push({
        userId: actorId,
        message,
        type: type || "revision",
        fields: [...new Set(targetFields)],
        createdAt: now,
        updatedAt: now,
      });

      await project.save();

      await logActivity({
        req,
        action: `${actionPrefix}_COMMENT`,
        description: `${actor.username} left a ${type || "revision"} comment`,
        resource_type: resourceType,
        resource_id: id,
        severity: "info",
        metadata: { year: project.year, commentType: type || "revision" },
      });

      return Response.json({
        success: true,
        data: project.comments.at(-1),
      });
    } catch (error) {
      console.error(`${actionPrefix}_COMMENT error:`, error);
      return Response.json({ message: error.message }, { status: 500 });
    }
  };

  const DELETE = async (req, { params }) => {
    const { error, status } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });

    await connectDB();

    try {
      const { id } = await params;
      const { searchParams } = new URL(req.url);
      const commentId = searchParams.get("commentId");

      if (!commentId) {
        return Response.json({ message: "Missing commentId" }, { status: 400 });
      }

      const project = await model.findById(id);

      if (!project) {
        return Response.json({ message: "Project not found" }, { status: 404 });
      }

      project.comments = (project.comments || []).filter(
        (c) => c._id.toString() !== commentId,
      );
      project.markModified("comments");
      await project.save();

      await logActivity({
        req,
        action: `${actionPrefix}_COMMENT_DELETE`,
        description: `Comment removed from ${resourceType}`,
        resource_type: resourceType,
        resource_id: id,
        severity: "warning",
        metadata: { commentId },
      });

      return Response.json({ success: true, data: project.comments });
    } catch (error) {
      return Response.json({ message: error.message }, { status: 500 });
    }
  };

  return { GET, POST, DELETE };
}
