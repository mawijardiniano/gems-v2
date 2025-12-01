import { Schema } from "mongoose";

const employeeDetailsSchema = new Schema(
  {
    department: {
      type: String,
      required: function () {
        return this.parent().currentStatus === "Employee";
      },
    },
    position: {
      type: String,
      required: function () {
        return this.parent().currentStatus === "Employee";
      },
    },
    employmentType: {
      type: String,
      enum: ["Permanent", "Contractual"],
      required: function () {
        return this.parent().currentStatus === "Employee";
      },
    },
  },
  { _id: false }
);

const studentDetailsSchema = new Schema(
  {
    course: {
      type: String,
      required: function () {
        return this.parent().currentStatus === "Student";
      },
    },
    yearLevel: {
      type: Number,
      min: 1,
      max: 5,
      required: function () {
        return this.parent().currentStatus === "Student";
      },
    },
    isScholar: {
      type: Boolean,
      required: function () {
        return this.parent().currentStatus === "Student";
      },
    },
  },
  { _id: false }
);

const affiliationSchema = new Schema(
  {
    campus: { type: String, required: true },
    college: { type: String, required: true },

    employeeDetails: employeeDetailsSchema,
    studentDetails: studentDetailsSchema,
  },
  { _id: false }
);

export default affiliationSchema;
