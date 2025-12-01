

import { useDispatch, useSelector } from "react-redux";
import {
  prevStep,
  nextStep,
  setPersonal,
} from "@/store/slices/profileRegistrationSlice";
import StepIndicator from "@/app/(pages)/profile-registration/components/StepIndicator";

export default function StepOne() {
  const dispatch = useDispatch();
  const personal = useSelector((state) => state.profile.personal);


  const handleChange = (field, value) => {
    dispatch(setPersonal({ field, value }));
  };

  const handleBirthdayChange = (value) => {
    const today = new Date().toISOString().split("T")[0];
    if (value > today) {
      
      return;
    }
    handleChange("birthday", value);
  };

  const requiredFields = [
    personal.lastName,
    personal.firstName,
    personal.birthday,
    personal.civilStatus,
    personal.nationality,
  ];

  const canProceed = requiredFields.every(Boolean);

  return (
    <div className="flex justify-center items-center h-screen">
      <div className="w-[900px] border border-gray-200 p-16 rounded-xl bg-white">
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

        <h2 className="text-xl font-bold mb-4">Personal Demographics</h2>

        {/* Form Fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-medium mb-1">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full border p-2 rounded"
              value={personal.lastName}
              onChange={(e) => handleChange("lastName", e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block font-medium mb-1">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full border p-2 rounded"
              value={personal.firstName}
              onChange={(e) => handleChange("firstName", e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Middle Name</label>
            <input
              type="text"
              className="w-full border p-2 rounded"
              value={personal.middleName}
              onChange={(e) => handleChange("middleName", e.target.value)}
            />
          </div>

          <div>
            <label className="block font-medium mb-1">
              Birthday <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              className="w-full border p-2 rounded"
              value={personal.birthday}
              onChange={(e) => handleBirthdayChange(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              required
            />
          </div>

          <div>
            <label className="block font-medium mb-1">
              Civil Status <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full border p-2 rounded"
              value={personal.civilStatus}
              onChange={(e) => handleChange("civilStatus", e.target.value)}
            >
              <option value="">Select</option>
              <option value="Single">Single</option>
              <option value="Married">Married</option>
              <option value="Widowed">Widowed</option>
              <option value="Separated">Separated</option>
              <option value="Divorced">Divorced</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block font-medium mb-1">
              Nationality <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full border p-2 rounded"
              value={personal.nationality}
              onChange={(e) => handleChange("nationality", e.target.value)}
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Blood Type</label>
            <select
              className="w-full border p-2 rounded"
              value={personal.bloodType}
              onChange={(e) => handleChange("bloodType", e.target.value)}
            >
              <option value="">Select</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
            </select>
          </div>

          <div>
            <label className="block font-medium mb-1">Religion</label>
            <input
              type="text"
              className="w-full border p-2 rounded"
              value={personal.religion}
              onChange={(e) => handleChange("religion", e.target.value)}
            />
          </div>
        </div>

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
