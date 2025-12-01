import { Schema } from "mongoose";

const addressSchema = new Schema(
  {
    houseNo: { type: String },
    barangay: { type: String },
    city: { type: String },
    province: { type: String },
  },
  { _id: false }
);

export default addressSchema;
