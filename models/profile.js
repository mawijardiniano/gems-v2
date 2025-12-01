import mongoose from "mongoose";
import { Schema } from "mongoose";
import personalSchema from "./personal";
import gadDataSchema from "./gadData";
import affiliationSchema from "./affiliation";
import contactSchema from "./contact";

const gemsProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    virtualId: { type: String, unique: true, sparse: true },
    currentStatus: {
      type: String,
      enum: ["Employee", "Student", "Applicant"],
      required: true,
    },
    personal: personalSchema,
    gadData: gadDataSchema,
    affiliation: affiliationSchema,
    contact: contactSchema,
  },
  {
    timestamps: true,
  }
);

const GemsProfile =
  mongoose.models.GemsProfile ||
  mongoose.model("GemsProfile", gemsProfileSchema);

export default GemsProfile;
