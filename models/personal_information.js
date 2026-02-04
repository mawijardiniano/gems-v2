import { Schema } from "mongoose";
import academicInformationSchema from "./academic_information.js";
import employmentInformationSchema from "./employment_information.js";

const personalInformationSchema = new Schema(
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

    sex: {
      type: String,
      enum: ["Male", "Female"],
      required: true,
    },

    gender_preference: {
      type: String,
      enum: [
        "Heterosexual Male",
        "Heterosexual Female",
        "Gay",
        "Lesbian",
        "Prefer not to say",
      ],
      required: true,
    },

    age_bracket: {
      type: String,
      enum: ["18-30", "31-40", "41-50", "51-60", "61 and above"],
      required: true,
    },

    civil_status: {
      type: String,
      enum: [
        "Single", //remove spouse questions
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

    person_type: {
      type: String,
      enum: ["Student", "Employee"], //academic info if student //employement info if employee
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

    solo_parent: {
      type: Boolean,
      required: true,
    },
    pwd: {
      type: Boolean,
      default: false,
    },
    pwd_type: {
      type: String,
      enum: [
        "Visual Impairment",
        "Hearing Impairment",
        "Physical Disability",
        "Mental Disability",
        "Multiple Disabilities",
        "Other",
      ],
      required: function () {
        return this.pwd === true;
      },
    },

    total_annual_family_income: {
      type: String,
      enum: [
        "₱1,000.00 - ₱50,000.00",
        "₱51,000.00 - ₱100,000.00",
        "₱101,000.00 - ₱200,000.00",
        "₱201,000.00 - ₱300,000.00",
        "₱301,000.00 - ₱400,000.00",
        "₱401,000.00 - ₱500,000.00",
        "₱501,000.00 and above",
      ],
      required: true,
    },

    health_problems: {
      type: [String],
      enum: [
        "Physical Impairment",
        "Physiological/Mental Condition",
        "Heart Ailment",
        "Diabetes",
        "Eye Problems",
        "Hypertension/High Blood Pressure",
        "Cancer",
        "Headache (Migraine, Vertigo, etc.)",
        "Hyper/Hypothyroidism",
        "Autoimmune Disease",
        "Pneumonia",
        "Polycystic Kidney Disease (PKD)",
        "Respiratory Allergies",
        "Allergic Rhinitis",
        "Nearsightedness",
        "Asthma",
        "Skin Allergies",
        "Rheumatoid Arthritis/Gout",
        "Allergy/Hyper Acidity",
        "Allergies",
        "None",
        "Iba pa",
      ],
      required: true,
    },

    health_problems_other: {
      type: String,
    },
  },
  { _id: false },
);

export default personalInformationSchema;
