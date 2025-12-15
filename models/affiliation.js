import { Schema } from "mongoose";

const employeeDetailsSchema = new Schema(
  {
    department: { type: String },
    position: { type: String },
    employmentType: {
      type: String,
      enum: ["Faculty", "Non-teaching-Personnel"],
    },
  },
  { _id: false }
);

employeeDetailsSchema.pre("validate", function (next) {
  const profile = this.ownerDocument();
  if (profile.currentStatus === "Employee") {
    if (!this.department || !this.position || !this.employmentType) {
      return next(
        new Error(
          "Employee details (department, position, employmentType) are required when status is Employee"
        )
      );
    }
  }
  next();
});

const studentDetailsSchema = new Schema(
  {
    course: { type: String },
    yearLevel: { type: Number, min: 1, max: 5 },
    isScholar: { type: Boolean },
  },
  { _id: false }
);

// Validate studentDetails if currentStatus is Student
studentDetailsSchema.pre("validate", function (next) {
  const profile = this.ownerDocument();
  if (profile.currentStatus === "Student") {
    if (!this.course || !this.yearLevel || this.isScholar == null) {
      return next(
        new Error(
          "Student details (course, yearLevel, isScholar) are required when status is Student"
        )
      );
    }
  }
  next();
});

const affiliationSchema = new Schema(
  {
    campus: { type: String, required: true },
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
        "Offices under the Office of the University President",
        "Offices under the Office of the Vice President for Academic Affairs",
        "Offices under the Office of the Vice President for Administration and Finance",
        "Offices under the Office of the Vice President for Research and Extension",
        "Offices under the Office of the Vice President for Student Affairs and Services",
      ],
      required: true,
    },

    employeeDetails: employeeDetailsSchema,
    studentDetails: studentDetailsSchema,
  },
  { _id: false }
);

export default affiliationSchema;
