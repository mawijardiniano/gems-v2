"use client";

import { useDispatch, useSelector } from "react-redux";
import {
  setPersonalInformation,
  nextStep,
  prevStep,
} from "@/store/slices/profileRegistrationSlice";

export default function AcademicInformation() {
  const dispatch = useDispatch();
  const p = useSelector((s) => s.profile.personal_information);

  const update = (field, value) =>
    dispatch(setPersonalInformation({ field, value }));

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 space-y-6 rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold">Academic Information</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col">
          <label className="text-sm text-gray-600">Student ID</label>
          <input
            className="border border-gray-300 rounded-lg px-3 py-2"
            value={p.academic_information?.student_id || ""}
            onChange={(e) =>
              update("academic_information.student_id", e.target.value)
            }
            placeholder="Enter Student ID"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-gray-600">College</label>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2"
            value={p.academic_information?.college || ""}
            onChange={(e) =>
              update("academic_information.college", e.target.value)
            }
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
          </select>
        </div>
      </div>

      <div className="flex flex-col">
        <label className="text-sm text-gray-600">Year Level</label>
        <select
          className="border border-gray-300 rounded-lg px-3 py-2"
          value={p.academic_information?.year_level || ""}
          onChange={(e) =>
            update("academic_information.year_level", e.target.value)
          }
        >
          <option value="">Select Year Level</option>
          <option>1st Year</option>
          <option>2nd Year</option>
          <option>3rd Year</option>
          <option>4th Year</option>
          <option>5th Year</option>
          <option>6th Year</option>
        </select>
      </div>

      <div className="flex justify-between mt-6">
        <button
          onClick={() => dispatch(prevStep())}
          className="px-4 py-2 rounded border"
        >
          Back
        </button>
        <button
          onClick={() => dispatch(nextStep())}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Next
        </button>
      </div>
    </div>
  );
}
