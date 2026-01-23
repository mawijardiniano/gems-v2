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

    spouse_different_religion: {
      type: String,
      enum: ["Yes", "No", "N/A"],
      required: true,
    },

    spouse_cultural_difference: {
      type: String,
      enum: ["Yes", "No", "N/A"],
      required: true,
    },
  },
  { _id: false }
);

export default communitySchema;
