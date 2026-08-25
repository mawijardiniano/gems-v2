import mongoose from "mongoose";
import { Schema } from "mongoose";
import personalSchema from "./personal.js";
import gadDataSchema from "./gadData.js";
import affiliationSchema from "./affiliation.js";
import contactSchema from "./contact.js";

const gemsProfileSchema = new Schema(
  {
    personal: personalSchema,
    gadData: gadDataSchema,
    affiliation: affiliationSchema,
    contact: contactSchema,

    created_by: {
      type: Schema.Types.ObjectId,
      ref: "UserAuth",
      default: null,
    },
    updated_by: {
      type: Schema.Types.ObjectId,
      ref: "UserAuth",
      default: null,
    },
    last_viewed_at: {
      type: Date,
      default: null,
    },
    data_version: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  },
);

gemsProfileSchema.virtual("fullName").get(function () {
  const p = this.personal;
  if (!p) return "";
  return [p.first_name, p.middle_name, p.last_name]
    .filter(Boolean)
    .join(" ");
});

gemsProfileSchema.index({ "personal.currentStatus": 1 });
gemsProfileSchema.index({ "gadData.sexAtBirth": 1 });
gemsProfileSchema.index({ "affiliation.academic_information.college": 1 });
gemsProfileSchema.index({ "affiliation.academic_information.year_level": 1 });
gemsProfileSchema.index({ "affiliation.academic_information.student_id": 1 });
gemsProfileSchema.index({ "affiliation.employment_information.office": 1 });
gemsProfileSchema.index({ "affiliation.employment_information.employee_id": 1 });
gemsProfileSchema.index({
  "affiliation.employment_information.employment_status": 1,
});
gemsProfileSchema.index({
  "affiliation.employment_information.employment_appointment_status": 1,
});
gemsProfileSchema.index({ "contact.email": 1 });

gemsProfileSchema.set("toJSON", { virtuals: true });
gemsProfileSchema.set("toObject", { virtuals: true });

const GemsProfile =
  mongoose.models.GemsProfile ||
  mongoose.model("GemsProfile", gemsProfileSchema);

export default GemsProfile;