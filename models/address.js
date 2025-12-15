import { Schema } from "mongoose";

const addressSchema = new Schema(
  {
    street: { type: String },
    barangay: { type: String },
    city: { type: String },
    province: { type: String },
  },
  { _id: false }
);

export default addressSchema;
