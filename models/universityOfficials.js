const mongoose = require("mongoose");

const VICE_POSITIONS = [
  "VP for Academic Affairs",
  "VP for Administration",
  "VP for Research",
  "VP for Students",
];

const CAMPUS_DIRECTOR_POSITION = ["Campus Director", "Center Administrator"];

const MARSU_BRANCH = [
  "MarSU Boac",
  "MarSU Gasan",
  "MarSU Sta. Cruz",
  "MarSU Torrijos",
  "MarSU Mogpog",
];

const COLLEGE = [
  "COE - Laboratory High School",
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
];

const DEANS = [
  "Dean",
  "Associate Dean",
  "Principal",
  "Concurrent Assoc. Dean for Graduate School Extended Programs",
];
const POSITION_UNDER_PRESIDENT = [
  "Secretary of the University and of the Board of Regents",
  "Chief, Presidential Management Staff",
  "Acting Executive Assistant",
  "Presidential Assistant for Social Media Communications",
  "Presidential Assistant for Advocacy Projects",
  "Director, Institutional Quality Assurance",
  "Director, International Relations & Linkages",
  "Head, Legal Services",
  "Head, Internal Audit Services",
  "Head, Institutional Planning and Development",
  "Head, Information Unit",
  "Focal Point/Person, Gender & Development",
  "Safety Officer",
  "Data Protection Officer",
];

const POSITION_UNDER_VICE_PRESIDENT_ACADEMIC_AFFAIRS = [
  "Director, Curriculum and Instruction",
  "Manager, Science Laboratories",
];

const POSITION_UNDER_VICE_PRESIDENT_ADMIN_FINANCE = [
  "Acting Chief Administrative Officer/Supervising Administrative Officer & Concurrent Head, HRM",
  "Head, General Services",
  "Head, Records Management",
  "Concurrent Head, Security Services",
  "Head, Info & Comm. Technology",
  "Head, Physical Facilities & Project Mgt.",
  "Head, Supply and Property Mgt.",
  "Head, Procurement Unit",
  "Head, Electrical Services",
  "Head, Motorpool Services",
  "Head, Disaster Risk Reduction & Mgt.",
  "Deputy Head, DRRM",
  "Concurrent Director, Financial Services",
  "Head, Accounting Unit",
  "Head, Budgeting Unit",
  "Head, Cashiering Unit",
  "Director, Business Affairs and Prod. Services",
  "Head, Income-Generating Projects",
  "Concurrent Head, Prod. & Commercialization",
];

const POSITION_UNDER_VICE_PRESIDENT_STUDENT_AFFAIRS = [
  "Director, Student Welfare",
  "Concurrent Head, Guidance & Counselling Office",
  "Head, Career and Job Placement",
  "Head, Information & Orientation Service Office",
  "Head, Student Assistantship and Economic Enterprise Development",
  "Director, Student Programs and Services",
  "Head, Admission and Registration",
  "Head, Alumni Relations",
  "Head, Culture and Arts",
  "Head, Foreign/International Student Services",
  "Head, Health Services",
  "Head, Learning Resource Center",
  "Head, Multi-Faith Services",
  "Head, National Service Training Program",
  "Head, Scholarship & Financial Assistance",
  "Head, Sports and Wellness",
  "Head, Student Housing & Residential Services",
  "Focal Person, Services for Persons with Disabilities and Special Needs",
  "Director, Student Development",
  "Head, Student Discipline",
  "Concurrent Head, Student Organization And Activities",
  "Head, Student Publication",
  "Head, Student Volunteer and Community Outreach",
];

const POSITION_UNDER_VICE_PRESIDENT_RESEARCH_EXTENSION = [
  "Concurrent Director, Research",
  "Director, Extension",
  "Director, Publication",
  "Director Knowledge & Technology Transfer Office (KTTO)",
  "Manager, Innovation & Technology Support Office",
];

const universityOfficialSchema = new mongoose.Schema({
  president: {
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    name: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserAuth",
      required: true,
    },
    position: {
      type: String,
      enum: ["University President"],
      required: true,
    },
  },
  vicePresidents: [
    {
      name: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "UserAuth",
        required: true,
      },
      position: {
        type: String,
        enum: VICE_POSITIONS,
        required: true,
      },
    },
  ],
  campusDirectors: [
    {
      position: {
        type: String,
        enum: CAMPUS_DIRECTOR_POSITION,
        required: true,
      },
      branch: {
        type: String,
        enum: MARSU_BRANCH,
        required: true,
      },
      name: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "UserAuth",
        required: true,
      },
    },
  ],
  collegeDeans: [
    {
      position: {
        type: String,
        enum: DEANS,
      },
      name: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "UserAuth",
        required: true,
      },
      college: {
        type: String,
        enum: COLLEGE,
        required: true,
      },
    },
  ],
  associateDeans: [
    {
      name: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "UserAuth",
        required: true,
      },
      college: {
        type: String,
        enum: COLLEGE,
        required: true,
      },
      position: {
        type: String,
        enum: DEANS,
      },
    },
  ],
  office_of_the_president: [
    {
      position: {
        type: String,
        enum: POSITION_UNDER_PRESIDENT,
        required: true,
      },
      name: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "UserAuth",
        required: true,
      },
    },
  ],
  office_of_the_vice_president_academic_affairs: [
    {
      position: {
        type: String,
        enum: POSITION_UNDER_VICE_PRESIDENT_ACADEMIC_AFFAIRS,
        required: true,
      },
      name: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "UserAuth",
        required: true,
      },
    },
  ],
  office_of_the_vice_president_admin_finance: [
    {
      position: {
        type: String,
        enum: POSITION_UNDER_VICE_PRESIDENT_ADMIN_FINANCE,
        required: true,
      },
      name: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "UserAuth",
        required: true,
      },
    },
  ],
  office_of_the_vice_president_student_affairs: [
    {
      position: {
        type: String,
        enum: POSITION_UNDER_VICE_PRESIDENT_STUDENT_AFFAIRS,
        required: true,
      },
      name: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "UserAuth",
        required: true,
      },
    },
  ],
  office_of_the_vice_president_research_extension: [
    {
      position: {
        type: String,
        enum: POSITION_UNDER_VICE_PRESIDENT_RESEARCH_EXTENSION,
        required: true,
      },
      name: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "UserAuth",
        required: true,
      },
    },
  ],
});

module.exports =
  mongoose.models.UniversityOfficial ||
  mongoose.model("UniversityOfficial", universityOfficialSchema);
