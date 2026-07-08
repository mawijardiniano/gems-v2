import mongoose, { Schema } from "mongoose";

const syncLogSchema = new Schema(
  {
    batch_id: {
      type: Schema.Types.ObjectId,
      ref: "ImportBatch",
      required: true,
      index: true,
    },
    staging_record_id: {
      type: Schema.Types.ObjectId,
      ref: "StagingRecord",
      index: true,
    },
    level: {
      type: String,
      enum: ["info", "warn", "error"],
      default: "info",
      index: true,
    },
    action: {
      type: String,
      enum: [
        "validate",
        "approve",
        "migrate",
        "create",
        "update",
        "skip",
        "fail",
      ],
      required: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
    },
    details: {
      type: Schema.Types.Mixed,
      default: {},
    },
    target_profile_id: {
      type: Schema.Types.ObjectId,
      ref: "GemsProfile",
    },
    target_profile_term_id: {
      type: Schema.Types.ObjectId,
      ref: "ProfileTerm",
    },
    executed_by: {
      type: Schema.Types.ObjectId,
      ref: "UserAuth",
    },
    executed_by_username: {
      type: String,
      default: "",
    },
    executed_at: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

const SyncLog =
  mongoose.models.SyncLog || mongoose.model("SyncLog", syncLogSchema);

export default SyncLog;
