import { Schema } from "mongoose";

const gadDataSchema = new Schema(
  {
    sexAtBirth: {
      type: String,
      enum: ["Male", "Female"],
    },

    gender_preference: {
      type: String,
      enum: ["Male", "Female", "LGBTQIA+"],
    },

    isPWD: {
      type: Boolean,

    },
    pwd_type: {
      type: String,
      enum: [
        "Psychosocial Disability",
        "Chronic Illness",
        "Learning Disability",
        "Visual Disability",
        "Hearing Disability",
        "Physical Disability",
        "Mental Disability",
        "Speech and Language Impairment",
        "Multiple Disabilities",
        "Other",
      ],
      required: function () {
        return this.isPWD === true;
      },
    },
    isIndigenousPerson: {
      type: Boolean,

    },
    socioEconomicStatus: {
      type: String,
      enum: ["Low Income", "Middle Income", "High Income"],

    },
    headOfHousehold: {
      type: String,

    },
  },
  { _id: false },
);

export default gadDataSchema;
