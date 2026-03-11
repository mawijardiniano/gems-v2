import { Schema, model, models } from "mongoose";

const EventSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
    venue: { type: String, default: "" },
    eligibility_criteria: {
      type: String,
      enum: [
        "Scholarship Applicant",
        "Solo Parent",
        "PWDs",
        "Indigenous Groups",
        "LGBTQIA+",
        "Low Income Students",
        "None"
      ],
      required: false,
    },
    type_of_activity: {
      type: String,
      enum: [
        "Academic",
        "Administrative",
        "GAD",
        "Extension Research",
        "Students",
        "Others",
      ],
      required: true,
    },
    organizing_office_unit: {
      type: String,
      enum: [
        "Graduate School",
        "College of Agriculture",
        "College of Allied Health Sciences",
        "College of Arts & Social Sciences",
        "College of Business & Accountancy",
        "College of Criminal Justice Education",
        "College of Education",
        "College of Engineering",
        "College of Environmental Studies",
        "College of Fisheries & Aquatic Sciences",
        "College of Governance",
        "College of Industrial Technology",
        "College of Information & Computing Sciences",
        "Offices under the Office of the University President",
        "Offices under the Office of the Vice President for Academic Affairs",
        "Offices under the Office of the Vice President for Administration and Finance",
        "Offices under the Office of the Vice President for Research and Extension",
        "Offices under the Office of the Vice President for Student Affairs and Services",
      ],
      required: true,
    },
    target_number_of_participants : {
      type: Number,
      required:true
    },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: "UserAuth",
      required: true,
    },
    updated_by: { type: Schema.Types.ObjectId, ref: "UserAuth" },
    registered_users: [{ type: Schema.Types.ObjectId, ref: "UserAuth" }],
    interested_users: [
      { type: Schema.Types.ObjectId, ref: "UserAuth", default: [] },
    ],
    not_interested_users: [
      { type: Schema.Types.ObjectId, ref: "UserAuth", default: [] },
    ],
    status: {
      type: String,
      enum: ["active", "cancelled", "completed"],
      default: "active",
    },
  },
  { timestamps: true },
);

export default models.Event || model("Event", EventSchema);
