import { Schema } from "mongoose";

const academicInformationSchema = new Schema(
  {
    student_id: {
      type: String,
      required: true,
    },

    college: {
      type: String,
      enum: [
        "Graduate School",
        "College of Agriculture",
        "College of Allied Health Sciences",
        "College of Arts & Social Sciences",
        "College of Business & Accountancy",
        "College of Criminal Justice Education",
        "College of Education",
        "College of Engineering",
        "College of Environmental Studies",
        "College of Fisheries & Aquatic Sciences",
        "College of Governance",
        "College of Industrial Technology",
        "College of Information & Computing Sciences",
      ],
      required: true,
    },

    year_level: {
      type: String,
      enum: [
        "1st Year",
        "2nd Year",
        "3rd Year",
        "4th Year",
        "5th Year",
        "6th Year",
      ],
      required: true,
    },
  },
  { _id: false }
);

export default academicInformationSchema;
