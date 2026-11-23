"use client";

import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { nextStep } from "@/store/slices/profileRegistrationSlice";
import { FaShieldAlt, FaCheckCircle, FaArrowRight } from "react-icons/fa";
import Button from "@/components/ui/Button";

export default function PrivacyConsent() {
  const [checked, setChecked] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dispatch = useDispatch();

  const handleNext = () => {
    if (checked) dispatch(nextStep());
  };

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollTop + clientHeight >= scrollHeight - 10) {
      setScrolled(true);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-start justify-center px-4 py-8">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl border border-line-subtle overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-secondary-600 to-secondary-700 px-8 py-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <FaShieldAlt className="text-white text-2xl" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Privacy & Consent</h1>
              <p className="text-secondary-100 text-sm mt-1">
                Marinduque State University &mdash; Gender Equity Management System
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div
          className="px-8 py-6 max-h-80 overflow-y-auto space-y-4 text-sm text-fg-3 leading-relaxed"
          onScroll={handleScroll}
        >
          <p>
            <span className="font-semibold text-fg">
              Marinduque State University (MarSU)
            </span>{" "}
            is committed to protecting your privacy and ensuring that all
            personal and sensitive personal information (SPI) collected through
            the{" "}
            <span className="font-semibold text-secondary-700">
              Gender Equity Management System (GEMS)
            </span>{" "}
            is processed in compliance with the{" "}
            <span className="font-semibold">
              Data Privacy Act of 2012 (RA 10173)
            </span>
            .
          </p>

          <div className="bg-secondary-50 border border-secondary-200 p-4 rounded-lg">
            <p className="font-semibold text-fg mb-1">
              1. Purpose of Data Collection
            </p>
            <p className="text-fg-3">
              We collect and process your data (such as name, sex, age,
              ethnicity, disability status, and affiliation) solely for:
            </p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>
                Maintaining a comprehensive sex-disaggregated database mandated
                by the <span className="font-semibold">Magna Carta of Women (RA 9710)</span>
              </li>
              <li>
                Generating institutional reports for oversight agencies like the{" "}
                <span className="font-semibold">PCW, CHED, and NEDA</span>
              </li>
            </ul>
          </div>

          <div className="bg-secondary-50 border border-secondary-200 p-4 rounded-lg">
            <p className="font-semibold text-fg mb-1">
              2. Types of Information Collected
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <span className="font-semibold">Personal Information:</span>{" "}
                Name, Employee/Student Number, Department/College
              </li>
              <li>
                <span className="font-semibold">
                  Sensitive Personal Information:
                </span>{" "}
                Sex, Age, Civil Status, Ethnicity, and Disability Status
              </li>
            </ul>
          </div>

          <div className="bg-success-subtle border border-success-border p-4 rounded-lg">
            <p className="font-semibold text-fg mb-1">
              3. Data Security & Retention
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Data is encrypted during transmission and storage</li>
              <li>
                Access is restricted to authorized GAD Focal Persons and
                Administrators
              </li>
              <li>
                Public dashboards show only aggregated, anonymous statistics
              </li>
              <li>
                Data retained for duration of employment/enrollment plus 5 years
              </li>
            </ul>
          </div>

          <div className="bg-secondary-50 border border-secondary-200 p-4 rounded-lg">
            <p className="font-semibold text-fg mb-1">
              4. Your Rights
            </p>
            <p className="text-fg-3 mb-1">
              As a data subject, you have the right to:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Be informed about data processing</li>
              <li>Access and correct your data</li>
              <li>Object to processing (subject to legal mandates)</li>
              <li>Request correction of errors</li>
            </ul>
          </div>
        </div>

        {/* Consent Checkbox */}
        <div className="px-8 py-5 border-t border-line-subtle bg-subtle">
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative mt-0.5">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => setChecked(!checked)}
                className="sr-only"
              />
              <div
                className={`w-5 h-5 rounded border-2 transition duration-200 flex items-center justify-center ${
                  checked
                    ? "bg-secondary-600 border-secondary-600"
                    : "border-line-strong group-hover:border-secondary-400"
                }`}
              >
                {checked && <FaCheckCircle className="text-white text-xs" />}
              </div>
            </div>
            <span className="text-sm text-fg-3 font-medium select-none">
              I have read and agree to the privacy policy and consent statement
            </span>
          </label>

          {/* Next Button */}
          <Button
            onClick={handleNext}
            disabled={!checked}
            className="mt-5 w-full"
          >
            Continue
            <FaArrowRight className="text-xs" />
          </Button>
        </div>
      </div>
    </div>
  );
}