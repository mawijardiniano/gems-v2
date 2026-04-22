import { Schema, model, models } from "mongoose";

const CommentSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "UserAuth",
      required: true,
    },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ["comment", "approval", "revision"],
      default: "comment",
    },
  },
  { timestamps: true }
);

const GadPlanSchema = new Schema(
  {
    year: { type: Number, required: true, unique: true },
    projects: [{ type: Schema.Types.ObjectId, ref: "Project" }],
    status: {
      type: String,
      enum: [
        "draft",
        "for_review",
        "needs_revision",
        "for_endorsement",
        "approved",
        "disapproved",
      ],
      default: "draft",
    },
    comments: [CommentSchema],
    archived: { type: Boolean, default: false },
    archivedAt: { type: Date, default: null },
    archivedBy: { type: Schema.Types.ObjectId, ref: "UserAuth", default: null },
  },
  { timestamps: true }
);

export default models.GPB || model("GPB", GadPlanSchema);