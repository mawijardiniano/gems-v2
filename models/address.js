import { Schema } from "mongoose";

const addressSchema = new Schema(
  {
    region: {
      code: { type: String },
      name: { type: String },
    },
    province: {
      code: { type: String },
      name: { type: String },
    },
    city: {
      code: { type: String },
      name: { type: String },
    },
    barangay: {
      code: { type: String },
      name: { type: String },
    },
  },
  { _id: false },
);

export default addressSchema;
