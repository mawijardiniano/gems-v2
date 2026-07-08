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
    totals: {
      fetched: { type: Number, default: 0 },
      valid: { type: Number, default: 0 },
      invalid: { type: Number, default: 0 },
      approved: { type: Number, default: 0 },
      migrated_created: { type: Number, default: 0 },
      migrated_updated: { type: Number, default: 0 },
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
