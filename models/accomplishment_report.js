import mongoose from "mongoose";

const fileMetaSchema = new mongoose.Schema(
  {
    url: { type: String, default: null },
    key: { type: String, default: null },
    name: { type: String, default: null },
  },
  { _id: false },
);

const accomplishmentReportSchema = new mongoose.Schema(
  {
    event_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    narrative: {
      type: String,
      default: "",
    },
    office_memorandum: {
      type: fileMetaSchema,
      default: null,
    },
    activity_design: {
      type: fileMetaSchema,
      default: null,
    },
    attendance_sheet: {
      type: fileMetaSchema,
      default: null,
    },
    photos: {
      type: [fileMetaSchema],
      default: [],
    },
    other_attachments: {
      type: [fileMetaSchema],
      default: [],
    },
    submitted_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserAuth",
      required: true,
    },

    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserAuth",
      default: null,
    },
    status: {
      type: String,
      enum: ["draft", "submitted", "approved", "needs_revision"],
      default: "draft",
    },
  },
  { timestamps: true },
);

accomplishmentReportSchema.index({ event_id: 1 });
accomplishmentReportSchema.index({ submitted_by: 1 });

export default mongoose.models.AccomplishmentReport ||
  mongoose.model("AccomplishmentReport", accomplishmentReportSchema);