"use client";

import { useDispatch, useSelector } from "react-redux";
import {
  setPersonal,
  setAffiliation,
  nextStep,
} from "@/store/slices/profileRegistrationSlice";
import Progress from "./progress";
import { FaArrowRight, FaUser } from "react-icons/fa";

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
    <div className="min-h-[70vh] flex items-start justify-center px-4 py-8">
      <div className="w-full max-w-4xl">
        <Progress />

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <FaUser className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Personal Information</h2>
                <p className="text-blue-100 text-xs mt-0.5">
                  Please provide your basic personal details
                </p>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-6">
            {/* Full Name Row */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3">Full Name</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { field: "first_name", label: "First Name", required: true },
                  { field: "middle_name", label: "Middle Name", required: false },
                  { field: "last_name", label: "Last Name", required: true },
                ].map(({ field, label, required }) => (
                  <div key={field}>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                      {label}
                      {required && <span className="text-red-400 ml-1">*</span>}
                    </label>
                    <input
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all bg-gray-50 hover:bg-white"
                      value={personal[field]}
                      onChange={(e) => updatePersonal(field, e.target.value)}
                      placeholder={`Enter ${label.toLowerCase()}`}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-100" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                  Birthday <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all bg-gray-50 hover:bg-white"
                  value={personal.birthday}
                  onChange={(e) => updatePersonal("birthday", e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                  Blood Type <span className="text-red-400">*</span>
                </label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all bg-gray-50 hover:bg-white"
                  value={personal.bloodType}
                  onChange={(e) => updatePersonal("bloodType", e.target.value)}
                >
                  <option value="">Select blood type</option>
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"].map(
                    (bt) => (
                      <option key={bt} value={bt}>
                        {bt}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                  Nationality <span className="text-red-400">*</span>
                </label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all bg-gray-50 hover:bg-white"
                  value={personal.nationality}
                  onChange={(e) => updatePersonal("nationality", e.target.value)}
                />
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100" />

            {/* Status & Religion Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                  Civil Status <span className="text-red-400">*</span>
                </label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all bg-gray-50 hover:bg-white"
                  value={personal.civil_status}
                  onChange={(e) => updatePersonal("civil_status", e.target.value)}
                >
                  <option value="">Select civil status</option>
                  <option>Single</option>
                  <option>Married</option>
                  <option>Widow</option>
                  <option>Legally Separated Marriage</option>
                  <option>Living In/Common Law</option>
                  <option>Annulled</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                  Religion <span className="text-red-400">*</span>
                </label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all bg-gray-50 hover:bg-white"
                  value={personal.religion}
                  onChange={(e) => {
                    updatePersonal("religion", e.target.value);
                    if (e.target.value !== "Other") {
                      updatePersonal("religion_other", "");
                    }
                  }}
                >
  <option value="" disabled selected>Select religion</option>
  <option value="Roman Catholic">Roman Catholic</option>
  <option value="Iglesia ni Cristo (Church of Christ)">Iglesia ni Cristo (Church of Christ)</option>
  <option value="Iglesia Evangelica Metodista en las Islas Filipinas (IEMELIF)">Iglesia Evangelica Metodista en las Islas Filipinas (IEMELIF)</option>
  <option value="United Church of Christ in the Philippines (UCCP)">United Church of Christ in the Philippines (UCCP)</option>
  <option value="Baptist Church">Baptist Church</option>
  <option value="Assemblies of God">Assemblies of God</option>
  <option value="Seventh-day Adventist Church">Seventh-day Adventist Church</option>
  <option value="Aglipayan Church (Philippine Independent Church)">Aglipayan Church (Philippine Independent Church)</option>
  <option value="Victory Christian Fellowship">Victory Christian Fellowship</option>
  <option value="Jesus Is Lord Church (JIL)">Jesus Is Lord Church (JIL)</option>
  <option value="El Shaddai">El Shaddai</option>
  <option value="Church of the Foursquare Gospel">Church of the Foursquare Gospel</option>
  <option value="The Church of Jesus Christ of Latter-day Saints">The Church of Jesus Christ of Latter-day Saints</option>
  <option value="Jehovah's Witnesses">Jehovah's Witnesses</option>
  <option value="Baptist">Baptist</option>
                  <option>Other</option>
                </select>
                {personal.religion === "Other" && (
                  <input
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all bg-gray-50 hover:bg-white mt-2"
                    placeholder="Please specify your religion"
                    value={personal.religion_other || ""}
                    onChange={(e) => updatePersonal("religion_other", e.target.value)}
                  />
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100" />

            {/* Current Status */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                Current Status <span className="text-red-400">*</span>
              </label>
              <select
                className="w-full md:w-1/2 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all bg-gray-50 hover:bg-white"
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
                <option value="">Select your status</option>
                <option value="Student">Student</option>
                <option value="Employee">Employee</option>
              </select>
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
            <button
              onClick={handleNext}
              disabled={isNextDisabled}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                isNextDisabled
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200"
              }`}
            >
              Next Step
              <FaArrowRight className="text-xs" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}