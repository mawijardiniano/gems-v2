import { Schema } from "mongoose";

const personalSchema = new Schema(
  {
    first_name: {
      type: String,
      required: true,
    },

    middle_name: {
      type: String,
    },

    last_name: {
      type: String,
      required: true,
    },

    civil_status: {
      type: String,
      enum: [
        "Single",
        "Married",
        "Widow",
        "Legally Separated Marriage",
        "Separated",
        "Living In/Common Law",
        "Annulled",
        ""
      ],
    },

    religion: {
      type: String,
      enum: [
        "Roman Catholic",
        "Iglesia ni Cristo",
        "Iglesia Independencia Filipina",
        "Protestant",
        "Born Again Christian",
        "Evangelical Christian",
        "Latter Day Saints",
        "Members Church of God International (MGCI)",
        "Other",
      ],

    },
    religion_other: {
      type: String,
      default: "",
    },

    nationality: {
      type: String,
      default: "Filipino",
    },

    currentStatus: {
      type: String,
      enum: ["Student", "Employee"],
      required: true,
    },

    birthday: {
      type: Date,
    },

    bloodType: {
      type: String,
      enum: ["A+", "A-", "A", "B+", "B-", "B", "AB+", "AB-", "AB", "O+", "O-", "O", "Unknown"],
    },
  },
  { _id: false },
);

export default personalSchema;
