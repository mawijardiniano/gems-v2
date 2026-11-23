"use client";

import { useDispatch, useSelector } from "react-redux";
import {
  setAffiliation,
  nextStep,
  prevStep,
} from "@/store/slices/profileRegistrationSlice";
import { FaGraduationCap, FaArrowRight, FaArrowLeft, FaSpinner } from "react-icons/fa";
import axios from "axios";
import { useState, useEffect, useRef } from "react";
import Button from "@/components/ui/Button";

const collegeToPrograms = {
  "Graduate School": [
    "Doctor of Education",
    "Master in Information Technology",
    "Master in Public Administration",
    "Master of Arts in Education",
  ],
  "College of Agriculture": [
    "Bachelor in Agricultural Technology",
    "Bachelor of Science in Agriculture",
  ],
  "College of Allied Health Sciences": [
    "Bachelor of Science in Midwifery",
    "Bachelor of Science in Nursing",
  ],
  "College of Arts and Social Sciences": [
    "Bachelor of Arts in Communication",
    "Bachelor of Arts in English Language Studies",
    "Bachelor of Science in Social Work",
  ],
  "College of Business and Accountancy": [
    "Bachelor of Science in Accountancy",
    "Bachelor of Science in Accounting Information System",
    "Bachelor of Science in Business Administration",
    "Bachelor of Science in Entrepreneurship",
    "Bachelor of Science in Tourism Management",
  ],
  "College of Criminal Justice Education": [
    "Bachelor of Science in Criminology",
    "Bachelor of Science in Law Enforcement Administration",
  ],
  "College of Education": [
    "Bachelor of Culture and Arts Education",
    "Bachelor of Elementary Education",
    "Bachelor of Secondary Education",
    "Bachelor of Technology and Livelihood Education",
    "Certificate in Teachers Professional Education",
  ],
  "College of Engineering": [
    "Bachelor of Science in Civil Engineering",
    "Bachelor of Science in Computer Engineering",
    "Bachelor of Science in Electrical Engineering",
    "Bachelor of Science in Electronics Engineering",
    "Bachelor of Science in Mechanical Engineering",
  ],
  "College of Environmental Studies": [
    "Bachelor of Science in Environmental Science",
  ],
  "College of Fisheries and Aquatic Sciences": [
    "Bachelor of Science in Fisheries",
  ],
  "College of Governance": [
    "Bachelor in Public Administration",
    "Bachelor of Arts in Political Science",
  ],
  "College of Industrial Technology": [
    "Bachelor of Science in Industrial Technology",
  ],
  "College of Information and Computing Sciences": [
    "Bachelor of Science in Information Systems",
    "Bachelor of Science in Information Technology",
  ],
  "Laboratory School": ["Senior-High School"],
};

export default function AcademicInformation() {
  const dispatch = useDispatch();
  const personal = useSelector((s) => s.profile.personal);
  const academic = useSelector(
    (s) => s.profile.affiliation.academic_information,
  );

  const [idError, setIdError] = useState("");
  const [idChecking, setIdChecking] = useState(false);
  const debounceRef = useRef(null);

  const update = (field, value) => {
    dispatch(
      setAffiliation({
        field: "academic_information",
        value: { ...academic, [field]: value },
      }),
    );
  };

  const handleStudentIdChange = (value) => {
    update("student_id", value);

    // Clear previous error
    setIdError("");

    // Clear previous debounce
    if (debounceRef.current) clearTimeout(debounceRef.current);

    // Don't check if empty
    if (!value || value.trim() === "") return;

    // Debounce: wait 500ms after user stops typing
    setIdChecking(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await axios.post("/api/profile/check-id", {
          student_id: value.trim(),
        });
        if (res.data.exists) {
          setIdError(res.data.message);
        }
      } catch {
        // Silently fail - don't block the user
      } finally {
        setIdChecking(false);
      }
    }, 500);
  };

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);


  const handleCollegeChange = (value) => {
    dispatch(
      setAffiliation({
        field: "academic_information",
        value: { ...academic, college: value, course: "" },
      }),
    );
  };

  const availableCourses = collegeToPrograms[academic?.college] || [];

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
  ) || !!idError || idChecking;

  if (personal.currentStatus !== "Student") {
    return (
      <div className="min-h-[70vh] flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl border border-line-subtle overflow-hidden">
          <div className="bg-gradient-to-r from-secondary-600 to-secondary-700 px-8 py-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <FaGraduationCap className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  Academic Information
                </h2>
                <p className="text-secondary-100 text-xs mt-0.5">Student details</p>
              </div>
            </div>
          </div>
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <FaGraduationCap className="text-fg-muted text-2xl" />
            </div>
            <p className="text-fg-4 font-medium">
              This section is available when Current Status is set to{" "}
              <span className="font-semibold text-secondary-600">Student</span>.
            </p>
            <p className="text-fg-muted text-sm mt-1">
              Please go back to Personal Information to update your status.
            </p>
          </div>
          <div className="px-8 py-4 bg-subtle border-t border-line-subtle flex justify-between">
            <Button
              variant="secondary"
              onClick={() => dispatch(prevStep())}
            >
              <FaArrowLeft className="text-xs" /> Previous
            </Button>
            <Button
              onClick={() => dispatch(nextStep())}
            >
              Next Step <FaArrowRight className="text-xs" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-start justify-center px-4 py-8">
      <div className="w-full max-w-4xl">
        <div className="bg-white rounded-2xl shadow-xl border border-line-subtle overflow-hidden">
          <div className="bg-gradient-to-r from-secondary-600 to-secondary-700 px-8 py-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <FaGraduationCap className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  Academic Information
                </h2>
                <p className="text-secondary-100 text-xs mt-0.5">
                  Provide your student academic details
                </p>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-fg-muted mb-1.5 uppercase tracking-wide">
                  Student ID <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition bg-subtle hover:bg-white ${
                      idError
                        ? "border-red-400 focus:ring-red-200 focus:border-red-400"
                        : "border-line focus:ring-secondary-200 focus:border-secondary-400"
                    }`}
                    value={academic?.student_id || ""}
                    onChange={(e) => handleStudentIdChange(e.target.value)}
                    placeholder="Enter Student ID"
                  />
                  {idChecking && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <FaSpinner className="animate-spin text-fg-muted" />
                    </div>
                  )}
                  {idError && (
                    <p className="text-danger text-xs mt-1 flex items-center gap-1">
                      <span>⚠</span> {idError}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-fg-muted mb-1.5 uppercase tracking-wide">
                  Campus <span className="text-red-400">*</span>
                </label>
                <select
                  className="w-full border border-line rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary-200 focus:border-secondary-400 transition bg-subtle hover:bg-white"
                  value={academic?.campus || ""}
                  onChange={(e) => update("campus", e.target.value)}
                >
                  <option value="">Select campus</option>
                  <option>Boac</option>
                  <option>Sta. Cruz</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-fg-muted mb-1.5 uppercase tracking-wide">
                  College <span className="text-red-400">*</span>
                </label>
                <select
                  className="w-full border border-line rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary-200 focus:border-secondary-400 transition bg-subtle hover:bg-white"
                  value={academic?.college || ""}
                  onChange={(e) => handleCollegeChange(e.target.value)}
                >
                  <option value="" disabled>
                    Select college
                  </option>
                  {Object.keys(collegeToPrograms).map((college) => (
                    <option key={college} value={college}>
                      {college}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-fg-muted mb-1.5 uppercase tracking-wide">
                  Course <span className="text-red-400">*</span>
                </label>
                <select
                  className="w-full border border-line rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary-200 focus:border-secondary-400 transition bg-subtle hover:bg-white disabled:opacity-60 disabled:cursor-not-allowed"
                  value={academic?.course || ""}
                  onChange={(e) => update("course", e.target.value)}
                  disabled={!academic?.college}
                >
                  <option value="" disabled>
                    {academic?.college
                      ? "Select course"
                      : "Select a college first"}
                  </option>
                  {availableCourses.map((course) => (
                    <option key={course} value={course}>
                      {course}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-fg-muted mb-1.5 uppercase tracking-wide">
                  Year Level <span className="text-red-400">*</span>
                </label>
                <select
                  className="w-full border border-line rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary-200 focus:border-secondary-400 transition bg-subtle hover:bg-white"
                  value={academic?.year_level || ""}
                  onChange={(e) => update("year_level", e.target.value)}
                >
                  <option value="">Select year level</option>
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

            <div>
              <label className="block text-xs font-medium text-fg-muted mb-1.5 uppercase tracking-wide">
                Are you a scholar? <span className="text-red-400">*</span>
              </label>
              <select
                className="w-full md:w-1/3 border border-line rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary-200 focus:border-secondary-400 transition bg-subtle hover:bg-white"
                value={academic?.isScholar || ""}
                onChange={(e) => update("isScholar", e.target.value)}
              >
                <option value="">Select</option>
                <option>Yes</option>
                <option>No</option>
              </select>
            </div>
          </div>

          <div className="px-8 py-4 bg-subtle border-t border-line-subtle flex justify-between">
            <Button
              variant="secondary"
              onClick={() => dispatch(prevStep())}
            >
              <FaArrowLeft className="text-xs" /> Previous
            </Button>
            <Button
              onClick={() => !isNextDisabled && dispatch(nextStep())}
              disabled={isNextDisabled}
            >
              Next Step <FaArrowRight className="text-xs" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}