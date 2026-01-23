import { Schema } from "mongoose";

const RA_fields = [
  "RA_6275",
  "RA_10354",
  "RA_7192",
  "RA_7877",
  "RA_8972",
  "RA_9710",
  "RA_9262",
  "RA_7277",
  "RA_11313",
  "RA_8353",
  "RA_11596",
];

const socialDevelopmentSchema = new Schema(
  {
    housing_work_life_balance: {
      house_property_owned: {
        type: Boolean,
        required: true,
      },

      job_hinder_parent_role: {
        type: String,
        enum: ["Yes", "No", "N/A"],
        required: true,
      },

      working_parent_hindrance_career: {
        type: String,
        enum: ["Yes", "No", "N/A"],
        required: true,
      },

      enough_rest: {
        type: Boolean,
        required: true,
      },

      manage_stress: {
        type: Boolean,
        required: true,
      },

      stress_management_methods: {
        type: String,
      },
    },

    personal_development_empowerment: {
      undertake_empowerment_activities: {
        type: Boolean,
        required: true,
      },

      empowerment_activities_examples: {
        type: String,
      },

      home_environment_growth: {
        type: Boolean,
        required: true,
      },

      community_environment_growth: {
        type: Boolean,
        required: true,
      },

      environment_growth_reason: {
        type: String,
      },
    },

    awareness: RA_fields.reduce(
      (acc, ra) => ({ ...acc, [ra]: { type: String, enum: ["Yes", "No", "Not Sure"], required: true } }),
      {}
    ),

    observed_in_university_or_community: RA_fields.reduce(
      (acc, ra) => ({ ...acc, [ra]: { type: String, enum: ["Yes", "No", "Not Sure"], required: true } }),
      {}
    ),

    other_training_needs: {
      type: [String],
      enum: [
        "Responsible Parenthood and Reproductive Health Act of 2012",
        "Anti-Violence against Women and their Children Act of 2014",
        "Disaster Preparedness and Risk Reduction Management",
        "Women Empowerment & Development Towards Gender Equality (WEDGE) by PCW",
        "Human Rights-Based Approach (HRBA) to Development Planning and Basic Human Rights by CHR",
        "Harmonized Gender and Development Guidelines (HGDG) by NEDA for Project Development, Implementation, Monitoring and Evaluation",
        "Women Empowerment through Sustainable Livelihood Activities",
        "All laws regarding gender and development",
        "Financial Education or at least Financial Literacy especially to young individuals",
        "Not a law, but for awareness, SOGIE Educational Education",
        "Team Building",
        "None",
        "Iba pa",
      ],
      default: [],
    },

    other_training_needs_specify: {
      type: String,
    },
  },
  { _id: false }
);

export default socialDevelopmentSchema;
