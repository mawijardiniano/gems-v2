import { Schema } from "mongoose";

const gadDataSchema = new Schema(
  {
    sexAtBirth: {
      type: String,
      enum: ["Male", "Female", "Intersex", "Prefer not to disclose"],
      required: true,
    },
    genderIdentity: { type: String },
    genderExpression: { type: String },
    sexualOrientation: { type: String },
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
