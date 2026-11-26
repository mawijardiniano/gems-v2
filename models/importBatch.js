import mongoose, { Schema } from "mongoose";

const importBatchSchema = new Schema(
  {
    source_type: {
      type: String,
      enum: ["hrmis_api", "manual_upload"],
      required: true,
    },
    source_name: {
      type: String,
      default: "",
    },
    source_file_key: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: [
        "pending",
        "validating",
        "ready",
        "migrating",
        "completed",
        "failed",
      ],
      default: "pending",
      index: true,
    },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: "UserAuth",
      required: true,
      index: true,
    },
    created_by_username: {
      type: String,
      default: "",
    },
    started_at: {
      type: Date,
      default: Date.now,
    },
    finished_at: {
      type: Date,
    },
    /* SHA-256 of the source rows, to warn when the same file or feed is
       staged again. */
    content_hash: {
      type: String,
      default: "",
      index: true,
    },
    /* Column names found in the source and what they were read as, plus
       problems that fail every row (see headerMap.headerReport). Column
       names only, no row values. */
    header_report: {
      columns: { type: [String], default: undefined },
      recognized: {
        type: [{ column: String, field: String, _id: false }],
        default: undefined,
      },
      unrecognized: { type: [String], default: undefined },
      missing: { type: [String], default: undefined },
      problems: { type: [String], default: undefined },
    },
    /* Rows handled so far by a background migration; the page polls it. */
    progress: {
      done: { type: Number },
      total: { type: Number },
      updated_at: { type: Date },
    },
    /* The most common blocking validation errors, so one problem shared by
       every row reads as one line instead of hundreds. */
    error_summary: {
      type: [
        {
          field: String,
          code: String,
          message: String,
          count: Number,
          _id: false,
        },
      ],
      default: undefined,
    },
    totals: {
      fetched: { type: Number, default: 0 },
      valid: { type: Number, default: 0 },
      invalid: { type: Number, default: 0 },
      approved: { type: Number, default: 0 },
      duplicates: { type: Number, default: 0 },
      existing: { type: Number, default: 0 },
      migrated_created: { type: Number, default: 0 },
      migrated_updated: { type: Number, default: 0 },
      identical: { type: Number, default: 0 },
      skipped: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
    }, 
  },
  { timestamps: true },
);

const ImportBatch =
  mongoose.models.ImportBatch ||
  mongoose.model("ImportBatch", importBatchSchema);

export default ImportBatch;
