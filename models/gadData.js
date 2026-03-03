import { Schema } from "mongoose";

const gadDataSchema = new Schema(
  {
    sexAtBirth: {
      type: String,
      enum: ["Male", "Female"],
      required: true,
    },

    gender_preference: {
      type: String,
      enum: ["Male", "Female", "LGBTQIA+"],
    },

    isPWD: {
      type: Boolean,
      required: true,
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
      required: true,
    },
    socioEconomicStatus: {
      type: String,
      enum: ["Low Income", "Middle Income", "High Income"],
      required: true,
    },
    headOfHousehold: {
      type: String,
      required: true,
    },
  },
  { _id: false },
);

export default gadDataSchema;
