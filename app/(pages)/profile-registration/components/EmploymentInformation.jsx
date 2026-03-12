"use client";

import { useDispatch, useSelector } from "react-redux";
import {
  setAffiliation,
  nextStep,
  prevStep,
} from "@/store/slices/profileRegistrationSlice";

export default function EmploymentInformation() {
  const dispatch = useDispatch();
  const personal = useSelector((s) => s.profile.personal);
  const employment = useSelector(
    (s) => s.profile.affiliation.employment_information,
  );

  const APPOINTMENT_STATUS_MAP = {
    "Non-teaching Personnel": [
      "Regular",
      "Temporary",
      "Coterminous",
      "Casual",
      "Job Order",
      "Contract of Service (Skilled)",
      "Utility Worker",
    ],
    Faculty: [
      "Regular",
      "Temporary",
      "University Lecturer",
      "Part-time Lecturer",
      "Clinical Instructor",
      "Adjunct",
    ],
  };

  const appointmentOptions =
    APPOINTMENT_STATUS_MAP[employment?.employment_status] || [];

  const update = (field, value) =>
    dispatch(
      setAffiliation({
        field: "employment_information",
        value: { ...employment, [field]: value },
      }),
    );

  const requiredFields = [
    "employee_id",
    "office",
    "employment_status",
    "employment_appointment_status",
  ];
  const isNextDisabled = requiredFields.some(
    (field) =>
      !employment?.[field] || employment[field].toString().trim() === "",
  );

  if (personal.currentStatus !== "Employee") {
    return (
      <div className="max-w-3xl mx-auto text-center py-12">
        <h2 className="text-2xl font-semibold text-gray-800">
          Employment Information
        </h2>
        <p className="text-gray-600">
          This section is available when Current Status is set to Employee.
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
      <h2 className="text-2xl font-bold">Employment Information</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col">
          <label className="text-sm text-gray-600">
            Employee ID <span className="text-red-500">*</span>
          </label>
          <input
            className="border border-gray-300 rounded-lg px-3 py-2"
            value={employment?.employee_id || ""}
            onChange={(e) => update("employee_id", e.target.value)}
            placeholder="Enter Employee ID"
            required
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-gray-600">
            Office <span className="text-red-500">*</span>
          </label>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2"
            value={employment?.office || ""}
            onChange={(e) => update("office", e.target.value)}
            required
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col">
          <label className="text-sm text-gray-600">
            Employment Status <span className="text-red-500">*</span>
          </label>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2"
            value={employment?.employment_status || ""}
            onChange={(e) => update("employment_status", e.target.value)}
            required
          >
            <option value="">Select</option>
            <option>Faculty</option>
            <option>Non-teaching Personnel</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-gray-600">
            Employment Appointment Status{" "}
            <span className="text-red-500">*</span>
          </label>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2"
            value={employment?.employment_appointment_status || ""}
            onChange={(e) =>
              update("employment_appointment_status", e.target.value)
            }
            disabled={!employment?.employment_status}
            required
          >
            <option value="">Select Appointment Status</option>
            {appointmentOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
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
