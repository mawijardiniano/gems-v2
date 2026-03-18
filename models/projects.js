import { Schema, model, models } from "mongoose";

const ProjectSchema = new Schema(
  {
    project_name: { type: String, required: true },
    events: [{ type: Schema.Types.ObjectId, ref: "Event" }]
  },
  { timestamps: true },
);

export default models.Project || model("Project", ProjectSchema);
