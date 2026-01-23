"use client";

import { useDispatch, useSelector } from "react-redux";
import {
  setSocialDevelopment,
  nextStep,
  prevStep,
} from "@/store/slices/profileRegistrationSlice";
import Progress from "./progress";

export default function SocialDevelopment() {
  const dispatch = useDispatch();
  const sd = useSelector((state) => state.profile.social_development);
  const currentStep = useSelector((state) => state.profile.currentStep);

  const update = (section, field, value) => {
    // If field is an array (like [subSection, key])
    if (Array.isArray(field)) {
      dispatch(setSocialDevelopment({ section, field, value }));
    } else {
      dispatch(setSocialDevelopment({ section, field, value }));
    }
  };

  const handleNext = () => {
    dispatch(nextStep());
    console.log("Moved to next step:", currentStep + 1, {
      social_development: sd,
    });
  };

  const yesNoOptions = [
    { label: "Yes", value: true },
    { label: "No", value: false },
  ];
  const yesNoNAArr = ["Yes", "No", "N/A"];
  const yesNoNotSure = ["Yes", "No", "Not Sure"];

  const RA_fields = [
    "RA_6275",
    "RA_10354",
    "RA_7192",
    "RA_7877",
    "RA_8972",
    "RA_9710",
    "RA_9262",
    "RA_7277",
    "RA_11313",
    "RA_8353",
    "RA_11596",
  ];

  const other_training_options = [
    "Responsible Parenthood and Reproductive Health Act of 2012",
    "Anti-Violence against Women and their Children Act of 2014",
    "Disaster Preparedness and Risk Reduction Management",
    "Women Empowerment & Development Towards Gender Equality (WEDGE) by PCW",
    "Human Rights-Based Approach (HRBA) to Development Planning and Basic Human Rights by CHR",
    "Harmonized Gender and Development Guidelines (HGDG) by NEDA for Project Development, Implementation, Monitoring and Evaluation",
    "Women Empowerment through Sustainable Livelihood Activities",
    "All laws regarding gender and development",
    "Financial Education or at least Financial Literacy especially to young individuals",
    "Not a law, but for awareness, SOGIE Educational Education",
    "Team Building",
    "None",
    "Iba pa",
  ];

  const toggleArray = (value) => {
    update(
      "other_training_needs",
      null,
      sd.other_training_needs.includes(value)
        ? sd.other_training_needs.filter((v) => v !== value)
        : [...sd.other_training_needs, value]
    );
  };

  return (
    <div className="max-w-6xl mx-auto bg-white p-8 space-y-8 rounded-xl shadow-lg">
      <Progress />
      <h2 className="text-2xl font-bold text-gray-800 border-b pb-2">
        Social Development
      </h2>

      <div className="space-y-6">
        <h3 className="font-semibold text-gray-700">
          Housing & Work-Life Balance
        </h3>

        <div className="flex flex-col gap-2">
          <span>Do you live in a house/property that your family owns?</span>

          {yesNoOptions.map((opt) => (
            <label key={opt.label} className="flex items-center gap-2">
              <input
                type="radio"
                name="house_property_owned"
                checked={
                  sd.housing_work_life_balance.house_property_owned ===
                  opt.value
                }
                onChange={() =>
                  update(
                    "housing_work_life_balance",
                    "house_property_owned",
                    opt.value
                  )
                }
                className="w-4 h-4 accent-blue-500"
              />
              {opt.label}
            </label>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <span>Does your job hinder role as a mother/father?</span>

          {["Yes", "No", "N/A"].map((opt) => (
            <label key={opt} className="flex items-center gap-2">
              <input
                type="radio"
                name="job_hinder_parent_role"
                checked={
                  sd.housing_work_life_balance.job_hinder_parent_role === opt
                }
                onChange={() =>
                  update(
                    "housing_work_life_balance",
                    "job_hinder_parent_role",
                    opt
                  )
                }
                className="w-4 h-4 accent-blue-500"
              />
              {opt}
            </label>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <span>
            Does being a working mother/father serve as a hindrance to
            advancement of your career?
          </span>
          {["Yes", "No", "N/A"].map((opt) => (
            <label key={opt} className="flex items-center gap-2">
              <input
                type="radio"
                name="working_parent_hindrance_career"
                value={opt}
                checked={
                  sd.housing_work_life_balance
                    .working_parent_hindrance_career === opt
                }
                onChange={() =>
                  update(
                    "housing_work_life_balance",
                    "working_parent_hindrance_career",
                    opt
                  )
                }
                className="w-4 h-4 accent-blue-500"
              />
              {opt}
            </label>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <span>Do you have enough time to rest?</span>
          {yesNoOptions.map((opt) => (
            <label key={opt.label} className="flex items-center gap-2">
              <input
                type="radio"
                name="enough_rest"
                value={opt}
                checked={sd.housing_work_life_balance.enough_rest === opt.value}
                onChange={() =>
                  update("housing_work_life_balance", "enough_rest", opt.value)
                }
                className="w-4 h-4 accent-blue-500"
              />
              {opt.label}
            </label>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <span>Do you manage stress well?</span>
          {yesNoOptions.map((opt) => (
            <label key={opt.label} className="flex items-center gap-2">
              <input
                type="radio"
                name="manage_stress"
                value={opt}
                checked={
                  sd.housing_work_life_balance.manage_stress === opt.value
                }
                onChange={() =>
                  update(
                    "housing_work_life_balance",
                    "manage_stress",
                    opt.value
                  )
                }
                className="w-4 h-4 accent-blue-500"
              />
              {opt.label}
            </label>
          ))}
        </div>

        {sd.housing_work_life_balance.manage_stress === true && (
          <div className="flex flex-col gap-2 pl-4">
            <label>How do you manage stress?</label>
            <input
              type="text"
              className="border rounded px-3 py-2 w-full focus:ring-2 focus:ring-blue-400"
              value={
                sd.housing_work_life_balance.stress_management_methods || ""
              }
              onChange={(e) =>
                update(
                  "housing_work_life_balance",
                  "stress_management_methods",
                  e.target.value
                )
              }
            />
          </div>
        )}

        {/* Q38 */}
        <div className="flex flex-col gap-2">
          <span>
            Do you undertake activities that will enhance your capabilities or
            empower you as an individual?
          </span>
          {yesNoOptions.map((opt) => (
            <label key={opt.label} className="flex items-center gap-2">
              <input
                type="radio"
                name="undertake_empowerment_activities"
                value={opt.value}
                checked={
                  sd.personal_development_empowerment
                    .undertake_empowerment_activities === opt.value
                }
                onChange={() =>
                  update(
                    "personal_development_empowerment",
                    "undertake_empowerment_activities",
                    opt.value
                  )
                }
                className="w-4 h-4 accent-blue-500"
              />
              {opt.label}
            </label>
          ))}
        </div>

        {/* Q39: Conditional */}
        {sd.personal_development_empowerment
          .undertake_empowerment_activities === true && (
          <div className="flex flex-col gap-2 pl-4">
            <label>Please give examples of these activities</label>
            <input
              type="text"
              className="border rounded px-3 py-2 w-full focus:ring-2 focus:ring-blue-400"
              value={
                sd.personal_development_empowerment
                  .empowerment_activities_examples || ""
              }
              onChange={(e) =>
                update(
                  "personal_development_empowerment",
                  "empowerment_activities_examples",
                  e.target.value
                )
              }
            />
          </div>
        )}

        <div className="flex flex-col gap-2">
          <span>
            Does your home environment provide you with opportunities to grow
            and reach your maximum potential as a person?
          </span>
          {yesNoOptions.map((opt) => (
            <label key={opt.label} className="flex items-center gap-2">
              <input
                type="radio"
                name="home_environment_growth"
                value={opt}
                checked={
                  sd.personal_development_empowerment
                    .home_environment_growth === opt.value
                }
                onChange={() =>
                  update(
                    "personal_development_empowerment",
                    "home_environment_growth",
                    opt.value
                  )
                }
                className="w-4 h-4 accent-blue-500"
              />
              {opt.label}
            </label>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <span>How about your community environment?</span>
          {yesNoOptions.map((opt) => (
            <label key={opt.label} className="flex items-center gap-2">
              <input
                type="radio"
                name="community_environment_growth"
                value={opt}
                checked={
                  sd.personal_development_empowerment
                    .community_environment_growth === opt.value
                }
                onChange={() =>
                  update(
                    "personal_development_empowerment",
                    "community_environment_growth",
                    opt.value
                  )
                }
                className="w-4 h-4 accent-blue-500"
              />
              {opt.label}
            </label>
          ))}
        </div>
        {/*sd.personal_development_empowerment.home_environment_growth ===
            false ||*/}
        {sd.personal_development_empowerment.community_environment_growth ===
          false && (
          <div className="flex flex-col gap-2 pl-4">
            <label>If no, cite reason</label>
            <input
              type="text"
              className="border rounded px-3 py-2 w-full focus:ring-2 focus:ring-blue-400"
              value={
                sd.personal_development_empowerment.environment_growth_reason ||
                ""
              }
              onChange={(e) =>
                update(
                  "personal_development_empowerment",
                  "environment_growth_reason",
                  e.target.value
                )
              }
            />
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-gray-700">
          Legal Awareness & Observance
        </h3>
        {["awareness", "observed_in_university_or_community"].map((section) => (
          <div key={section} className="overflow-x-auto">
            <h4 className="font-medium text-gray-600 mb-2">
              {section.replace(/_/g, " ")}
            </h4>
            <table className="table-auto border-collapse border border-gray-300 w-full">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-3 py-2 text-left">
                    Law
                  </th>
                  {yesNoNotSure.map((opt) => (
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
                {RA_fields.map((ra) => (
                  <tr key={ra}>
                    <td className="border border-gray-300 px-3 py-2">{ra}</td>
                    {yesNoNotSure.map((opt) => (
                      <td
                        key={opt}
                        className="border border-gray-300 px-3 py-2 text-center"
                      >
                        <input
                          type="radio"
                          name={`${section}-${ra}`}
                          value={opt}
                          checked={sd[section][ra] === opt}
                          onChange={() => update(section, ra, opt)}
                          className="w-4 h-4 accent-blue-500 mx-auto"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* Other Training Needs */}
      <div className="space-y-2">
        <h3 className="font-semibold text-gray-700">Other Training Needs</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {other_training_options.map((opt) => (
            <label key={opt} className="flex items-center gap-2">
              <input
                type="checkbox"
                className="w-4 h-4 accent-blue-500"
                checked={sd.other_training_needs.includes(opt)}
                onChange={() => toggleArray(opt)}
              />
              {opt}
            </label>
          ))}
        </div>
        {sd.other_training_needs.includes("Iba pa") && (
          <input
            className="border rounded px-3 py-2 w-full focus:ring-2 focus:ring-blue-400 mt-2"
            placeholder="Specify Other Training Needs"
            value={sd.other_training_needs_specify || ""}
            onChange={(e) =>
              update("other_training_needs_specify", null, e.target.value)
            }
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <button
          onClick={() => dispatch(prevStep())}
          className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition"
        >
          Previous
        </button>
        <button
          onClick={handleNext}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Next
        </button>
      </div>
    </div>
  );
}
