import mongoose from "mongoose";

/*
 * Shared building blocks for the project-like models (GAD projects and the
 * office-managed Research & Extension / Academic project modules).
 *
 * Extracted from models/projects.js so every project schema stays in sync —
 * the shapes below are intentionally identical to the GAD definitions.
 *
 * Mongoose is imported via its default export (then destructured) so these
 * schemas can also be loaded from plain-Node scripts and tests.
 */

const { Schema } = mongoose;

/** Wraps a reviewable form field as `{ value }` so comments can target it. */
export const FieldSchema = (type) => ({
  value: { type, default: "" },
});

export const fileMetaSchema = new Schema(
  {
    url: { type: String, default: null },
    key: { type: String, default: null },
    name: { type: String, default: null },
  },
  { _id: false },
);

/* One row of the project Gantt chart (encoded or uploaded). */
export const GanttActivitySchema = new Schema(
  {
    activity: { type: String, required: true, trim: true },
    start_date: { type: Date, default: null },
    end_date: { type: Date, default: null },
    person_responsible: { type: String, default: "", trim: true },
  },
  { _id: false },
);

export const MilestoneSchema = new Schema(
  {
    /* Gantt activity this milestone was generated from (empty if manual). */
    source_activity: { type: String, default: "", trim: true },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    target_date: {
      type: Date,
      default: null,
    },
    actual_date: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["pending", "ongoing", "completed"],
      default: "pending",
    },
    /* Proof files (PDF/image) backing a milestone. The API rejects a
       `completed` milestone that has no proof attached. */
    proofs: {
      type: [fileMetaSchema],
      default: [],
    },
  },
  { timestamps: true },
);

/** Builds a CommentSchema whose `fields` enum is the host model's field names. */
export const buildCommentSchema = (fieldNames) =>
  new Schema(
    {
      userId: {
        type: Schema.Types.ObjectId,
        ref: "UserAuth",
        required: true,
      },
      message: { type: String, required: true },
      type: {
        type: String,
        enum: ["approval", "revision"],
      },
      fields: [
        {
          type: String,
          enum: fieldNames,
        },
      ],
    },
    { timestamps: true },
  );

/*
 * Two projects in the same fiscal year may never share a reference number.
 * Projects created before the feature (null) are excluded from the constraint.
 */
export const applyReferenceNumberIndex = (schema) =>
  schema.index(
    { year: 1, reference_number: 1 },
    {
      unique: true,
      partialFilterExpression: { reference_number: { $type: "string" } },
    },
  );
