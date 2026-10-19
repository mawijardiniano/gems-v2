import { Schema } from "mongoose";
import academicInformationSchema from "./academic_information.js";
import employmentInformationSchema from "./employment_information.js";

const affiliationSchema = new Schema(
  {
    /* Student/Employee discriminator. This replaces the legacy
       `personal.currentStatus` column: that field is a GEMS-owned identifier,
       not identity data, so it is not in the Vault — but it lived inside the
       `personal` block, which the PII strip removes. It had to move somewhere
       before `personal` could go.

       The `required` functions below already referenced `person_type`, so it
       existed as a name in this schema before the field itself was declared
       (the reference was inert: `undefined === "Student"` is false, so neither
       sub-document was ever actually required). Declaring it here switches
       those two checks back on.

       Same enum and same `required` as the column it replaces, so the strip
       does not quietly drop a validation rule. */
    person_type: {
      type: String,
      enum: ["Student", "Employee"],
      required: true,
    },

    academic_information: {
      type: academicInformationSchema,
      required: function () {
        return this.person_type === "Student";
      },
    },

    employment_information: {
      type: employmentInformationSchema,
      required: function () {
        return this.person_type === "Employee";
      },
    },
  },
  { _id: false },
);

export default affiliationSchema;
