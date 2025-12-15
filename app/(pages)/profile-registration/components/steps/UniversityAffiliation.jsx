import { useDispatch, useSelector } from "react-redux";
import {
  nextStep,
  prevStep,
  setAffiliation,
} from "@/store/slices/profileRegistrationSlice";
import StepIndicator from "@/app/(pages)/profile-registration/components/StepIndicator";

export default function UniversityAffiliation() {
  const dispatch = useDispatch();
  const currentStatus = useSelector((state) => state.profile.currentStatus);
  const affiliation = useSelector((state) => state.profile.affiliation);

  const handleChange = (field, value) => {
    dispatch(setAffiliation({ field, value }));
  };

  const handleNestedChange = (section, field, value) => {
    dispatch(
      setAffiliation({
        field: section,
        value: {
          ...affiliation[section],
          [field]: value,
        },
      })
    );
  };

  const requiredFields = [
    affiliation.campus,
    affiliation.college,
    ...(currentStatus === "Employee"
      ? [
          affiliation.employeeDetails.department,
          affiliation.employeeDetails.position,
          affiliation.employeeDetails.employmentType,
        ]
      : []),
    ...(currentStatus === "Student"
      ? [
          affiliation.studentDetails.course,
          affiliation.studentDetails.yearLevel,
          affiliation.studentDetails.isScholar,
        ]
      : []),
  ];

  const canProceed = requiredFields.every(
    (field) => field !== "" && field !== null
  );

  return (
    <div className="flex justify-center items-center h-screen px-4">
      <div className="w-[900px] border border-gray-200 p-6 sm:p-16 rounded-xl bg-white">
        {/* Step Indicator */}
        <div className="flex justify-center items-center mb-6">
          <StepIndicator
            titles={[
              "Identification",
              "Personal",
              "Gender",
              "Affiliation",
              "Contact",
            ]}
          />
        </div>

        <h2 className="text-xl font-bold mb-4">University Affiliation</h2>

        <div className="mb-3">
          <label className="font-medium">Campus</label>
          <input
            type="text"
            className="border p-2 w-full"
            placeholder="Enter campus"
            value={affiliation.campus}
            onChange={(e) => handleChange("campus", e.target.value)}
          />
        </div>

        <div className="mb-3">
          <label className="font-medium">College</label>
          <select
            className="border p-2 w-full"
            value={affiliation.college}
            onChange={(e) => handleChange("college", e.target.value)}
          >
            <option value="">Enter college</option>
            <option value="Graduate School">Graduate School</option>
            <option value="College of Agriculture">
              College of Agriculture
            </option>
            <option value="College of Allied Health Sciences">
              College of Allied Health Sciences
            </option>
            <option value="College of Arts & Social Sciences">
              College of Arts & Social Sciences
            </option>
            <option value="College of Business & Accountancy">
              College of Business & Accountancy
            </option>
            <option value="College of Criminal Justice Education">
              College of Criminal Justice Education
            </option>
            <option value="College of Education">College of Education</option>
            <option value="College of Engineering">
              College of Engineering
            </option>
            <option value="College of Environmental Studies">
              College of Environmental Studies
            </option>
            <option value="College of Fisheries & Aquatic Sciences">
              College of Fisheries & Aquatic Sciences
            </option>
            <option value="College of Governance">College of Governance</option>
            <option value="College of Industrial Technology">
              College of Industrial Technology
            </option>
            <option value="College of Information & Computing Sciences">
              College of Information & Computing Sciences
            </option>
            <option value="Offices under the Office of the University President">
              Offices under the Office of the University President
            </option>
            <option value="Offices under the Office of the Vice President for Academic Affairs">
              Offices under the Office of the Vice President for Academic
              Affairs
            </option>
            <option value="Offices under the Office of the Vice President for Administration and Finance">
              Offices under the Office of the Vice President for Administration
              and Finance
            </option>
            <option value="Offices under the Office of the Vice President for Research and Extension">
              Offices under the Office of the Vice President for Research and
              Extension
            </option>
            <option value="Offices under the Office of the Vice President for Student Affairs and Services">
              Offices under the Office of the Vice President for Student Affairs
              and Services
            </option>
          </select>
        </div>

        {currentStatus === "Employee" && (
          <>
            <h3 className="font-semibold mt-4">Employee Information</h3>

            <div className="mb-3">
              <label>Department</label>
              <input
                type="text"
                className="border p-2 w-full"
                placeholder="e.g. HR Department"
                value={affiliation.employeeDetails.department}
                onChange={(e) =>
                  handleNestedChange(
                    "employeeDetails",
                    "department",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="mb-3">
              <label>Position</label>
              <input
                type="text"
                className="border p-2 w-full"
                placeholder="e.g. Instructor"
                value={affiliation.employeeDetails.position}
                onChange={(e) =>
                  handleNestedChange(
                    "employeeDetails",
                    "position",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="mb-3">
              <label>Employment Type</label>
              <select
                className="border p-2 w-full"
                value={affiliation.employeeDetails.employmentType}
                onChange={(e) =>
                  handleNestedChange(
                    "employeeDetails",
                    "employmentType",
                    e.target.value
                  )
                }
              >
                <option value="">Select Type</option>
                <option value="Faculty">Faculty</option>
                <option value="Non-teaching-Personnel">Non teaching Personnel</option>
              </select>
            </div>
          </>
        )}

        {currentStatus === "Student" && (
          <>
            <h3 className="font-semibold mt-4">Student Information</h3>

            <div className="mb-3">
              <label>Course</label>
              <input
                type="text"
                className="border p-2 w-full"
                placeholder="e.g. BSIT"
                value={affiliation.studentDetails.course}
                onChange={(e) =>
                  handleNestedChange("studentDetails", "course", e.target.value)
                }
              />
            </div>

            <div className="mb-3">
              <label>Year Level</label>
              <select
                className="border p-2 w-full"
                value={affiliation.studentDetails.yearLevel}
                onChange={(e) =>
                  handleNestedChange(
                    "studentDetails",
                    "yearLevel",
                    e.target.value
                  )
                }
              >
                <option value="">Select Year</option>
                <option value={1}>1st Year</option>
                <option value={2}>2nd Year</option>
                <option value={3}>3rd Year</option>
                <option value={4}>4th Year</option>
                <option value={5}>5th Year</option>
              </select>
            </div>

            <div className="mb-3">
              <label>Scholar?</label>
              <select
                className="border p-2 w-full"
                value={String(affiliation.studentDetails.isScholar)}
                onChange={(e) =>
                  handleNestedChange(
                    "studentDetails",
                    "isScholar",
                    e.target.value === "true"
                  )
                }
              >
                <option value="">Select</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
          </>
        )}

        <div className="flex justify-between mt-8">
          <button
            className="bg-gray-300 px-5 py-2 rounded"
            onClick={() => dispatch(prevStep())}
          >
            ← Previous
          </button>

          <button
            className={`px-5 py-2 rounded ${
              canProceed
                ? "bg-black text-white"
                : "bg-gray-400 text-gray-700 cursor-not-allowed"
            }`}
            onClick={() => canProceed && dispatch(nextStep())}
            disabled={!canProceed}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
