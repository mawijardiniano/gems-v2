import { Schema } from "mongoose";

const communitySchema = new Schema(
  {
    community_involvement: {
      type: Boolean,
      required: true,
    },

    exercise_right_to_vote: {
      type: Boolean,
      required: true,
    },

    spouse_different_religion: {//remove if single
      type: String,
      enum: ["Yes", "No", "N/A"],
    },

    spouse_cultural_difference: {//remove if single
      type: String,
      enum: ["Yes", "No", "N/A"],
    },
  },
  { _id: false }
);

export default communitySchema;
