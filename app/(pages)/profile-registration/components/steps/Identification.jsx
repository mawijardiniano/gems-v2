import StepIndicator from "@/app/(pages)/profile-registration/components/StepIndicator";
import { useSelector, useDispatch } from "react-redux";
import { nextStep, setStatus } from "@/store/slices/profileRegistrationSlice";

export default function Identification() {
  const dispatch = useDispatch();
  const currentStep = useSelector((state) => state.profile.currentStep);
  const currentStatus = useSelector((state) => state.profile.currentStatus);

  const handleChange = (field, value) => {
    dispatch(setStatus({ field, value }));
  };

  const canProceed = !!currentStatus;

  return (
    <div className="flex justify-center items-center h-screen px-4">
      <div className="w-[900px] border border-gray-200 p-6 sm:p-16 rounded-xl bg-white">
        <div className="flex justify-center items-center mb-6">
          <StepIndicator
            titles={["Identification", "Personal", "Gender", "Affiliation", "Contact"]}
            currentStep={currentStep}
          />
        </div>

        <h2 className="text-xl font-bold mb-4">Identification</h2>
        <label>Status</label>
        <select
          className="w-full border p-2 rounded"
          value={currentStatus}
          onChange={(e) => handleChange("currentStatus", e.target.value)}
          required
        >
          <option value="">Select</option>
          <option value="Employee">Employee</option>
          <option value="Student">Student</option>
          <option value="Applicant">Applicant</option>
        </select>

        <div className="flex justify-end mt-8">
          <button
            className={`px-5 py-2 rounded ${canProceed ? "bg-black text-white" : "bg-gray-400 text-gray-700 cursor-not-allowed"}`}
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
