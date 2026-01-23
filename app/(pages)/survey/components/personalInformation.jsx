"use client";

import { useDispatch, useSelector } from "react-redux";
import {
  setPersonalInformation,
  nextStep,
} from "@/store/slices/profileRegistrationSlice";
import Progress from "./progress";

export default function PersonalInformation() {
  const dispatch = useDispatch();
  const p = useSelector((state) => state.profile.personal_information);
  const currentStep = useSelector((state) => state.profile.currentStep);

  const update = (field, value) =>
    dispatch(setPersonalInformation({ field, value }));

  const toggle = (field, value) => {
    update(
      field,
      p[field].includes(value)
        ? p[field].filter((v) => v !== value)
        : [...p[field], value]
    );
  };

  const handleNext = () => {
    dispatch(nextStep());
    console.log("Moved to next step:", currentStep + 1, {
      personal_information: p,
    });
  };

  const yesNoOptions = [
    { label: "Yes", value: true },
    { label: "No", value: false },
  ];

   const pwdTypes = [
    "Visual Impairment",
    "Hearing Impairment",
    "Physical Disability",
    "Mental Disability",
    "Multiple Disabilities",
    "Other",
  ];

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 space-y-8 rounded-xl shadow-lg">
      <Progress />

      <h2 className="text-2xl font-bold text-gray-800 border-b pb-2">
        Personal Information
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {["first_name", "middle_name", "last_name"].map((field, idx) => (
          <div key={idx} className="flex flex-col">
            <label className="text-sm text-gray-600 capitalize">
              {field.replace("_", " ")}
            </label>
            <input
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={p[field]}
              onChange={(e) => update(field, e.target.value)}
            />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col">
          <label className="text-sm text-gray-600">Sex</label>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={p.sex}
            onChange={(e) => update("sex", e.target.value)}
          >
            <option value="">Select</option>
            <option>Male</option>
            <option>Female</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-gray-600">Gender Preference</label>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={p.gender_preference}
            onChange={(e) => update("gender_preference", e.target.value)}
          >
            <option value="">Select</option>
            <option>Heterosexual Male</option>
            <option>Heterosexual Female</option>
            <option>Gay</option>
            <option>Lesbian</option>
            <option>Prefer not to say</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col">
          <label className="text-sm text-gray-600">Age Bracket</label>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={p.age_bracket}
            onChange={(e) => update("age_bracket", e.target.value)}
          >
            <option value="">Select</option>
            <option>18-30</option>
            <option>31-40</option>
            <option>41-50</option>
            <option>51-60</option>
            <option>61 and above</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-gray-600">Civil Status</label>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={p.civil_status}
            onChange={(e) => update("civil_status", e.target.value)}
          >
            <option value="">Select</option>
            <option>Single</option>
            <option>Married</option>
            <option>Widow</option>
            <option>Legally Separated Marriage</option>
            <option>Living In/Common Law</option>
            <option>Annulled</option>
            <option>Iba pa</option>
          </select>
          {p.civil_status === "Iba pa" && (
            <input
              className="mt-2 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Specify Civil Status"
              value={p.civil_status_other}
              onChange={(e) => update("civil_status_other", e.target.value)}
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col">
          <label className="text-sm text-gray-600">Religion</label>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={p.religion}
            onChange={(e) => update("religion", e.target.value)}
          >
            <option value="">Select</option>
            <option>Roman Catholic</option>
            <option>Iglesia ni Cristo</option>
            <option>Protestant</option>
            <option>Born Again Christian</option>
            <option>Iba pa</option>
          </select>
          {p.religion === "Iba pa" && (
            <input
              className="mt-2 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Specify Religion"
              value={p.religion_other}
              onChange={(e) => update("religion_other", e.target.value)}
            />
          )}
        </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col">
          <label className="text-sm text-gray-600">Person Type</label>
<select
  className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
  value={p.person_type || ""}
  onChange={(e) => {
    const value = e.target.value;
    update("person_type", value);

    if (value === "Student") {
      update("employment_status", "");
      update("employment_appointment_status", "");
    }
  }}
>
  <option value="">Select</option>
  <option value="Student">Student</option>
  <option value="Employee">Employee</option>
</select>

        </div>

        <div className="flex flex-col">
          <label className="text-sm text-gray-600">
            {p.person_type === "Student" ? "Student ID" : "Employee ID"}
          </label>
          <input
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={p.person_id || ""}
            onChange={(e) => update("person_id", e.target.value)}
            placeholder={
              p.person_type === "Student" ? "Enter Student ID" : "Enter Employee ID"
            }
            disabled={!p.person_type}
          />
        </div>
      </div>

        <div className="flex flex-col">
          <label className="text-sm text-gray-600">College / Office</label>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={p.college_office}
            onChange={(e) => update("college_office", e.target.value)}
          >
            <option value="">Select</option>
            <option>Graduate School</option>
            <option>College of Agriculture</option>
            <option>College of Allied Health Sciences</option>
            <option>College of Arts & Social Sciences</option>
            <option>College of Business & Accountancy</option>
            <option>College of Criminal Justice Education</option>
            <option>College of Education</option>
            <option>College of Engineering</option>
            <option>College of Environmental Studies</option>
            <option>College of Fisheries & Aquatic Sciences</option>
            <option>College of Governance</option>
            <option>College of Industrial Technology</option>
            <option>College of Information & Computing Sciences</option>
            <option>
              Offices under the Office of the University President
            </option>
            <option>
              Offices under the Office of the Vice President for Academic
              Affairs
            </option>
            <option>
              Offices under the Office of the Vice President for Administration
              and Finance
            </option>
            <option>
              Offices under the Office of the Vice President for Research and
              Extension
            </option>
            <option>
              Offices under the Office of the Vice President for Student Affairs
              and Services
            </option>
          </select>
        </div>
      </div>

{p.person_type === "Employee" && (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="flex flex-col">
      <label className="text-sm text-gray-600">Employment Status</label>
      <select
        className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
        value={p.employment_status}
        onChange={(e) => update("employment_status", e.target.value)}
      >
        <option value="">Select</option>
        <option>Faculty</option>
        <option>Non-teaching Personnel</option>
      </select>
    </div>

    <div className="flex flex-col">
      <label className="text-sm text-gray-600">
        Employment Appointment Status
      </label>
      <select
        className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
        value={p.employment_appointment_status}
        onChange={(e) =>
          update("employment_appointment_status", e.target.value)
        }
        disabled={!p.employment_status}
      >
        <option value="">Select Appointment Status</option>

        {p.employment_status === "Non-teaching Personnel" &&
          [
            "Regular",
            "Temporary",
            "Coterminous",
            "Casual",
            "Job Order",
            "Contract of Service (Skilled)",
            "Utility Worker",
          ].map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}

        {p.employment_status === "Faculty" &&
          [
            "Regular",
            "Temporary",
            "University Lecturer",
            "Part-time Lecturer",
            "Clinical Instructor",
            "Adjunct",
          ].map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
      </select>
    </div>
  </div>
)}


      <div>
        <p className="font-medium text-gray-700 mb-2">Solo Parent</p>
        {yesNoOptions.map((opt) => (
          <label key={opt.label} className="flex items-center gap-2">
            <input
              type="radio"
              name="solo_parent"
              checked={p.solo_parent === opt.value}
              onChange={() =>
                update(
                  "solo_parent",

                  opt.value
                )
              }
              className="w-4 h-4 accent-blue-500"
            />
            {opt.label}
          </label>
        ))}
      </div>

      
      <div>
        <p className="font-medium text-gray-700 mb-2">Person with Disability</p>
        {yesNoOptions.map((opt) => (
          <label key={opt.label} className="flex items-center gap-2">
            <input
              type="radio"
              name="pwd"
              checked={p.pwd === opt.value}
              onChange={() =>
                update(
                  "pwd",

                  opt.value
                )
              }
              className="w-4 h-4 accent-blue-500"
            />
            {opt.label}
          </label>
        ))}
      </div>

      {p.pwd === true && (
        <div className="flex flex-col">
          <label className="text-sm text-gray-600">PWD Type</label>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={p.pwd_type || ""}
            onChange={(e) => update("pwd_type", e.target.value)}
          >
            <option value="">Select PWD Type</option>
            {pwdTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-col">
        <label className="text-sm text-gray-600">
          Total Annual Family Income
        </label>
        <select
          className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={p.total_annual_family_income}
          onChange={(e) => update("total_annual_family_income", e.target.value)}
        >
          <option value="">Select Income</option>
          <option>₱1,000.00 - ₱50,000.00</option>
          <option>₱51,000.00 - ₱100,000.00</option>
          <option>₱101,000.00 - ₱200,000.00</option>
          <option>₱201,000.00 - ₱300,000.00</option>
          <option>₱301,000.00 - ₱400,000.00</option>
          <option>₱401,000.00 - ₱500,000.00</option>
          <option>₱501,000.00 and above</option>
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm text-gray-600">Health Problems</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {[
            "Physical Impairment",
            "Physiological/Mental Condition",
            "Heart Ailment",
            "Diabetes",
            "Eye Problems",
            "Hypertension/High Blood Pressure",
            "Cancer",
            "Headache (Migraine, Vertigo, etc.)",
            "Hyper/Hypothyroidism",
            "Autoimmune Disease",
            "Pneumonia",
            "Polycystic Kidney Disease (PKD)",
            "Respiratory Allergies",
            "Allergic Rhinitis",
            "Nearsightedness",
            "Asthma",
            "Skin Allergies",
            "Rheumatoid Arthritis/Gout",
            "Allergy/Hyper Acidity",
            "Allergies",
            "None",
            "Iba pa",
          ].map((h) => (
            <label key={h} className="flex items-center gap-2">
              <input
                type="checkbox"
                className="w-4 h-4 accent-blue-500"
                checked={p.health_problems.includes(h)}
                onChange={() => toggle("health_problems", h)}
              />
              {h}
            </label>
          ))}
        </div>

        {p.health_problems.includes("Iba pa") && (
          <input
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 mt-2"
            placeholder="Specify Other Health Problem"
            value={p.health_problems_other}
            onChange={(e) => update("health_problems_other", e.target.value)}
          />
        )}
      </div>
      <div className="flex justify-end mt-6">
        <button
          onClick={handleNext}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Next
        </button>
      </div>
    </div>
  );
}
