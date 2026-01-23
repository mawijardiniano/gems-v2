import { Schema } from "mongoose";

const economicFinancialSchema = new Schema(
  {
    breadwinner: {
      type: Boolean,
      required: true
    },

    income_sources: {
      type: [String],
      enum: [
        "Active Income",
        "Passive Income",
        "Portfolio (Investment) Income",
        "Other Potential Sources",
        "N/A",
        "Iba pa"
      ],
      required: true
    },

    income_sources_other: {
      type: String
    },

    cultural_barrier_work: {
      type: Boolean,
      required: true
    },

    manage_financial_resources: {
      type: Boolean,
      required: true
    },

    participate_financial_decisions: {
      type: Boolean,
      required: true
    }
  },
  { _id: false }
);

export default economicFinancialSchema;
