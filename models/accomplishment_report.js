import mongoose from "mongoose";

const accomplishmentReportSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
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

accomplishmentReportSchema.index({ eventId: 1 });
accomplishmentReportSchema.index({ submitted_by: 1 });

export default mongoose.models.AccomplishmentReport ||
  mongoose.model("AccomplishmentReport", accomplishmentReportSchema);