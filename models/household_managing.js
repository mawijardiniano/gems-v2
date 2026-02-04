import { Schema } from "mongoose";

const householdSchema = new Schema(
  {
    spouse_participate_household: {
      //remove if single
      type: String,
      enum: ["Yes", "No", "N/A"],
    },

    family_participate_household: {
      type: Boolean,
      required: true,
    },

    decision_manage_household: {
      type: Boolean,
      required: true,
    },

    household_decision_explanation: {
      type: String,
      required: true,
    },
  },
  { _id: false },
);

export default householdSchema;
