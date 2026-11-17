import { connectDB } from "@/data/lib/db";
import {
  createNotifications,
  getPlanningDirectorIds,
  normalizeRole,
} from "@/data/lib/notifications";
import Project from "@/models/projects";
import UserAuth from "@/models/user";
import { logActivity } from "@/data/lib/activityLog";
import { requireAuth } from "@/data/lib/auth";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import {
  canManageProject,
  canViewProjectDetails,
  isProjectManagerRole,
} from "@/data/lib/projectAccess";

const MAX_COMMENT_LENGTH = 2000;
const COMMENT_TYPES = ["revision", "approval", "general"];

const ALLOWED_FIELDS = [
  "project_type",
  "gender_issue",
  "cause_gender_issue",
  "gad_objective",
  "supporting_statistics_data",
  "relevant_agency",
  "gad_activity",
  "gad_activity_description",
  "performance_indicator_target",
  "gad_budget",
  "source_budget",
  "responsible_office",
  "general",
];

export async function GET(req, { params }) {
  const { error, status } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });
  await connectDB();

  try {
    const { id } = await params;

    const project = await Project.findById(id).populate({
      path: "comments.userId",
      model: "UserAuth",
      select: "username role personal_info_id",
    });

    if (!project) {
      return Response.json({ message: "Project not found" }, { status: 404 });
    }

    const comments = Array.isArray(project.comments) ? project.comments : [];

    const byField = ALLOWED_FIELDS.reduce((acc, field) => {
      acc[field] = comments.filter((comment) => {
        if (Array.isArray(comment.fields)) {
          return comment.fields.includes(field);
        }

        return comment.field === field;
      });
      return acc;
    }, {});

    return Response.json({
      data: comments,
      byField,
    });
  } catch (error) {
    return Response.json({ message: error.message }, { status: 500 });
  }
}
export async function POST(req, { params }) {
  const { error, status, user } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });
  await connectDB();

  try {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return Response.json({ message: "Project not found" }, { status: 404 });
    }
    const { fields, field, message: rawMessage, type: rawType } =
      (await req.json().catch(() => null)) || {};
    /* The author is whoever is signed in. A userId from the body let anyone
       post — and notify — as the Planning Director. */
    const userId = user._id;
    const message = String(rawMessage ?? "").trim();
    const type = COMMENT_TYPES.includes(rawType) ? rawType : "revision";

    const rawFields = Array.isArray(fields)
      ? fields
      : field
        ? [field]
        : ["general"];

    const cleanFields = rawFields.filter(
      (f) => typeof f === "string" && ALLOWED_FIELDS.includes(f),
    );

    const targetFields = cleanFields.length ? cleanFields : ["general"];

    if (!message) {
      return Response.json({ message: "A message is required" }, { status: 400 });
    }
    if (message.length > MAX_COMMENT_LENGTH) {
      return Response.json(
        { message: `Comments are limited to ${MAX_COMMENT_LENGTH} characters` },
        { status: 400 },
      );
    }

    const project = await Project.findById(id);

    if (!project) {
      return Response.json({ message: "Project not found" }, { status: 404 });
    }

    /* Reviewers (roles with the GPB pages) and the project's managers. */
    if (!canViewProjectDetails(user.role) && !canManageProject(user, project)) {
      return Response.json(
        { message: "You are not allowed to comment on this project." },
        { status: 403 },
      );
    }

    const actor = { _id: user._id, role: user.role, username: user.username };

    const now = new Date();

    const newComment = {
      userId,
      message,
      type: type || "revision",
      fields: [...new Set(targetFields)],
      createdAt: now,
      updatedAt: now,
    };

    project.comments.push(newComment);

    await project.save();

    await logActivity({
      req,
      action: "PROJECT_COMMENT",
      description: `${actor.username} left a ${type || "revision"} comment`,
      resource_type: "project",
      resource_id: id,
      severity: "info",
      metadata: { year: project.year, commentType: type || "revision" },
    });

    let recipientIds = [];

    if (normalizeRole(actor.role) === "planning director") {
      const targetUserId = project.lastUpdatedBy || project.createdBy;

      if (targetUserId && String(targetUserId) !== String(actor._id)) {
        recipientIds = [targetUserId];
      }
    } else {
      recipientIds = await getPlanningDirectorIds(actor._id);
    }

    await createNotifications({
      recipientIds,
      senderId: actor._id,
      type: "project_comment",
      title: "New project comment",
      message: `${actor.username} left a ${type || "revision"} comment on a GPB project for year ${project.year}.`,
      projectId: project._id,
      metadata: {
        year: project.year,
        commentType: type || "revision",
        fields: [...new Set(targetFields)],
      },
    });

    return Response.json({
      success: true,
      data: project.comments.at(-1),
    });
  } catch (error) {
    console.error("COMMENT ERROR:", error);

    return Response.json(
      { message: "Unable to add the comment." },
      { status: 500 },
    );
  }
}

export async function DELETE(req, { params }) {
  const { error, status, user } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });
  await connectDB();

  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const commentId = searchParams.get("commentId");

    if (
      !mongoose.isValidObjectId(id) ||
      !commentId ||
      !mongoose.isValidObjectId(commentId)
    ) {
      return Response.json({ message: "Missing commentId" }, { status: 400 });
    }

    const project = await Project.findById(id).select("comments._id comments.userId").lean();

    if (!project) {
      return Response.json({ message: "Project not found" }, { status: 404 });
    }

    const comment = (project.comments || []).find(
      (c) => String(c._id) === commentId,
    );
    if (!comment) {
      return Response.json({ message: "Comment not found" }, { status: 404 });
    }

    /* Its author, a GAD Focal Person or an Admin — anyone could delete any
       comment before. */
    if (
      String(comment.userId) !== String(user._id) &&
      !isProjectManagerRole(user.role)
    ) {
      return Response.json(
        { message: "You can only delete your own comments." },
        { status: 403 },
      );
    }

    /* $pull removes just this comment; rewriting the whole array could drop a
       comment saved at the same moment. */
    const updated = await Project.findByIdAndUpdate(
      id,
      { $pull: { comments: { _id: comment._id } } },
      { new: true },
    ).select("comments");

    await logActivity({
      req,
      action: "PROJECT_COMMENT_DELETE",
      description: `Comment removed from GPB project`,
      resource_type: "project",
      resource_id: id,
      severity: "warning",
      metadata: { commentId },
    });

    return Response.json({
      success: true,
      data: updated?.comments || [],
    });
  } catch (error) {
    console.error("COMMENT DELETE ERROR:", error);
    return Response.json(
      { message: "Unable to delete the comment." },
      { status: 500 },
    );
  }
}
