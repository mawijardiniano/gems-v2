import mongoose from "mongoose";
import { Schema } from "mongoose";
import User from "./user";
import personalSchema from "./personal";
import gadDataSchema from "./gadData";
import affiliationSchema from "./affiliation";
import contactSchema from "./contact";

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
