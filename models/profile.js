// import mongoose from "mongoose";
// import { Schema } from "mongoose";
// import User from "./user"
// import personalSchema from "./personal";
// import gadDataSchema from "./gadData";
// import affiliationSchema from "./affiliation";
// import contactSchema from "./contact";

// const gemsProfileSchema = new Schema(
//   {
//     userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
//     virtualId: { type: String, unique: true, sparse: true },
//     currentStatus: {
//       type: String,
//       enum: ["Employee", "Student", "Applicant"],
//       required: true,
//     },
//     personal: personalSchema,
//     gadData: gadDataSchema,
//     affiliation: affiliationSchema,
//     contact: contactSchema,
//   },
//   {
//     timestamps: true,
//   }
// );

// const GemsProfile =
//   mongoose.models.GemsProfile ||
//   mongoose.model("GemsProfile", gemsProfileSchema);

// export default GemsProfile;

import mongoose from "mongoose";
import { Schema } from "mongoose";
import User from "./user";
import personalInformationSchema from "./personal_information";
import economicFinancialSchema from "./economic_role";
import reproductiveSchema from "./reproductive_role";
import householdSchema from "./household_managing";
import communitySchema from "./community_involvement";
import socialDevelopmentSchema from "./social_development";
import environmentalSchema from "./environmental";
import genderResponsiveSchema from "./gender_responsive";
import securityPeaceJusticeSchema from "./security_peace_justice";

const gemsProfileSchema = new Schema(
  {
    personal_information: personalInformationSchema,
    economic_financial_role: economicFinancialSchema,
    reproductive_family_role: reproductiveSchema,
    household_managing_role: householdSchema,
    community_involvement: communitySchema,
    social_development: socialDevelopmentSchema,
    environmental_climate: environmentalSchema,
    gender_responsive: genderResponsiveSchema,
    security_peace: securityPeaceJusticeSchema,
  },
  {
    timestamps: true,
  }
);

const GemsProfile =
  mongoose.models.GemsProfile ||
  mongoose.model("GemsProfile", gemsProfileSchema);

export default GemsProfile;
