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
        "Visual Impairment",
        "Hearing Impairment",
        "Physical Disability",
        "Mental Disability",
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
