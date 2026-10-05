import { Schema, model, models } from "mongoose";

const EventSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    /* Human-readable code shown on event cards, e.g. "GAD-2025-001".
       Assigned by the API on create (prefix comes from the type of activity)
       and kept forever, even if other events are deleted. */
    reference_number: {
      type: String,
      default: null,
      trim: true,
    },
    number_of_days: { type: Number },
    start_dates: [{ type: Date }],
    end_dates: [{ type: Date }],
    start_date: {
      type: Date,
      validate: {
        validator: function (value) {
          return !value || !this.end_date || this.end_date >= value;
        },
        message: "End date/time must be after start date/time.",
      },
    },
    end_date: { type: Date },
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
          /* Colleges are always spelled with "and" — the canonical list lives in
             lib/colleges.js (OFFICE_OPTIONS). Rows saved before the rename were
             converted by scripts/backfill-event-office-names.mjs. */
          "College of Arts and Social Sciences",
          "College of Business and Accountancy",
          "College of Criminal Justice Education",
          "College of Education",
          "College of Engineering",
          "College of Environmental Studies",
          "College of Fisheries and Aquatic Sciences",
          "College of Governance",
          "College of Industrial Technology",
          "College of Information and Computing Sciences",
          "Office of the President",
          "University and Board Secretary",
          "Office of the Vice President for Administration and Finance",
          "Office of the Vice President for Academic Affairs",
          "Office of the Chief Administrative Officer",
          "Quality Assurance Office",
          "Planning Unit",
          "GAD Unit",
          "Human Resource and Management Unit",
          "Legal Unit",
          "Records Office",
          "Budget Office",
          "Internal Audit Unit",
          "Information Unit",
          "Procurement Unit",
          "Supply and Property Management Unit",
          "Accounting Office",
          "Cash Unit",
          "Registrar's Office",
          "Health Services Unit",
          "Research & Extension Office",
          "Learning Resource Center",
          "General Services Unit",
          "Project Management Unit",
          "Business Affairs Office",
          "Motorpool",
          "Information and Communication Technology Unit",
          "Security Services",
          "Gasan Campus",
          "Torrijos Campus",
          "Santa Cruz Campus",
        ],
        required: true,
      },
    ],
    /* Free text, like the GPB responsible office: an office or unit that is not
       on the canonical list can still be named here. The dropdown still offers
       every OFFICE_OPTIONS entry, and the event API stores known offices in
       their canonical spelling. */
    co_organizing_office_unit: [
      {
        type: String,
        trim: true,
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
  { timestamps: true, optimisticConcurrency: true },
);


EventSchema.index({ status: 1, createdAt: -1 });
EventSchema.index({ created_by: 1 });
EventSchema.index({ project: 1 });
EventSchema.index({ start_date: 1 });

/* Reference numbers already embed the activity type and year, so a single
   unique field is enough. Events created before the feature (null) are excluded
   from the constraint. */
EventSchema.index(
  { reference_number: 1 },
  {
    unique: true,
    partialFilterExpression: { reference_number: { $type: "string" } },
  },
);

export default models.Event || model("Event", EventSchema);