"use client";

import { useDispatch, useSelector } from "react-redux";
import {
  setContact,
  nextStep,
  prevStep,
} from "@/store/slices/profileRegistrationSlice";
import Progress from "./progress";

export default function ContactInformation() {
  const dispatch = useDispatch();
  const contact = useSelector((state) => state.profile.contact);

  const update = (field, value) => dispatch(setContact({ field, value }));

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 space-y-8 rounded-xl shadow-lg">
      <Progress />

      <h2 className="text-2xl font-bold text-gray-800 border-b pb-2">
        Contact Information
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col">
          <label className="text-sm text-gray-600">Email</label>
          <input
            type="email"
            className="border border-gray-300 rounded-lg px-3 py-2"
            value={contact.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="example@email.com"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm text-gray-600">Mobile Number</label>
          <input
            className="border border-gray-300 rounded-lg px-3 py-2"
            value={contact.mobileNumber}
            onChange={(e) => update("mobileNumber", e.target.value)}
            placeholder="09XXXXXXXXX"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-700">Permanent Address</h3>
          <input
            className="border border-gray-300 rounded-lg px-3 py-2 w-full"
            value={contact.permanentAddress.barangay}
            onChange={(e) =>
              update("permanentAddress.barangay", e.target.value)
            }
            placeholder="Barangay"
          />
          <input
            className="border border-gray-300 rounded-lg px-3 py-2 w-full"
            value={contact.permanentAddress.city}
            onChange={(e) => update("permanentAddress.city", e.target.value)}
            placeholder="City/Municipality"
          />
          <input
            className="border border-gray-300 rounded-lg px-3 py-2 w-full"
            value={contact.permanentAddress.province}
            onChange={(e) =>
              update("permanentAddress.province", e.target.value)
            }
            placeholder="Province"
          />
        </div>

        <div className="space-y-3">
          <h3 className="font-semibold text-gray-700">Current Address</h3>
          <input
            className="border border-gray-300 rounded-lg px-3 py-2 w-full"
            value={contact.currentAddress.barangay}
            onChange={(e) => update("currentAddress.barangay", e.target.value)}
            placeholder="Barangay"
          />
          <input
            className="border border-gray-300 rounded-lg px-3 py-2 w-full"
            value={contact.currentAddress.city}
            onChange={(e) => update("currentAddress.city", e.target.value)}
            placeholder="City/Municipality"
          />
          <input
            className="border border-gray-300 rounded-lg px-3 py-2 w-full"
            value={contact.currentAddress.province}
            onChange={(e) => update("currentAddress.province", e.target.value)}
            placeholder="Province"
          />
        </div>
      </div>

      <div className="flex justify-between mt-6">
        <button
          onClick={() => dispatch(prevStep())}
          className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition"
        >
          Previous
        </button>
        <button
          onClick={() => dispatch(nextStep())}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Next
        </button>
      </div>
    </div>
  );
}
