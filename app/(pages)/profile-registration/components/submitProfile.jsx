"use client";

import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { useRouter } from "next/navigation";
import { prevStep, reset } from "@/store/slices/profileRegistrationSlice";
import Progress from "./progress";
import AddressData from "@/public/data/all.json";

export default function SubmitProfile() {
  const dispatch = useDispatch();
  const router = useRouter();
  const personal = useSelector((state) => state.profile.personal);
  const gadData = useSelector((state) => state.profile.gadData);
  const affiliation = useSelector((state) => state.profile.affiliation);
  const contact = useSelector((state) => state.profile.contact);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [credentials, setCredentials] = useState(null);

  const getAddressNames = (address) => {
    const regionObj = (AddressData.regions || []).find(
      (r) => r.code === address.region,
    );
    const provinceObj = (AddressData.provinces || []).find(
      (p) => p.code === address.province,
    );
    const cityObj = (AddressData.cities || []).find(
      (c) => c.code === address.city,
    );
    const barangayObj = (AddressData.barangays || []).find(
      (b) => b.code === address.barangay,
    );
    return {
      region: regionObj ? regionObj.name : "",
      province: provinceObj ? provinceObj.name : "",
      city: cityObj ? cityObj.name : "",
      barangay: barangayObj ? barangayObj.name : "",
    };
  };

  const validate = () => {
    const errors = [];

    if (!personal.first_name) errors.push("First name is required");
    if (!personal.last_name) errors.push("Last name is required");
    if (!personal.civil_status) errors.push("Civil status is required");
    if (!personal.religion) errors.push("Religion is required");
    if (!personal.currentStatus) errors.push("Current status is required");
    if (!personal.birthday) errors.push("Birthday is required");
    if (!personal.bloodType) errors.push("Blood type is required");

    if (!gadData.sexAtBirth) errors.push("Sex at birth is required");
    // if (!gadData.gender_preference)
    //   errors.push("Gender preference is required");
    if (gadData.isPWD === undefined || gadData.isPWD === null)
      errors.push("PWD status is required");
    if (gadData.isPWD === true && !gadData.pwd_type)
      errors.push("PWD type is required when PWD is yes");
    if (
      gadData.isIndigenousPerson === undefined ||
      gadData.isIndigenousPerson === null
    )
      errors.push("Indigenous person status is required");
    if (!gadData.socioEconomicStatus)
      errors.push("Socio-economic status is required");
    if (!gadData.headOfHousehold) errors.push("Head of household is required");

    if (!contact.email) errors.push("Email is required");
    if (!contact.mobileNumber) errors.push("Mobile number is required");

    if (personal.currentStatus === "Student") {
      const ai = affiliation.academic_information || {};
      if (!ai.student_id) errors.push("Student ID is required");
      if (!ai.campus) errors.push("Campus is required");
      if (!ai.college) errors.push("College is required");
      if (!ai.course) errors.push("Course is required");
      if (!ai.year_level) errors.push("Year level is required");
      if (ai.isScholar === "") errors.push("Scholarship status is required");
    }

    if (personal.currentStatus === "Employee") {
      const ei = affiliation.employment_information || {};
      if (!ei.employee_id) errors.push("Employee ID is required");
      if (!ei.office) errors.push("Office is required");
      if (!ei.employment_status) errors.push("Employment status is required");
      if (!ei.employment_appointment_status)
        errors.push("Appointment status is required");
    }

    return errors;
  };

  const buildAddress = (address) => {
    const regionObj = AddressData.regions.find(
      (r) => r.code === address.region,
    );
    const provinceObj = AddressData.provinces.find(
      (p) => p.code === address.province,
    );
    const cityObj = AddressData.cities.find((c) => c.code === address.city);
    const barangayObj = AddressData.barangays.find(
      (b) => b.code === address.barangay,
    );
    return {
      region: { code: address.region, name: regionObj ? regionObj.name : "" },
      province: {
        code: address.province,
        name: provinceObj ? provinceObj.name : "",
      },
      city: { code: address.city, name: cityObj ? cityObj.name : "" },
      barangay: {
        code: address.barangay,
        name: barangayObj ? barangayObj.name : "",
      },
    };
  };

  const handleSubmit = async () => {
    setError("");
    const errors = validate();
    if (errors.length) {
      setError(errors.join("\n"));
      return;
    }

    setIsSubmitting(true);
    try {
      const contactWithCodesAndNames = {
        ...contact,
        permanentAddress: buildAddress(contact.permanentAddress),
        currentAddress: buildAddress(contact.currentAddress),
      };
      const payload = {
        personal,
        gadData: { ...gadData },
        affiliation: { ...affiliation },
        contact: contactWithCodesAndNames,
      };

      console.log("Payload", payload)

      if (payload.gadData.isPWD === false) {
        delete payload.gadData.pwd_type;
      }

      const cleaned = JSON.parse(
        JSON.stringify(payload, (key, value) =>
          value === "" || value === null || value === undefined
            ? undefined
            : value,
        ),
      );

      const res = await axios.post("/api/profile", cleaned);
      setCredentials({
        username: res.data.username,
        temporary_password: res.data.temporary_password,
      });
    } catch (err) {
      const apiError = err.response?.data?.error || err.message;
      setError(apiError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 space-y-6 rounded-xl shadow-lg">
      <Progress />

      <h2 className="text-2xl font-bold text-gray-800 border-b pb-2">
        Review & Submit
      </h2>

      <p className="text-sm text-gray-600">
        Please review your details and submit to create your profile.
      </p>

      {/* {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p className="font-semibold">Please fix the following:</p>
          <pre className="whitespace-pre-wrap text-sm mt-1">{error}</pre>
        </div>
      )} */}

      {credentials ? (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            <p className="font-semibold mb-1">Profile created successfully.</p>
            <p>Username: {credentials.username}</p>
            <p>Temporary Password: {credentials.temporary_password}</p>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => {
                dispatch(reset());
                router.push("/");
              }}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Back to Home
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-gray-50 border border-gray-200 rounded p-4 mb-2">
            <h3 className="font-semibold mb-2 text-gray-700">
              Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div>
                <b>First Name:</b> {personal.first_name}
              </div>
              <div>
                <b>Middle Name:</b> {personal.middle_name}
              </div>
              <div>
                <b>Last Name:</b> {personal.last_name}
              </div>
              <div>
                <b>Civil Status:</b> {personal.civil_status}
              </div>
              <div>
                <b>Religion:</b>{" "}
                {personal.religion === "Other"
                  ? personal.religion_other
                  : personal.religion}
              </div>
              <div>
                <b>Current Status:</b> {personal.currentStatus}
              </div>
              <div>
                <b>Birthday:</b> {personal.birthday}
              </div>
              <div>
                <b>Blood Type:</b> {personal.bloodType}
              </div>
            </div>
          </div>

          {personal.currentStatus === "Student" && (
            <div className="bg-gray-50 border border-gray-200 rounded p-4 mb-2">
              <h3 className="font-semibold mb-2 text-gray-700">
                Academic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div>
                  <b>Student ID:</b>{" "}
                  {affiliation.academic_information?.student_id}
                </div>
                <div>
                  <b>Campus:</b> {affiliation.academic_information?.campus}
                </div>
                <div>
                  <b>College:</b> {affiliation.academic_information?.college}
                </div>
                <div>
                  <b>Course:</b> {affiliation.academic_information?.course}
                </div>
                <div>
                  <b>Year Level:</b>{" "}
                  {affiliation.academic_information?.year_level}
                </div>
                <div>
                  <b>Scholar:</b>{" "}
                  {affiliation.academic_information?.isScholar ? "Yes" : "No"}
                </div>
              </div>
            </div>
          )}
          {personal.currentStatus === "Employee" && (
            <div className="bg-gray-50 border border-gray-200 rounded p-4 mb-2">
              <h3 className="font-semibold mb-2 text-gray-700">
                Employment Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div>
                  <b>Employee ID:</b>{" "}
                  {affiliation.employment_information?.employee_id}
                </div>
                <div>
                  <b>Office:</b> {affiliation.employment_information?.office}
                </div>
                <div>
                  <b>Employment Status:</b>{" "}
                  {affiliation.employment_information?.employment_status}
                </div>
                <div>
                  <b>Appointment Status:</b>{" "}
                  {
                    affiliation.employment_information
                      ?.employment_appointment_status
                  }
                </div>
              </div>
            </div>
          )}
          <div className="bg-gray-50 border border-gray-200 rounded p-4 mb-2">
            <h3 className="font-semibold mb-2 text-gray-700">GAD Data</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div>
                <b>Sex at Birth:</b> {gadData.sexAtBirth}
              </div>
              <div>
                <b>Gender Preference:</b> {gadData.gender_preference}
              </div>
              <div>
                <b>PWD:</b> {gadData.isPWD ? "Yes" : "No"}
              </div>
              {gadData.isPWD && (
                <div>
                  <b>PWD Type:</b> {gadData.pwd_type}
                </div>
              )}
              <div>
                <b>Indigenous Person:</b>{" "}
                {gadData.isIndigenousPerson ? "Yes" : "No"}
              </div>
              <div>
                <b>Socio-Economic Status:</b> {gadData.socioEconomicStatus}
              </div>
              <div>
                <b>Head of Household:</b> {gadData.headOfHousehold}
              </div>
            </div>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded p-4 mb-2">
            <h3 className="font-semibold mb-2 text-gray-700">
              Contact Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div>
                <b>Email:</b> {contact.email}
              </div>
              <div>
                <b>Mobile Number:</b> {contact.mobileNumber}
              </div>
              <div>
                {(() => {
                  const addr = getAddressNames(contact.permanentAddress || {});
                  return (
                    <>
                      <b>Permanent Address:</b> {addr.barangay}, {addr.city},{" "}
                      {addr.province}
                    </>
                  );
                })()}
              </div>
              <div>
                {(() => {
                  const addr = getAddressNames(contact.currentAddress || {});
                  return (
                    <>
                      <b>Current Address:</b> {addr.barangay}, {addr.city},{" "}
                      {addr.province}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          <div className="flex justify-between mt-6">
            <button
              onClick={() => dispatch(prevStep())}
              className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition"
            >
              Previous
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`px-6 py-2 rounded-lg transition ${
                  isSubmitting
                    ? "bg-gray-400 text-gray-700 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {isSubmitting ? "Submitting..." : "Submit"}
              </button>
              <button
                onClick={() => dispatch(reset())}
                className="px-4 py-2 rounded-lg border"
                disabled={isSubmitting}
              >
                Reset
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
