import mongoose, { Schema } from "mongoose";

const validationErrorSchema = new Schema(
  {
    field: String,
    code: String,
    message: String,
    level: {
      type: String,
      enum: ["error", "warning"],
      default: "error",
    },
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
        "duplicate",
        "migrated",
        "failed",
        /* Imported, then the import was undone (see importUndo.js). */
        "undone",
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
    /* Set when raw_payload and mapped_payload were emptied after the batch
       completed (scripts/clear-staging-payloads.mjs): the person is in the
       encrypted vault by then, and the plain-text copy here was redundant. */
    payload_cleared_at: {
      type: Date,
      default: null,
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
      /* How the row was linked to an existing profile, if it was. */
      matched_on: {
        type: String,
        enum: [null, "student_id", "employee_id", "email", "name_birthday"],
        default: null,
      },
      changes: {
        type: [
          {
            field: String,
            from: Schema.Types.Mixed,
            to: Schema.Types.Mixed,
            _id: false,
          },
        ],
        default: [],
      },
      /* Whether this row's import added the term, and created the login
         account, rather than finding them already there. Undo removes only
         what the import added. Unset on rows imported before these fields. */
      term_created: { type: Boolean },
      account_created: { type: Boolean },
      /* When the import of this row was undone. */
      undone_at: { type: Date },
    },
  },
  { timestamps: true },
);

stagingRecordSchema.index({ batch_id: 1, row_number: 1 }, { unique: true });

const StagingRecord =
  mongoose.models.StagingRecord ||
  mongoose.model("StagingRecord", stagingRecordSchema);

export default StagingRecord;
