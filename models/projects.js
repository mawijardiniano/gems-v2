import { Schema, model, models } from "mongoose";

const ProjectSchema = new Schema(
  {
    gender_issue : { type: String, required: true },
    cause_gender_issue: { type: String, required: true },
    gad_objective : { type: String, required: true },
    supporting_statistics_data: { type: String},
    relevant_agency: { type: String, required: true },
    gad_activity: { type: String, required: true },
    performance_indicator_target: { type: String, required: true },
    gad_budget: { type: String, required: true },
    source_budget: { type: String, required: true },
    responsible_office: { type: String, required: true },
    events: [{ type: Schema.Types.ObjectId, ref: "Event" }]
  },
  { timestamps: true },
);

export default models.Project || model("Project", ProjectSchema);
