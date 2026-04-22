import { Schema, model, models } from "mongoose";

const ProjectSchema = new Schema(
  {
    year: { type: Number, required: true },
    gender_issue: { type: String, required: true },
    cause_gender_issue: { type: [String], required: true },
    gad_objective: { type: [String], required: true },
    supporting_statistics_data: { type: String },
    relevant_agency: { type: String, required: true },
    gad_activity: { type: [String], required: true },
    performance_indicator_target: { type: [String], required: true },
    gad_budget: { type: Number, required: true },
    source_budget: { type: String, required: true },
    responsible_office: { type: String, required: true },
    events: [{ type: Schema.Types.ObjectId, ref: "Event" }],
  },
  { timestamps: true },
);

export default models.Project || model("Project", ProjectSchema);



// import { Schema, model, models } from "mongoose";

// const CommentSchema = new Schema(
//   {
//     userId: {
//       type: Schema.Types.ObjectId,
//       ref: "UserAuth",
//       required: true,
//     },

//     message: {
//       type: String,
//       required: true,
//     },

//     type: {
//       type: String,
//       enum: ["comment", "approval", "revision"],
//       default: "comment",
//     },
//   },
//   { timestamps: true }
// );


// const ProjectSchema = new Schema(
//   {
//     year: { type: Number, required: true },
//     gender_issue: { type: String, required: true },
//     cause_gender_issue: { type: [String], required: true },
//     gad_objective: { type: [String], required: true },
//     supporting_statistics_data: { type: String },
//     relevant_agency: { type: String, required: true },
//     gad_activity: { type: [String], required: true },
//     performance_indicator_target: { type: [String], required: true },
//     gad_budget: { type: Number, required: true },
//     source_budget: { type: String, required: true },
//     responsible_office: { type: String, required: true },
//     events: [{ type: Schema.Types.ObjectId, ref: "Event" }],

//     status: {
//       type: String,
//       enum: [
//         "draft",
//         "for_review",
//         "needs_revision",
//         "for_endorsement",
//         "approved",
//         "disapproved",
//       ],
//       default: "draft",
//     },

//     comments: [CommentSchema],

//     signed_copy: { type: String }, 

//   },
//   { timestamps: true }
// );

// export default models.Project || model("Project", ProjectSchema);