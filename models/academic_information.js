import { Schema } from "mongoose";

const academicInformationSchema = new Schema(
  {
    student_id: {
      type: String,
    },
    campus: {
      type: String,
      enum: ["Boac", "Gasan", "Sta. Cruz"],
    },

    college: {
      type: String,
      enum: [
        "Graduate School",
        "College of Agriculture",
        "College of Allied Health Sciences",
        "College of Arts and Social Sciences",
        "College of Business and Accountancy",
        "College of Criminal Justice Education",
        "College of Education",
        "College of Engineering",
        "College of Environmental Studies",
        "College of Fisheries and Aquatic Sciences",
        "College of Governance",
        "College of Industrial Technology",
        "College of Information and Computing Sciences",
      ],
    },
    course: {
      type: String,
    },

    year_level: {
      type: String,
    },
    isScholar: {
      type: String,
    },
  },
  { _id: false },
);

export default academicInformationSchema;
