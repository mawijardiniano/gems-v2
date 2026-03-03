import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { nextStep } from "@/store/slices/profileRegistrationSlice";

export default function PrivacyConsent() {
  const [checked, setChecked] = useState(false);
  const dispatch = useDispatch();

  const handleNext = () => {
    if (checked) dispatch(nextStep());
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-6 rounded shadow">
      <h2 className="text-xl font-bold mb-4">Privacy and Consent</h2>
      <p className="mb-4 text-gray-700">
        Lorem ipsum, dolor sit amet consectetur adipisicing elit. Aspernatur
        nemo cumque, laboriosam similique nostrum sunt quidem voluptas
        asperiores. Commodi atque iste rem ut iure molestiae est provident
        debitis minima deleniti?
      </p>
      <div className="flex items-center mb-4">
        <input
          type="checkbox"
          id="consent"
          checked={checked}
          onChange={() => setChecked(!checked)}
          className="mr-2"
        />
        <label htmlFor="consent" className="text-sm text-gray-800">
          I have read and agree to the privacy policy and consent statement.
        </label>
      </div>
      <button
        onClick={handleNext}
        disabled={!checked}
        className={`px-4 py-2 rounded bg-blue-600 text-white font-semibold ${!checked ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-700"}`}
      >
        Next
      </button>
    </div>
  );
}
