"use client";

import { useDispatch, useSelector } from "react-redux";
import {
  setPersonalInformation,
  nextStep,
  prevStep,
} from "@/store/slices/profileRegistrationSlice";

export default function EmploymentInformation() {
  const dispatch = useDispatch();
  const p = useSelector((s) => s.profile.personal_information);

  const update = (field, value) =>
    dispatch(setPersonalInformation({ field, value }));

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 space-y-6 rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold">Employment Information</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col">
          <label className="text-sm text-gray-600">Employee ID</label>
          <input
            className="border border-gray-300 rounded-lg px-3 py-2"
            value={p.employment_information?.employee_id || ""}
            onChange={(e) =>
              update("employment_information.employee_id", e.target.value)
            }
            placeholder="Enter Employee ID"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-gray-600">Office</label>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2"
            value={p.employment_information?.office || ""}
            onChange={(e) =>
              update("employment_information.office", e.target.value)
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
          <label className="text-sm text-gray-600">Employment Status</label>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2"
            value={p.employment_information?.employment_status || ""}
            onChange={(e) =>
              update("employment_information.employment_status", e.target.value)
            }
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
            className="border border-gray-300 rounded-lg px-3 py-2"
            value={
              p.employment_information?.employment_appointment_status || ""
            }
            onChange={(e) =>
              update(
                "employment_information.employment_appointment_status",
                e.target.value,
              )
            }
            disabled={!p.employment_information?.employment_status}
          >
            <option value="">Select Appointment Status</option>

            {p.employment_information?.employment_status ===
              "Non-teaching Personnel" &&
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

            {p.employment_information?.employment_status === "Faculty" &&
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
