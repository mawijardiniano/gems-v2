import { Schema } from "mongoose";
import academicInformationSchema from "./academic_information.js";
import employmentInformationSchema from "./employment_information.js";

const personalSchema = new Schema(
  {
    first_name: {
      type: String,
      required: true,
    },

    middle_name: {
      type: String,
    },

    last_name: {
      type: String,
      required: true,
    },

    civil_status: {
      type: String,
      enum: [
        "Single", 
        "Married",
        "Widow",
        "Legally Separated Marriage",
        "Living In/Common Law",
        "Annulled",
      ],
      required: true,
    },

    religion: {
      type: String,
      enum: [
        "Roman Catholic",
        "Iglesia ni Cristo",
        "Iglesia Independencia Filipina",
        "Protestant",
        "Born Again Christian",
        "Evangelical Christian",
        "Latter Day Saints",
        "Members Church of God International (MGCI)",
      ],
      required: true,
    },

    nationality: {
      type: String,
      default: "Filipino",
    },

    currentStatus: {
      type: String,
      enum: ["Student", "Employee"],
      required: true,
    },

    birthday: {
      type: Date,
      required: true,
    },

    bloodType: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
      required: true,
    },
  },
  { _id: false },
);

export default personalSchema;
