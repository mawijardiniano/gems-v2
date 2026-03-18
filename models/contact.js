import { Schema } from "mongoose";
import addressSchema from "./address.js";

const contactSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true },
    mobileNumber: { type: String, required: true },
    permanentAddress: { type: addressSchema },
    currentAddress: { type: addressSchema },
  },
  { _id: false }
);

export default contactSchema;
