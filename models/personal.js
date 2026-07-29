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
        "Iglesia ni Cristo (Church of Christ)",
        "Iglesia Evangelica Metodista en las Islas Filipinas (IEMELIF)",
        "United Church of Christ in the Philippines (UCCP)",
        "Baptist Church",
        "Assemblies of God",
        "Seventh-day Adventist Church",
        "Aglipayan Church (Philippine Independent Church)",
        "Victory Christian Fellowship",
        "Jesus Is Lord Church (JIL)",
        "El Shaddai",
        "Church of the Foursquare Gospel",
        "The Church of Jesus Christ of Latter-day Saints",
        "Jehovah’s Witnesses",
        "Baptist",
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
