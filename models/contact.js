import { Schema } from "mongoose";
import addressSchema from "./address.js";

const contactSchema = new Schema(
  {
    email: { 
      type: String, 
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },
    mobileNumber: { 
      type: String,
      trim: true,
    },
    permanentAddress: { type: addressSchema },
    currentAddress: { type: addressSchema },
  },
  { _id: false }
);

export default contactSchema;