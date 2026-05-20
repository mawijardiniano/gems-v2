import { Schema, model, models } from "mongoose";

const GadPlanSchema = new Schema(
  {
    year: { type: Number, required: true, unique: true },
    gaaBudgetId: {
      type: Schema.Types.ObjectId,
      ref: "GAABudget",
    },
    projects: [{ type: Schema.Types.ObjectId, ref: "Project" }],
    status_of_gpb: {
      status: {
        type: String,
        enum: ["draft", "approved", "disapproved"],
        default: "draft",
      },
      reason: {
        type: String,
      },
      scanned_copy: {
        url: {
          type: String,
          default: "",
        },
        key: {
          type: String,
          default: "",
        },
      },
    },
    archived: { type: Boolean, default: false },
    archivedAt: { type: Date, default: null },
    archivedBy: { type: Schema.Types.ObjectId, ref: "UserAuth", default: null },
  },
  { timestamps: true },
);

export default models.GPB || model("GPB", GadPlanSchema);
