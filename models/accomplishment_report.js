import { Schema, model, models } from "mongoose";

const FileSchema = new Schema({
  url: { type: String, default: "" },
  key: { type: String, default: "" },
});

const AccomplishmentReportSchema = new Schema(
  {
    event_id: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      unique: true,
    },

    office_memorandum: FileSchema,
    activity_design: FileSchema,

    narrative: {
      type: String,
      default: "",
    },

    photos: [FileSchema],
    attendance_sheet: FileSchema,
    submitted_by: {
      type: Schema.Types.ObjectId,
      ref: "UserAuth",
    },
  },
  { timestamps: true },
);

export default models.AccomplishmentReport ||
  model("AccomplishmentReport", AccomplishmentReportSchema);
