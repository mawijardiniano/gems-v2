"use client";

import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  setSecurityPeace,
  prevStep,
  reset,
} from "@/store/slices/profileRegistrationSlice";
import Progress from "./progress";
import axios from "axios";
import { useRouter } from "next/navigation";

export default function SecurityPeaceJustice() {
  const dispatch = useDispatch();
  const router = useRouter();
  const spj = useSelector((state) => state.profile.security_peace);
  const personal = useSelector((state) => state.profile.personal_information);
  const economic = useSelector(
    (state) => state.profile.economic_financial_role,
  );
  const reproductive = useSelector(
    (state) => state.profile.reproductive_family_role,
  );
  const household = useSelector(
    (state) => state.profile.household_managing_role,
  );
  const community = useSelector((state) => state.profile.community_involvement);
  const social = useSelector((state) => state.profile.social_development);
  const environmental = useSelector(
    (state) => state.profile.environmental_climate,
  );
  const genderResponsive = useSelector(
    (state) => state.profile.gender_responsive,
  );

  const update = (section, field, value) => {
    dispatch(setSecurityPeace({ section, field, value }));
  };

  const currentStep = useSelector((state) => state.profile.currentStep);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [username, setUsername] = useState("");
  const [tempPassword, setTempPassword] = useState("");

  const handleSubmit = async () => {
    setIsSubmitting(true);
    let payload = {
      personal_information: { ...personal },
      economic_financial_role: economic,
      reproductive_family_role: reproductive,
      household_managing_role: household,
      community_involvement: community,
      social_development: social,
      environmental_climate: environmental,
      gender_responsive: genderResponsive,
      security_peace: spj,
    };

    // Include only the relevant nested object depending on person_type
    if (payload.personal_information.person_type === "Student") {
      // ensure employment info isn't sent for students
      delete payload.personal_information.employment_information;
    } else if (payload.personal_information.person_type === "Employee") {
      // ensure academic info isn't sent for employees
      delete payload.personal_information.academic_information;
    } else {
      // no person_type selected: remove both to avoid server confusion
      delete payload.personal_information.academic_information;
      delete payload.personal_information.employment_information;
    }

    // Basic client-side validation to avoid Mongoose required-field errors
    const validate = (pl) => {
      const errors = [];

      // economic_financial_role required fields
      const eco = pl.economic_financial_role || {};
      if (eco.breadwinner === undefined || eco.breadwinner === null)
        errors.push("economic_financial_role.breadwinner is required");
      if (
        eco.cultural_barrier_work === undefined ||
        eco.cultural_barrier_work === null
      )
        errors.push(
          "economic_financial_role.cultural_barrier_work is required",
        );
      if (
        eco.manage_financial_resources === undefined ||
        eco.manage_financial_resources === null
      )
        errors.push(
          "economic_financial_role.manage_financial_resources is required",
        );
      if (
        eco.participate_financial_decisions === undefined ||
        eco.participate_financial_decisions === null
      )
        errors.push(
          "economic_financial_role.participate_financial_decisions is required",
        );
      if (!Array.isArray(eco.income_sources) || eco.income_sources.length === 0)
        errors.push("economic_financial_role.income_sources is required");

      // personal -> employment/academic required depending on person_type
      const pi = pl.personal_information || {};
      if (pi.person_type === "Employee") {
        const ei = pi.employment_information || {};
        if (!ei.employee_id)
          errors.push(
            "personal_information.employment_information.employee_id is required",
          );
        if (!ei.office)
          errors.push(
            "personal_information.employment_information.office is required",
          );
        if (!ei.employment_status)
          errors.push(
            "personal_information.employment_information.employment_status is required",
          );
        if (!ei.employment_appointment_status)
          errors.push(
            "personal_information.employment_information.employment_appointment_status is required",
          );
      }
      if (pi.person_type === "Student") {
        const ai = pi.academic_information || {};
        if (!ai.student_id)
          errors.push(
            "personal_information.academic_information.student_id is required",
          );
        if (!ai.college)
          errors.push(
            "personal_information.academic_information.college is required",
          );
        if (!ai.year_level)
          errors.push(
            "personal_information.academic_information.year_level is required",
          );
      }

      return errors;
    };

    const errors = validate(payload);
    if (errors.length > 0) {
      console.error("Validation prevented submit:", errors);
      alert(
        "Please complete required fields before submitting:\n" +
          errors.join("\n"),
      );
      setIsSubmitting(false);
      return;
    }

    // strip empty values
    payload = JSON.parse(
      JSON.stringify(payload, (key, value) =>
        value === "" || value === null || value === undefined
          ? undefined
          : value,
      ),
    );
    console.log("payload", payload);

    try {
      const res = await axios.post("/api/profile", payload);

      setUsername(res.data.username);
      setTempPassword(res.data.temporary_password);

      setShowModal(true);
      console.log("Profile submitted successfully", payload);
    } catch (err) {
      console.error("Submission error:", err.response?.data || err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const frequencyOptions = ["Always", "Often", "Sometimes", "Rarely", "Never"];
  const agreeOptions = [
    "Strongly Agree",
    "Agree",
    "Undecided",
    "Disagree",
    "Strongly Disagree",
  ];
  const yesNoNotSure = ["Yes", "No", "Not Sure"];

  const genderBasedFields = [
    "verbal_and_emotional_abuse",
    "mental_and_emotional_anguish",
    "public_humiliation",
    "sexual_favor_as_condition",
    "workplace_discrimination_intimidation",
    "malicious_green_jokes",
    "sexual_advances_by_coworker",
  ];

  const otherExperienceFields = [
    "physical_harm",
    "attempts_physical_harm",
    "fear_of_imminent_physical_harm",
    "compulsion_or_attempt",
    "deprivation_of_freedom",
    "deprivation_of_rights",
    "harassment_of_self_or_family",
    "emotional_distress",
    "stalking",
    "harassment",
  ];

  return (
    <div className="max-w-6xl mx-auto bg-white p-8 space-y-8 rounded-xl shadow-lg">
      <Progress />

      <h2 className="text-2xl font-bold text-gray-800 border-b pb-2">
        Security & Peace / Justice
      </h2>

      <div className="overflow-x-auto">
        <h3 className="font-semibold text-gray-700 mb-2">
          Gender-Based Experiences
        </h3>
        <table className="table-auto border-collapse border border-gray-300 w-full">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-3 py-2 text-left">
                Experience
              </th>
              {frequencyOptions.map((opt) => (
                <th
                  key={opt}
                  className="border border-gray-300 px-3 py-2 text-center"
                >
                  {opt}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {genderBasedFields.map((field) => (
              <tr key={field}>
                <td className="border border-gray-300 px-3 py-2 capitalize">
                  {field.replace(/_/g, " ")}
                </td>
                {frequencyOptions.map((opt) => (
                  <td
                    key={opt}
                    className="border border-gray-300 px-3 py-2 text-center"
                  >
                    <input
                      type="radio"
                      name={`gender_based_${field}`}
                      value={opt}
                      checked={spj.gender_based_experiences[field] === opt}
                      onChange={() =>
                        update("gender_based_experiences", field, opt)
                      }
                      className="w-4 h-4 accent-blue-500 mx-auto"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="overflow-x-auto mt-6">
        <h3 className="font-semibold text-gray-700 mb-2">Other Experiences</h3>
        <table className="table-auto border-collapse border border-gray-300 w-full">
          <thead>
            <tr className="bg-gray-100 ">
              <th className="border border-gray-300 px-3 py-2 text-left ">
                Experience
              </th>
              {frequencyOptions.map((opt) => (
                <th
                  key={opt}
                  className="border border-gray-300 px-3 py-2 text-center "
                >
                  {opt}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {otherExperienceFields.map((field) => (
              <tr key={field}>
                <td className="border border-gray-300 px-3 py-2 capitalize">
                  {field.replace(/_/g, " ")}
                </td>
                {frequencyOptions.map((opt) => (
                  <td
                    key={opt}
                    className="border border-gray-300 px-3 py-2 text-center"
                  >
                    <input
                      type="radio"
                      name={`other_experiences_${field}`}
                      value={opt}
                      checked={spj.other_experiences[field] === opt}
                      onChange={() => update("other_experiences", field, opt)}
                      className="w-4 h-4 accent-blue-500 mx-auto"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-gray-700">VAW Services Awareness</h3>
        {["vaw_desk_marsu", "legal_assistance_marsu"].map((field) => (
          <div key={field} className="flex flex-col">
            <span className="text-gray-600 mb-1 capitalize">
              {field.replace(/_/g, " ")}
            </span>
            <div className="flex flex-wrap gap-4">
              {yesNoNotSure.map((opt) => (
                <label key={opt} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`vaw_services_${field}`}
                    value={opt}
                    checked={spj.vaw_services_awareness[field] === opt}
                    onChange={() =>
                      update("vaw_services_awareness", field, opt)
                    }
                    className="w-4 h-4 accent-blue-500"
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>
        ))}
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
                : "bg-black text-white hover:bg-gray-800"
            }`}
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/5 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-white shadow-xl rounded-xl p-6 text-center max-w-md">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold mb-2">Submission Received!</h2>
            <p className="text-gray-600 mb-2">
              Thank you for submitting the survey. Your responses have been
              recorded.
            </p>
            {username && tempPassword && (
              <div className="bg-gray-100 p-4 rounded-lg mb-4 text-left">
                <p>
                  <span className="font-semibold">Username:</span> {username}
                </p>
                <p>
                  <span className="font-semibold">Temporary Password:</span>{" "}
                  {tempPassword}
                </p>
              </div>
            )}

            <div className="flex gap-4 justify-center">
              <button
                onClick={() => {
                  dispatch(reset());
                  setShowModal(false);
                  router.push("/");
                }}
                className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
