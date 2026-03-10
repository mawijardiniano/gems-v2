import { Schema } from "mongoose";

const addressSchema = new Schema(
  {
    barangay: { type: String },
    city: { type: String },
    province: { type: String },
    region: { type: String },
  },
  { _id: false },
);

export default addressSchema;
