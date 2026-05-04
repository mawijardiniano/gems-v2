import { Schema, model, models } from "mongoose";

const GadPlanSchema = new Schema(
  {
    year: { type: Number, required: true, unique: true },
    gaaBudgetId: {
      type: Schema.Types.ObjectId,
      ref: "GAABudget",
    },
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
    archived: { type: Boolean, default: false },
    archivedAt: { type: Date, default: null },
    archivedBy: { type: Schema.Types.ObjectId, ref: "UserAuth", default: null },
  },
  { timestamps: true },
);

export default models.GPB || model("GPB", GadPlanSchema);
