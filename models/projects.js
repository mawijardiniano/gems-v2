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
      enum: ["approval", "revision"],
    },
    fields: [
      {
        type: String,
        enum: [
          "project_type",
          "gender_issue",
          "cause_gender_issue",
          "gad_objective",
          "supporting_statistics_data",
          "relevant_agency",
          "gad_activity",
          "performance_indicator_target",
          "gad_budget",
          "source_budget",
          "responsible_office",
          "general",
        ],
      },
    ],
  },
  { timestamps: true },
);

const FieldSchema = (type) => ({
  value: { type, default: "" },
});

const ProjectSchema = new Schema({
  year: { type: Number, required: true },
  project_type: FieldSchema(String),
  gender_issue: FieldSchema(String),
  cause_gender_issue: FieldSchema([String]),
  gad_objective: FieldSchema([String]),
  supporting_statistics_data: FieldSchema(String),
  relevant_agency: FieldSchema(String),
  gad_activity: FieldSchema([String]),
  performance_indicator_target: FieldSchema([String]),
  gad_budget: FieldSchema(Number),
  source_budget: FieldSchema(String),
  responsible_office: FieldSchema(String),


  actual_accomplishment: {
    type: [String],
    default: [],
  },
  actual_expenditures: {
    type: Number,
    default: 0,
  },

  createdBy: {
    type: Schema.Types.ObjectId,
    ref: "UserAuth",
    default: null,
  },
  lastUpdatedBy: {
    type: Schema.Types.ObjectId,
    ref: "UserAuth",
    default: null,
  },

  events: [{ type: Schema.Types.ObjectId, ref: "Event" }],
  comments: [CommentSchema],
});

export default models.Project || model("Project", ProjectSchema);
