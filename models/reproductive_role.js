import { Schema } from "mongoose";

const reproductiveSchema = new Schema(
  {
    childbearing_stage: {
      type: String,
      enum: ["Yes", "No", "N/A"],
      required: true,
    },

    child_rearing_stage: {
      type: String,
      enum: ["Yes", "No", "N/A"],
      required: true,
    },

    family_planning: {
      type: String,
      enum: ["Yes", "No", "N/A"],
      required: true,
    },
    spouse_share_childcare: {//remove if single
      type: String,
      enum: ["Yes", "No", "N/A"],
    },

    attend_school_needs: {
      type: String,
      enum: ["Yes", "No", "N/A"],
      required: true,
    },

    childcare_responsibility: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

export default reproductiveSchema;
