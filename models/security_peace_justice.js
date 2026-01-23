import { Schema } from "mongoose";

const securityPeaceJusticeSchema = new Schema(
  {
    gender_based_experiences: {
      verbal_and_emotional_abuse: {
        type: String,
        enum: ["Always", "Often", "Sometimes", "Rarely", "Never"],
        required: true,
      },
      mental_and_emotional_anguish: {
        type: String,
        enum: ["Always", "Often", "Sometimes", "Rarely", "Never"],
        required: true,
      },
      public_humiliation: {
        type: String,
        enum: ["Always", "Often", "Sometimes", "Rarely", "Never"],
        required: true,
      },
      sexual_favor_as_condition: {
        type: String,
        enum: ["Always", "Often", "Sometimes", "Rarely", "Never"],
        required: true,
      },
      workplace_discrimination_intimidation: {
        type: String,
        enum: ["Always", "Often", "Sometimes", "Rarely", "Never"],
        required: true,
      },
      malicious_green_jokes: {
        type: String,
        enum: ["Always", "Often", "Sometimes", "Rarely", "Never"],
        required: true,
      },
      sexual_advances_by_coworker: {
        type: String,
        enum: ["Always", "Often", "Sometimes", "Rarely", "Never"],
        required: true,
      },
    },

    other_experiences: {
      physical_harm: {
        type: String,
        enum: ["Always", "Often", "Sometimes", "Rarely", "Never"],
        required: true,
      },
      attempts_physical_harm: {
        type: String,
        enum: ["Always", "Often", "Sometimes", "Rarely", "Never"],
        required: true,
      },
      fear_of_imminent_physical_harm: {
        type: String,
        enum: ["Always", "Often", "Sometimes", "Rarely", "Never"],
        required: true,
      },
      compulsion_or_attempt: {
        type: String,
        enum: ["Always", "Often", "Sometimes", "Rarely", "Never"],
        required: true,
      },
      deprivation_of_freedom: {
        type: String,
        enum: ["Always", "Often", "Sometimes", "Rarely", "Never"],
        required: true,
      },
      deprivation_of_rights: {
        type: String,
        enum: ["Always", "Often", "Sometimes", "Rarely", "Never"],
        required: true,
      },
      harassment_of_self_or_family: {
        type: String,
        enum: ["Always", "Often", "Sometimes", "Rarely", "Never"],
        required: true,
      },
      emotional_distress: {
        type: String,
        enum: ["Always", "Often", "Sometimes", "Rarely", "Never"],
        required: true,
      },
      stalking: {
        type: String,
        enum: ["Always", "Often", "Sometimes", "Rarely", "Never"],
        required: true,
      },
      harassment: {
        type: String,
        enum: ["Always", "Often", "Sometimes", "Rarely", "Never"],
        required: true,
      },
    },


    vaw_services_awareness: {
      vaw_desk_marsu: {
        type: String,
        enum: ["Yes", "No", "Not Sure"],
        required: true,
      },
      legal_assistance_marsu: {
        type: String,
        enum: ["Yes", "No", "Not Sure"],
        required: true,
      },
    },
  },
  { _id: false }
);

export default securityPeaceJusticeSchema;
