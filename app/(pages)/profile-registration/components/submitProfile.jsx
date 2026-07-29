"use client";

import { useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { useRouter } from "next/navigation";
import { prevStep, reset } from "@/store/slices/profileRegistrationSlice";
import Progress from "./progress";
import AddressData from "@/public/data/all.json";
import { FaCheckCircle, FaArrowLeft, FaSpinner, FaUserCheck, FaGraduationCap, FaBriefcase, FaChartBar, FaMapMarkerAlt, FaClipboardList } from "react-icons/fa";

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
    if (gadData.isPWD === undefined || gadData.isPWD === null)
      errors.push("PWD status is required");
    if (gadData.isPWD === true && !gadData.pwd_type)
      errors.push("PWD type is required when PWD is yes");
    if (gadData.isIndigenousPerson === undefined || gadData.isIndigenousPerson === null)
      errors.push("Indigenous person status is required");
    if (!gadData.socioEconomicStatus) errors.push("Socio-economic status is required");
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
      if (!ei.employment_appointment_status) errors.push("Appointment status is required");
    }
    return errors;
  };

  const buildAddress = (address) => {
    const regionObj = AddressData.regions.find((r) => r.code === address.region);
    const provinceObj = AddressData.provinces.find((p) => p.code === address.province);
    const cityObj = AddressData.cities.find((c) => c.code === address.city);
    const barangayObj = AddressData.barangays.find((b) => b.code === address.barangay);
    return {
      region: { code: address.region, name: regionObj ? regionObj.name : "" },
      province: { code: address.province, name: provinceObj ? provinceObj.name : "" },
      city: { code: address.city, name: cityObj ? cityObj.name : "" },
      barangay: { code: address.barangay, name: barangayObj ? barangayObj.name : "" },
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
      if (payload.gadData.isPWD === false) {
        delete payload.gadData.pwd_type;
      }
      const cleaned = JSON.parse(JSON.stringify(payload, (key, value) =>
        value === "" || value === null || value === undefined ? undefined : value,
      ));
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

  const SummaryCard = ({ icon, title, children }) => (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
      <div className="flex items-center gap-2 px-5 py-3 bg-gray-50 border-b border-gray-100">
        <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
          {icon}
        </div>
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      </div>
      <div className="px-5 py-3">
        {children}
      </div>
    </div>
  );

  const Field = ({ label, value }) => (
    <div className="flex justify-between py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs font-medium text-gray-800 text-right max-w-[60%] truncate">{value || "—"}</span>
    </div>
  );

  if (credentials) {
    return (
      <div className="min-h-[70vh] flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-lg">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-8 py-8 text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                <FaCheckCircle className="text-white text-2xl" />
              </div>
              <h2 className="text-2xl font-bold text-white">Registration Successful!</h2>
              <p className="text-emerald-100 text-sm mt-1">
                Your profile has been created in the GEMS system.
              </p>
            </div>
            <div className="p-8 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-3">
                  Your Account Credentials
                </p>
                <div className="space-y-3">
                  <div className="bg-white rounded-lg px-4 py-3 border border-amber-100">
                    <p className="text-xs text-gray-500">Username</p>
                    <p className="text-sm font-bold text-gray-900 font-mono">{credentials.username}</p>
                  </div>
                  <div className="bg-white rounded-lg px-4 py-3 border border-amber-100">
                    <p className="text-xs text-gray-500">Temporary Password</p>
                    <p className="text-sm font-bold text-gray-900 font-mono">{credentials.temporary_password}</p>
                  </div>
                </div>
                <p className="text-xs text-amber-600 mt-3">
                  Please change your password after first login.
                </p>
              </div>
              <button
                onClick={() => {
                  dispatch(reset());
                  router.push("/");
                }}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition shadow-lg shadow-blue-200"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <Progress />

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <FaClipboardList className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Review & Submit</h2>
                <p className="text-blue-100 text-xs mt-0.5">
                  Please review your details before submitting
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                <p className="font-semibold mb-1">Please fix the following:</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  {error.split("\n").map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}

            <SummaryCard icon={<FaUserCheck />} title="Personal Information">
              <Field label="First Name" value={personal.first_name} />
              <Field label="Middle Name" value={personal.middle_name} />
              <Field label="Last Name" value={personal.last_name} />
              <Field label="Civil Status" value={personal.civil_status} />
              <Field label="Religion" value={personal.religion === "Other" ? personal.religion_other : personal.religion} />
              <Field label="Status" value={personal.currentStatus} />
              <Field label="Birthday" value={personal.birthday} />
              <Field label="Blood Type" value={personal.bloodType} />
            </SummaryCard>

            {personal.currentStatus === "Student" && (
              <SummaryCard icon={<FaGraduationCap />} title="Academic Information">
                <Field label="Student ID" value={affiliation.academic_information?.student_id} />
                <Field label="Campus" value={affiliation.academic_information?.campus} />
                <Field label="College" value={affiliation.academic_information?.college} />
                <Field label="Course" value={affiliation.academic_information?.course} />
                <Field label="Year Level" value={affiliation.academic_information?.year_level} />
                <Field label="Scholar" value={affiliation.academic_information?.isScholar === "Yes" ? "Yes" : "No"} />
              </SummaryCard>
            )}

            {personal.currentStatus === "Employee" && (
              <SummaryCard icon={<FaBriefcase />} title="Employment Information">
                <Field label="Employee ID" value={affiliation.employment_information?.employee_id} />
                <Field label="Office" value={affiliation.employment_information?.office} />
                <Field label="Employment Status" value={affiliation.employment_information?.employment_status} />
                <Field label="Appointment" value={affiliation.employment_information?.employment_appointment_status} />
              </SummaryCard>
            )}

            <SummaryCard icon={<FaChartBar />} title="GAD Data">
              <Field label="Sex at Birth" value={gadData.sexAtBirth} />
              <Field label="Gender" value={gadData.gender_preference} />
              <Field label="PWD" value={gadData.isPWD ? "Yes" : "No"} />
              {gadData.isPWD && <Field label="PWD Type" value={gadData.pwd_type} />}
              <Field label="Indigenous" value={gadData.isIndigenousPerson ? "Yes" : "No"} />
              <Field label="Socio-economic" value={gadData.socioEconomicStatus} />
              <Field label="Head of Household" value={gadData.headOfHousehold} />
            </SummaryCard>

            <SummaryCard icon={<FaMapMarkerAlt />} title="Contact Information">
              <Field label="Email" value={contact.email} />
              <Field label="Mobile" value={contact.mobileNumber} />
              {(() => {
                const addr = getAddressNames(contact.permanentAddress || {});
                return <Field label="Permanent Address" value={`${addr.barangay}, ${addr.city}, ${addr.province}`} />;
              })()}
              {(() => {
                const addr = getAddressNames(contact.currentAddress || {});
                return <Field label="Current Address" value={`${addr.barangay}, ${addr.city}, ${addr.province}`} />;
              })()}
            </SummaryCard>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
            <button
              onClick={() => dispatch(prevStep())}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition text-sm font-medium"
            >
              <FaArrowLeft className="text-xs" /> Previous
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={() => dispatch(reset())}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 transition text-sm font-medium"
                disabled={isSubmitting}
              >
                Reset
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                  isSubmitting
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <FaCheckCircle className="text-xs" />
                    Submit Profile
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}