import { Schema } from "mongoose";

const environmentalSchema = new Schema(
  {
    environmental_protection: {
      type: String,
      enum: ["Yes", "No", "N/A"],
      required: true,
    },

    disaster_reduction: {
      type: String,
      enum: ["Yes", "No", "N/A"],
      required: true,
    },

    disaster_knowledge_personal: {
      type: String,
      enum: ["Yes", "No", "N/A"],
      required: true,
    },

    disaster_knowledge_family: {
      type: String,
      enum: ["Yes", "No", "N/A"],
      required: true,
    },
    disaster_knowledge_officemates: {
      type: String,
      enum: ["Yes", "No", "N/A"],
      required: true,
    },
    fire_drill: {
      type: String,
      enum: ["Yes", "No", "N/A"],
      required: true,
    },
    earthquake_drill: {
      type: String,
      enum: ["Yes", "No", "N/A"],
      required: true,
    },
    trained_marshals: {
      type: Boolean,
      required: true,
    },
    emergency_equipment_home: {
      type: String,
      enum: ["Yes", "No", "N/A"],
      required: true,
    },
    emergency_equipment_office: {
      type: String,
      enum: ["Yes", "No", "N/A"],
      required: true,
    },
  },
  { _id: false }
);

export default environmentalSchema;
