import { connectDB } from "@/lib/db";
import {
  createNotifications,
  getPlanningDirectorIds,
  normalizeRole,
} from "@/lib/notifications";
import Project from "@/models/projects";
import UserAuth from "@/models/user";

const ALLOWED_FIELDS = [
  "gender_issue",
  "cause_gender_issue",
  "gad_objective",
  "supporting_statistics_data",
  "relevant_agency",
  "gad_activity",
  "performance_indicator_target",
  "gad_budget",
  "source_budget",
  "responsible_office",
  "general",
];

export async function GET(req, { params }) {
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
      (f) => typeof f === "string" && ALLOWED_FIELDS.includes(f),
    );

    const targetFields = cleanFields.length ? cleanFields : ["general"];

    if (!message || !userId) {
      return Response.json(
        { message: "userId and message are required" },
        { status: 400 },
      );
    }

    const project = await Project.findById(id);

    if (!project) {
      return Response.json({ message: "Project not found" }, { status: 404 });
    }

    const actor = await UserAuth.findById(userId, "_id role username").lean();

    if (!actor) {
      return Response.json({ message: "User not found" }, { status: 404 });
    }

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

    return Response.json({ message: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  await connectDB();

  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const commentId = searchParams.get("commentId");

    if (!commentId) {
      return Response.json({ message: "Missing commentId" }, { status: 400 });
    }

    const project = await Project.findById(id);

    if (!project) {
      return Response.json({ message: "Project not found" }, { status: 404 });
    }

    project.comments = (project.comments || []).filter(
      (c) => c._id.toString() !== commentId,
    );

    project.markModified("comments");
    await project.save();

    return Response.json({
      success: true,
      data: project.comments,
    });
  } catch (error) {
    return Response.json({ message: error.message }, { status: 500 });
  }
}
