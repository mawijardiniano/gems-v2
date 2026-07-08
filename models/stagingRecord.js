import mongoose, { Schema } from "mongoose";

const validationErrorSchema = new Schema(
  {
    field: String,
    code: String,
    message: String,
  },
  { _id: false },
);

const stagingRecordSchema = new Schema(
  {
    batch_id: {
      type: Schema.Types.ObjectId,
      ref: "ImportBatch",
      required: true,
      index: true,
    },
    row_number: {
      type: Number,
      required: true,
    },
    raw_payload: {
      type: Schema.Types.Mixed,
      required: true,
    },
    mapped_payload: {
      type: Schema.Types.Mixed,
      default: {},
    },
    identity: {
      student_id: { type: String, default: "", index: true },
      employee_id: { type: String, default: "", index: true },
      email: { type: String, default: "", lowercase: true },
    },
    school_year: {
      type: String,
      default: "",
      index: true,
    },
    semester: {
      type: String,
      enum: ["", "1st", "2nd", "Summer"],
      default: "",
      index: true,
    },
    validation_errors: {
      type: [validationErrorSchema],
      default: [],
    },
    status: {
      type: String,
      enum: [
        "pending",
        "valid",
        "invalid",
        "approved",
        "rejected",
        "migrated",
        "failed",
      ],
      default: "pending",
      index: true,
    },
    duplicate_of: {
      type: Schema.Types.ObjectId,
      ref: "StagingRecord",
    },
    reviewed_by: {
      type: Schema.Types.ObjectId,
      ref: "UserAuth",
    },
    reviewed_at: {
      type: Date,
    },
    migration_result: {
      action: {
        type: String,
        enum: ["", "created", "updated", "skipped", "failed"],
        default: "",
      },
      profile_id: {
        type: Schema.Types.ObjectId,
        ref: "GemsProfile",
      },
      profile_term_id: {
        type: Schema.Types.ObjectId,
        ref: "ProfileTerm",
      },
      message: {
        type: String,
        default: "",
      },
    },
  },
  { timestamps: true },
);

stagingRecordSchema.index({ batch_id: 1, row_number: 1 }, { unique: true });

const StagingRecord =
  mongoose.models.StagingRecord ||
  mongoose.model("StagingRecord", stagingRecordSchema);

export default StagingRecord;
