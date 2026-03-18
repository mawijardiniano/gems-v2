import mongoose from "mongoose";
import { Schema } from "mongoose";
import personalSchema from "./personal.js";
import gadDataSchema from "./gadData.js";
import affiliationSchema from "./affiliation.js";
import contactSchema from "./contact.js";

const gemsProfileSchema = new Schema(
  {
    personal: personalSchema,
    gadData: gadDataSchema,
    affiliation: affiliationSchema,
    contact: contactSchema,
  },
  {
    timestamps: true,
  },
);

const GemsProfile =
  mongoose.models.GemsProfile ||
  mongoose.model("GemsProfile", gemsProfileSchema);

export default GemsProfile;
