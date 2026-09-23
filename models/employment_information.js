import { Schema } from "mongoose";

const employmentInformationSchema = new Schema(
  {
    employee_id: {
      type: String,
    },

    office: {
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
        "Office of the President",
        "University and Board Secretary",
        "Office of the Vice President for Administration and Finance",
        "Office of the Vice President for Academic Affairs",
        "Office of the Chief Administrative Officer",
        "Quality Assurance Office",
        "Planning Unit",
        "Human Resource and Management Unit",
        "Legal Unit",
        "Records Office",
        "Budget Office",
        "Internal Audit Unit",
        "Information Unit",
        "Procurement Unit",
        "Supply and Property Management Unit",
        "Accounting Office",
        "Cash Unit",
        "Registrar's Office",
        "Health Services Unit",
        "Research & Extension Office",
        "Learning Resource Center",
        "General Services Unit",
        "Project Management Unit",
        "Business Affairs Office",
        "Motorpool",
        "Information and Communication Technology Unit",
        "Security Services",
        "Gasan Campus",
        "Torrijos Campus",
        "Santa Cruz Campus",
      ],
    },

    employment_status: {
      type: String,
      enum: ["Faculty", "Non-teaching Personnel"],
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
    },
  },
  { _id: false }
);

export default employmentInformationSchema;
