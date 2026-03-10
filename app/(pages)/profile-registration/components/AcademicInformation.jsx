"use client";

import { useDispatch, useSelector } from "react-redux";
import {
  setAffiliation,
  nextStep,
  prevStep,
} from "@/store/slices/profileRegistrationSlice";

export default function AcademicInformation() {
  const dispatch = useDispatch();
  const personal = useSelector((s) => s.profile.personal);
  const academic = useSelector(
    (s) => s.profile.affiliation.academic_information,
  );

  const update = (field, value) => {
    dispatch(
      setAffiliation({
        field: "academic_information",
        value: { ...academic, [field]: value },
      }),
    );
  };

  // All fields required
  const requiredFields = [
    "student_id",
    "campus",
    "college",
    "course",
    "year_level",
    "isScholar",
  ];
  const isNextDisabled = requiredFields.some(
    (field) => !academic?.[field] || academic[field].toString().trim() === "",
  );

  if (personal.currentStatus !== "Student") {
    return (
      <div className="max-w-3xl mx-auto text-center py-12">
        <h2 className="text-2xl font-semibold text-gray-800">
          Academic Information
        </h2>
        <p className="text-gray-600">
          This section is available when Current Status is set to Student.
        </p>
        <div className="flex justify-center mt-6">
          <button
            onClick={() => dispatch(prevStep())}
            className="px-4 py-2 rounded border"
          >
            Previous
          </button>
          <button
            onClick={() => dispatch(nextStep())}
            className="ml-3 bg-blue-600 text-white px-4 py-2 rounded"
          >
            Next
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 space-y-6 rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold">Academic Information</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col">
          <label className="text-sm text-gray-600">
            Student ID <span className="text-red-500">*</span>
          </label>
          <input
            className="border border-gray-300 rounded-lg px-3 py-2"
            value={academic?.student_id || ""}
            onChange={(e) => update("student_id", e.target.value)}
            placeholder="Enter Student ID"
            required
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-gray-600">
            Campus <span className="text-red-500">*</span>
          </label>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2"
            value={academic?.campus || ""}
            onChange={(e) => update("campus", e.target.value)}
            required
          >
            <option value="">Select</option>
            <option>Boac</option>
            {/* <option>Gasan</option> */}
            <option>Sta. Cruz</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex flex-col">
          <label className="text-sm text-gray-600">
            College <span className="text-red-500">*</span>
          </label>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2"
            value={academic?.college || ""}
            onChange={(e) => update("college", e.target.value)}
            required
          >
            <option value="">Select</option>
            <option>Graduate School</option>
            <option>College of Agriculture</option>
            <option>College of Allied Health Sciences</option>
            <option>College of Arts &amp; Social Sciences</option>
            <option>College of Business &amp; Accountancy</option>
            <option>College of Criminal Justice Education</option>
            <option>College of Education</option>
            <option>College of Engineering</option>
            <option>College of Environmental Studies</option>
            <option>College of Fisheries &amp; Aquatic Sciences</option>
            <option>College of Governance</option>
            <option>College of Industrial Technology</option>
            <option>College of Information &amp; Computing Sciences</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-gray-600">
            Course <span className="text-red-500">*</span>
          </label>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2"
            value={academic?.course || ""}
            onChange={(e) => update("course", e.target.value)}
            required
          >
            <option value="">Select</option>
            <option>Information System</option>
            <option>Information Technology</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-gray-600">
            Year Level <span className="text-red-500">*</span>
          </label>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2"
            value={academic?.year_level || ""}
            onChange={(e) => update("year_level", e.target.value)}
            required
          >
            <option value="">Select Year Level</option>
            {[
              "1st Year",
              "2nd Year",
              "3rd Year",
              "4th Year",
              "5th Year",
              "6th Year",
            ].map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col">
        <label className="text-sm text-gray-600">
          Scholarship Status <span className="text-red-500">*</span>
        </label>
        <select
          className="border border-gray-300 rounded-lg px-3 py-2"
          value={academic?.isScholar || ""}
          onChange={(e) => update("isScholar", e.target.value)}
          required
        >
          <option value="">Select</option>
          <option>Yes</option>
          <option>No</option>
        </select>
      </div>

      <div className="flex justify-between mt-6">
        <button
          onClick={() => dispatch(prevStep())}
          className="px-4 py-2 rounded border"
        >
          Previous
        </button>
        <button
          onClick={() => !isNextDisabled && dispatch(nextStep())}
          className={`bg-blue-600 text-white px-4 py-2 rounded ${isNextDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
          disabled={isNextDisabled}
        >
          Next
        </button>
      </div>
    </div>
  );
}
