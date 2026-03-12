"use client";

import { useDispatch, useSelector } from "react-redux";
import {
  setPersonal,
  setAffiliation,
  nextStep,
} from "@/store/slices/profileRegistrationSlice";
import Progress from "./progress";

export default function PersonalInformation() {
  const dispatch = useDispatch();
  const personal = useSelector((state) => state.profile.personal);

  const updatePersonal = (field, value) =>
    dispatch(setPersonal({ field, value }));
  const updateAffiliation = (field, value) =>
    dispatch(setAffiliation({ field, value }));

  const requiredFields = [
    "first_name",
    "last_name",
    "birthday",
    "bloodType",
    "nationality",
    "civil_status",
    "religion",
    "currentStatus",
  ];
  // Add religion_other as required if religion is Other
  const isNextDisabled =
    requiredFields.some(
      (field) => !personal[field] || personal[field].toString().trim() === "",
    ) ||
    (personal.religion === "Other" &&
      (!personal.religion_other || personal.religion_other.trim() === ""));

  const handleNext = () => {
    if (!isNextDisabled) {
      dispatch(nextStep());
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 space-y-8 rounded-xl shadow-lg">
      <Progress />

      <h2 className="text-2xl font-bold text-gray-800 border-b pb-2">
        Personal Information
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {["first_name", "middle_name", "last_name"].map((field) => (
          <div key={field} className="flex flex-col">
            <label className="text-sm text-gray-600 capitalize">
              {field.replace("_", " ")}
              {field !== "middle_name" && (
                <span className="text-red-500">*</span>
              )}
            </label>
            <input
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={personal[field]}
              onChange={(e) => updatePersonal(field, e.target.value)}
            />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex flex-col">
          <label className="text-sm text-gray-600">
            Birthday <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            className="border border-gray-300 rounded-lg px-3 py-2"
            value={personal.birthday}
            onChange={(e) => updatePersonal("birthday", e.target.value)}
            max={new Date().toISOString().split("T")[0]}
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-gray-600">
            Blood Type <span className="text-red-500">*</span>
          </label>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2"
            value={personal.bloodType}
            onChange={(e) => updatePersonal("bloodType", e.target.value)}
          >
            <option value="">Select</option>
            {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"].map(
              (bt) => (
                <option key={bt} value={bt}>
                  {bt}
                </option>
              ),
            )}
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-gray-600">
            Nationality <span className="text-red-500">*</span>
          </label>
          <input
            className="border border-gray-300 rounded-lg px-3 py-2"
            value={personal.nationality}
            onChange={(e) => updatePersonal("nationality", e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col">
          <label className="text-sm text-gray-600">
            Civil Status <span className="text-red-500">*</span>
          </label>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2"
            value={personal.civil_status}
            onChange={(e) => updatePersonal("civil_status", e.target.value)}
          >
            <option value="">Select</option>
            <option>Single</option>
            <option>Married</option>
            <option>Widow</option>
            <option>Legally Separated Marriage</option>
            <option>Living In/Common Law</option>
            <option>Annulled</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-gray-600">
            Religion <span className="text-red-500">*</span>
          </label>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2"
            value={personal.religion}
            onChange={(e) => {
              updatePersonal("religion", e.target.value);
              if (e.target.value !== "Other") {
                updatePersonal("religion_other", "");
              }
            }}
          >
            <option value="">Select</option>
            <option>Roman Catholic</option>
            <option>Iglesia ni Cristo</option>
            <option>Iglesia Independencia Filipina</option>
            <option>Protestant</option>
            <option>Born Again Christian</option>
            <option>Evangelical Christian</option>
            <option>Latter Day Saints</option>
            <option>Members Church of God International (MGCI)</option>
            <option>Other</option>
          </select>
          {personal.religion === "Other" && (
            <input
              className="border border-gray-300 rounded-lg px-3 py-2 mt-2"
              placeholder="Please specify your religion"
              value={personal.religion_other || ""}
              onChange={(e) => updatePersonal("religion_other", e.target.value)}
              required
            />
          )}
        </div>
      </div>

      <div className="flex flex-col">
        <label className="text-sm text-gray-600">
          Current Status <span className="text-red-500">*</span>
        </label>
        <select
          className="border border-gray-300 rounded-lg px-3 py-2"
          value={personal.currentStatus}
          onChange={(e) => {
            const value = e.target.value;
            updatePersonal("currentStatus", value);

            if (value === "Student") {
              updateAffiliation("academic_information", {
                student_id: "",
                campus: "",
                college: "",
                course: "",
                year_level: "",
                isScholar: "",
              });
              updateAffiliation("employment_information", null);
            } else if (value === "Employee") {
              updateAffiliation("employment_information", {
                employee_id: "",
                office: "",
                employment_status: "",
                employment_appointment_status: "",
              });
              updateAffiliation("academic_information", null);
            } else {
              updateAffiliation("academic_information", null);
              updateAffiliation("employment_information", null);
            }
          }}
        >
          <option value="">Select</option>
          <option value="Student">Student</option>
          <option value="Employee">Employee</option>
        </select>
      </div>
      <div className="flex justify-end">
        <button
          onClick={handleNext}
          className={`bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition ${isNextDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
          disabled={isNextDisabled}
        >
          Next
        </button>
      </div>
    </div>
  );
}
