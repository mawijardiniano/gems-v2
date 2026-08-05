import { Schema, model, models } from "mongoose";

const EventSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    number_of_days: { type: Number, required: true },
    start_dates: [{ type: Date, required: true }],
    end_dates: [{ type: Date, required: true }],
    venue: { type: String, default: "" },
    eligibility_criteria: [
      {
        type: String,
        enum: [
          "Scholarship Applicant",
          "Solo Parent",
          "PWDs",
          "Indigenous Group",
          "LGBTQIA+",
          "Low Income Student",
          "None",
        ],
      },
    ],
    type_of_activity: {
      type: String,
      enum: [
        "Academic",
        "Administrative",
        "GAD",
        "Extension",
        "Research",
        "Students",
        "Others",
      ],
      required: true,
    },
    organizing_office_unit: [
      {
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
    ],
    co_organizing_office_unit: [
      {
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
      },
    ],
    target_number_of_participants: {
      type: Number,
    },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: "UserAuth",
      required: true,
    },
    updated_by: { type: Schema.Types.ObjectId, ref: "UserAuth" },
    status_updated_by: { type: Schema.Types.ObjectId, ref: "UserAuth" },
    status_updated_at: { type: Date },
    cancelled_by: { type: Schema.Types.ObjectId, ref: "UserAuth" },
    cancelled_at: { type: Date },
    cancel_reason: { type: String, default: "" },
    registered_users: [{ type: Schema.Types.ObjectId, ref: "UserAuth" }],
    interested_users: [
      { type: Schema.Types.ObjectId, ref: "UserAuth", default: [] },
    ],
    not_interested_users: [
      { type: Schema.Types.ObjectId, ref: "UserAuth", default: [] },
    ],
    attended_users: [
      {
        user_id: { type: Schema.Types.ObjectId, ref: "UserAuth" },
        attended_at: { type: Date, default: Date.now },
      },
    ],
    participant_numbers: [
      {
        user_id: { type: Schema.Types.ObjectId, ref: "UserAuth" },
        number: { type: Number },
      },
    ],
    status: {
      type: String,
      enum: ["active", "cancelled", "completed"],
      default: "active",
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      default: null,
      validate: {
        validator: function (value) {
          if (this.type_of_activity === "GAD") {
            return value != null;
          }
          return true;
        },
        message:
          "Project is required when type of activity is GAD.",
      },
    },
    gad_activity: {
      type: String,
      default: "",
      validate: {
        validator: function (value) {
          if (this.type_of_activity === "GAD") {
            return Boolean(value && String(value).trim().length > 0);
          }
          return true;
        },
        message:
          "GAD Activity is required when type of activity is GAD.",
      },
    },
    event_poster: {
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
  { timestamps: true },
);


EventSchema.index({ status: 1, createdAt: -1 });
EventSchema.index({ created_by: 1 });
EventSchema.index({ project: 1 });
EventSchema.index({ "start_dates.0": 1 });

export default models.Event || model("Event", EventSchema);