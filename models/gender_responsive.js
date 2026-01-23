import { Schema } from "mongoose";

const genderResponsiveSchema = new Schema(
  {
    equal_access_resources: {
      type: Boolean,
      required: true,
    },

    control_over_resources: {
      type: Boolean,
      required: true,
    },

    consulted_community_issues: {
      type: Boolean,
      required: true,
    },
    consulted_women_issues: {
      type: Boolean,
      required: true,
    },
    consulted_organization_issues: {
      type: Boolean,
      required: true,
    },

    officials_respect_rights: {
      type: String,
      enum: [
        "Always",
        "Very Frequently",
        "Occasionally",
        "Rarely",
        "Very Rarely",
        "Never",
      ],
      required: true,
    },
    treated_with_respect: {
      type: String,
      enum: [
        "Always",
        "Very Frequently",
        "Occasionally",
        "Rarely",
        "Very Rarely",
        "Never",
      ],
      required: true,
    },
  },
  { _id: false }
);

export default genderResponsiveSchema;
