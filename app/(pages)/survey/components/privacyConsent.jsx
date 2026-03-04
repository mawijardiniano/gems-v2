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
      <h2 className="text-xl font-bold mb-4 text-center">
        Privacy and Consent
      </h2>
      <div className="bg-white border border-gray-200 p-8 h-90 overflow-y-auto text-sm">
        <p>
          <span className="font-bold">Marinduque State University (MarSU)</span>{" "}
          is committed to protecting your privacy and ensuring that all personal
          and sensitive personal information (SPI) collected through the{" "}
          <span className="font-bold">
            Gender Equity Management System (GEMS)
          </span>{" "}
          is processed in compliance with the{" "}
          <span className="font-bold">Data Privacy Act of 2012 (RA 10173)</span>
          .
        </p>
        <p className="font-bold">1. Purpose of Data Collection</p>
        <p>
          We collect and process your data (such as name, sex, age, ethnicity,
          disability status, and affiliation) solely for the following purposes:
        </p>
        <ul className="list-disc pl-8">
          <li>
            To maintain a comprehensive sex-disaggregated database mandated by
            the
            <span className="font-bold"> Magna Carta of Women (RA 9710).</span>
          </li>
          <li>
            To maintain a comprehensive sex-disaggregated database mandated by
            the Magna Carta of Women (RA 9710).
          </li>
          <li>
            To generate institutional reports for oversight agencies like the
            <span className="font-bold"> PCW, CHED, and NEDA.</span>
          </li>
        </ul>
        <p className="font-bold">2. Types of Information Collected</p>
        <ul className="list-disc pl-8">
          <li>
            <span className="font-bold">Personal Information:</span> Name,
            Employee/Student Number, Department/College.
          </li>
          <li>
            <span className="font-bold">Sensitive Personal Information: </span>
            Sex, Age, Civil Status, Ethnicity/Indigenous Group membership, and
            Disability Status.
          </li>
        </ul>
        <p className="font-bold">3. Data Processing and Security</p>
        <p>
          Your data is processed through{" "}
          <span className="font-bold">automated integration (API)</span> or
          <span className="font-bold"> authorized batch uploads</span>. MarSU
          implements strict security measures, including:
        </p>
        <ul className="list-disc pl-8">
          <li>
            <span className="font-bold">Encryption: </span>
            Data is encrypted during transmission and storage.
          </li>
          <li>
            <span className="font-bold">Access Control: </span>
            Access Control: Only authorized GAD Focal Persons and System
            Administrators can access identifiable data on a "need-to-know"
            basis.
          </li>
          <li>
            <span className="font-bold">Anonymization: </span>
            Publicly displayed charts and executive dashboards show only
            aggregated, anonymous statistics.
          </li>
        </ul>
        <p className="font-bold">4. Data Retention</p>
        <p>
          Your personal data will be retained for the duration of your
          employment or enrollment at MarSU, plus an additional{" "}
          <span className="font-bold">five (5) years </span>
          for longitudinal research and audit purposes, after which it will be
          permanently deleted via secure digital shredding.
        </p>
        <p className="font-bold">5. Your Rights</p>
        <p>As a data subject, you have the right to:</p>
        <ul className="list-disc pl-8">
          <li>Be informed that your data is being processed.</li>
          <li>Access your data to check for accuracy.</li>
          <li>
            Object to the processing of your data (subject to university and
            legal mandates).
          </li>
          <li>Request correction of any errors in your record.</li>
        </ul>
        <p className="font-bold">6. Consent</p>
        <p>
          By clicking <span className="font-bold">"I Accept" </span> or by
          continuing to use this platform, you certify that you have read this
          notice and give your free and informed consent to MarSU for the
          processing of your information for the GAD-related purposes mentioned
          above.
        </p>
      </div>
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
