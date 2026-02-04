import { Schema } from "mongoose";

const employmentInformationSchema = new Schema(
  {
    employee_id: {
      type: String,
      required: true,
    },

    office: {
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
        "Offices under the Office of the University President",
        "Offices under the Office of the Vice President for Academic Affairs",
        "Offices under the Office of the Vice President for Administration and Finance",
        "Offices under the Office of the Vice President for Research and Extension",
        "Offices under the Office of the Vice President for Student Affairs and Services",
      ],
      required: true,
    },

    employment_status: {
      type: String,
      enum: ["Faculty", "Non-teaching Personnel"],
      required: true,
    },

    employment_appointment_status: {
      type: String,
      enum: [
        "Regular",
        "Temporary",
        "Coterminous",
        "Casual",
        "Job Order",
        "Contract of Service (Skilled)",
        "Utility Worker",
        "University Lecturer",
        "Part-time Lecturer",
        "Clinical Instructor",
        "Adjunct",
      ],
      required: true,
    },
  },
  { _id: false }
);

export default employmentInformationSchema;
