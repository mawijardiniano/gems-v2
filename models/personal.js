import { Schema } from "mongoose";

const personalSchema = new Schema(
  {
    lastName: { type: String, required: true },
    firstName: { type: String, required: true },
    middleName: { type: String },
    birthday: { type: Date, required: true },
    civilStatus: {
      type: String,
      enum: ["Single", "Married", "Widowed", "Separated", "Divorced", "Other"],
      required: true,
    },
    nationality: { type: String, default: "Filipino", required: true },
    bloodType: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    },
    religion: { type: String },
  },
  { _id: false }
);

export default personalSchema;
