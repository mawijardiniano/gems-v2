"use client"

import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  setContact,
  reset,
  prevStep,
} from "@/store/slices/profileRegistrationSlice";
import { logout } from "@/store/slices/authSlice";
import StepIndicator from "@/app/(pages)/profile-registration/components/StepIndicator";
import { isGmail, isValidMobileNumber } from "@/utils/regex";
import axios from "axios";
import { useRouter } from "next/navigation";

export default function ContactInformation() {
  const dispatch = useDispatch();
  const router = useRouter();

  const userId = useSelector((state) => state.auth.userId);
  const currentStatus = useSelector((state) => state.profile.currentStatus);
  const personal = useSelector((state) => state.profile.personal);
  const gadData = useSelector((state) => state.profile.gadData) || {};
  const affiliation = useSelector((state) => state.profile.affiliation);
  const contact = useSelector((state) => state.profile.contact);

  const [touched, setTouched] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field, value) => {
    dispatch(setContact({ field, value }));
  };

  const handleAddressChange = (type, field, value) => {
    dispatch(
      setContact({
        field: type,
        value: {
          ...contact[type],
          [field]: value,
        },
      })
    );
  };

  const requiredFields = [
    contact.email,
    contact.mobileNumber,
    contact.permanentAddress.barangay,
    contact.permanentAddress.city,
    contact.permanentAddress.province,
    contact.currentAddress.barangay,
    contact.currentAddress.city,
    contact.currentAddress.province,
  ];

  const canProceed = requiredFields.every(
    (field) => field && field.trim() !== ""
  );

  const handleSubmit = async () => {
    setTouched(true);

    if (!canProceed) {
      console.log("Please fill in all required fields");
      return;
    }

    if (!isGmail(contact.email)) {
      console.log("Invalid email format");
      return;
    }

    if (!isValidMobileNumber(contact.mobileNumber)) {
      console.log("Invalid mobile number format");
      return;
    }

    setIsSubmitting(true);

    let profilePayload = {
      userId,
      currentStatus,
      personal,
      gadData,
      affiliation,
      contact,
    };

    profilePayload = JSON.parse(
      JSON.stringify(profilePayload, (key, value) =>
        value === "" || value === null || value === undefined
          ? undefined
          : value
      )
    );

    try {
      await axios.post(
        "/api/profile",
        profilePayload
      );
      setShowModal(true);
    } catch (error) {
      console.error(
        "Profile Registration Error:",
        error.response?.data || error.message
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderAddressFields = (type) => (
    <div className="grid grid-cols-2 gap-4">
      {["street", "barangay", "city", "province"].map((field) => (
        <div key={field}>
          <label className="capitalize font-medium text-sm">
            {field.replace("No", " No.")}
          </label>
          <input
            type="text"
            className="border p-2 w-full rounded"
            value={contact[type][field]}
            placeholder={`Enter ${field}`}
            onChange={(e) => handleAddressChange(type, field, e.target.value)}
          />
        </div>
      ))}
    </div>
  );

  return (
    <div className="py-20">
      <div className="flex justify-center items-center h-screen px-4">
        <div className="w-[900px] border border-gray-200 p-6 sm:p-16 rounded-xl bg-white">
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

          <h2 className="text-xl font-bold mb-6">Contact Information</h2>

          {/* Email */}
          <div className="mb-2">
            <label className="font-medium">Email</label>
            <input
              type="email"
              className={`border p-2 w-full rounded ${
                touched && !isGmail(contact.email) ? "border-red-500" : ""
              }`}
              placeholder="Enter email"
              value={contact.email}
              onChange={(e) => handleChange("email", e.target.value)}
            />
            {touched && !contact.email && (
              <p className="text-red-500 text-sm mt-1">Email is required</p>
            )}
            {touched && contact.email && !isGmail(contact.email) && (
              <p className="text-red-500 text-sm mt-1">Invalid email format</p>
            )}
          </div>

          <div className="mb-6">
            <label className="font-medium">Mobile Number</label>
            <input
              type="text"
              className={`border p-2 w-full rounded ${
                touched && !isValidMobileNumber(contact.mobileNumber)
                  ? "border-red-500"
                  : ""
              }`}
              placeholder="e.g. 09123456789"
              value={contact.mobileNumber}
              onChange={(e) => handleChange("mobileNumber", e.target.value)}
            />
            {touched &&
              contact.mobileNumber &&
              !isValidMobileNumber(contact.mobileNumber) && (
                <p className="text-red-500 text-sm mt-1">
                  Invalid mobile number format
                </p>
              )}
          </div>

          <h3 className="font-semibold">Permanent Address</h3>
          {renderAddressFields("permanentAddress")}

          <h3 className="font-semibold mt-6">Current Address</h3>
          {renderAddressFields("currentAddress")}

          <div className="flex justify-between mt-10">
            <button
              className="bg-gray-200 px-5 py-2 rounded hover:bg-gray-300"
              onClick={() => dispatch(prevStep())}
            >
              ← Previous
            </button>

            <button
              className={`px-5 py-2 rounded ${
                canProceed && !isSubmitting
                  ? "bg-black text-white hover:bg-gray-800"
                  : "bg-gray-400 text-gray-700 cursor-not-allowed"
              }`}
              onClick={handleSubmit}
              disabled={!canProceed || isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit"}
            </button>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/5 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-white shadow-xl rounded-xl p-6 text-center max-w-md">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold mb-2">Profile Completed!</h2>
            <p className="text-gray-600 mb-6">
              Thank you for submitting your profile. Please login to continue.
            </p>

            <button
              onClick={() => {
                dispatch(logout());
                dispatch(reset());
                setShowModal(false);
                router.push("/");
              }}
              className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition"
            >
              Go to Login
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
