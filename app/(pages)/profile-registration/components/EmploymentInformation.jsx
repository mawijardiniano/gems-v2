"use client";

import { useDispatch, useSelector } from "react-redux";
import {
  setAffiliation,
  nextStep,
  prevStep,
} from "@/store/slices/profileRegistrationSlice";
import { FaBriefcase, FaArrowRight, FaArrowLeft } from "react-icons/fa";

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
      <div className="min-h-[70vh] flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <FaBriefcase className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Employment Information</h2>
                <p className="text-blue-100 text-xs mt-0.5">Employee details</p>
              </div>
            </div>
          </div>
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaBriefcase className="text-gray-400 text-2xl" />
            </div>
            <p className="text-gray-600 font-medium">
              This section is available when Current Status is set to <span className="font-semibold text-blue-600">Employee</span>.
            </p>
            <p className="text-gray-400 text-sm mt-1">
              Please go back to Personal Information to update your status.
            </p>
          </div>
          <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 flex justify-between">
            <button
              onClick={() => dispatch(prevStep())}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition text-sm font-medium"
            >
              <FaArrowLeft className="text-xs" /> Previous
            </button>
            <button
              onClick={() => dispatch(nextStep())}
              className="flex items-center gap-2 px-6 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition text-sm font-semibold shadow-lg shadow-blue-200"
            >
              Next Step <FaArrowRight className="text-xs" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-start justify-center px-4 py-8">
      <div className="w-full max-w-4xl">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <FaBriefcase className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Employment Information</h2>
                <p className="text-blue-100 text-xs mt-0.5">
                  Provide your employment details
                </p>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                  Employee ID <span className="text-red-400">*</span>
                </label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all bg-gray-50 hover:bg-white"
                  value={employment?.employee_id || ""}
                  onChange={(e) => update("employee_id", e.target.value)}
                  placeholder="Enter Employee ID"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                  Office <span className="text-red-400">*</span>
                </label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all bg-gray-50 hover:bg-white"
                  value={employment?.office || ""}
                  onChange={(e) => update("office", e.target.value)}
                >
                  <option value="">Select office</option>
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
                  <option>Offices under the Office of the University President</option>
                  <option>Offices under the Office of the Vice President for Academic Affairs</option>
                  <option>Offices under the Office of the Vice President for Administration and Finance</option>
                  <option>Offices under the Office of the Vice President for Research and Extension</option>
                  <option>Offices under the Office of the Vice President for Student Affairs and Services</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                  Employment Status <span className="text-red-400">*</span>
                </label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all bg-gray-50 hover:bg-white"
                  value={employment?.employment_status || ""}
                  onChange={(e) => {
                    update("employment_status", e.target.value);
                    update("employment_appointment_status", "");
                  }}
                >
                  <option value="">Select status</option>
                  <option>Faculty</option>
                  <option>Non-teaching Personnel</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                  Appointment Status <span className="text-red-400">*</span>
                </label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all bg-gray-50 hover:bg-white"
                  value={employment?.employment_appointment_status || ""}
                  onChange={(e) =>
                    update("employment_appointment_status", e.target.value)
                  }
                  disabled={!employment?.employment_status}
                >
                  <option value="">Select appointment status</option>
                  {appointmentOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 flex justify-between">
            <button
              onClick={() => dispatch(prevStep())}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition text-sm font-medium"
            >
              <FaArrowLeft className="text-xs" /> Previous
            </button>
            <button
              onClick={() => !isNextDisabled && dispatch(nextStep())}
              disabled={isNextDisabled}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                isNextDisabled
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200"
              }`}
            >
              Next Step <FaArrowRight className="text-xs" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}