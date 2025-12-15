import { Schema } from "mongoose";

const gadDataSchema = new Schema(
  {
    sexAtBirth: {
      type: String,
      enum: ["Male", "Female", "Intersex", "Prefer not to disclose"],
      required: true,
    },
    genderIdentity: { type: String, default: "Same as Sex at Birth" },
    genderExpression: { type: String },
    sexualOrientation: {
      type: String,
      enum: [
        "Heterosexual",
        "Homosexual",
        "Bisexual",
        "Pansexual",
        "Asexual",
        "Aromantic",
        "Demisexual",
        "Queer",
        "Prefer not to disclose",
      ],
      default: "Prefer not to disclose",
    },
    isPWD: { type: Boolean, required: true },
    disabilityDetails: { type: String },
    isIndigenousPerson: { type: Boolean, required: true },
    socioEconomicStatus: {
      type: String,
      enum: [
        "Low Income",
        "Middle Income",
        "High Income",
        "Prefer not to disclose",
      ],
    },
    headOfHousehold: { type: String },
  },
  { _id: false }
);

export default gadDataSchema;
