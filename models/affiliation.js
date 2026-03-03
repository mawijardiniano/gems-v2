import { Schema } from "mongoose";
import academicInformationSchema from "./academic_information";
import employmentInformationSchema from "./employment_information";

const affiliationSchema = new Schema(
  {
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
