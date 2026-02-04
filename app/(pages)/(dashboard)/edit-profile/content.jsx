"use client";

import { useState, useEffect } from "react";
import { Button, Toast } from "flowbite-react";
import { FaSave } from "react-icons/fa";

export default function EditProfilePageContent({ profile }) {
  const [formData, setFormData] = useState(profile);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastColor, setToastColor] = useState("success");
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [originalData, setOriginalData] = useState(profile);
  const [errors, setErrors] = useState({});

  const isChanged = JSON.stringify(formData) !== JSON.stringify(originalData);
  const currentStatus = formData.currentStatus;

  const handleChange = (section, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));

    setErrors((prev) => ({
      ...prev,
      [`${section}.${field}`]: "",
    }));
  };

  const handleNestedChange = (section, nestedField, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [nestedField]: {
          ...prev[section][nestedField],
          [field]: value,
        },
      },
    }));

    setErrors((prev) => ({
      ...prev,
      [`${section}.${nestedField}.${field}`]: "",
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.personal_information.first_name?.trim())
      newErrors["personal_information.first_name"] = "First name is required.";

    if (!formData.personal_information.last_name?.trim())
      newErrors["personal_information.last_name"] = "Last name is required.";

    if (!formData.personal_information.sex?.trim())
      newErrors["personal_information.sex"] = "Sex is required.";

    if (!formData.personal_information.gender_preference?.trim())
      newErrors["personal_information.gender_preference"] =
        "Gender preference is required.";

    if (!formData.personal_information.age_bracket?.trim())
      newErrors["personal_information.age_bracket"] =
        "Age bracket is required.";

    if (!formData.personal_information.civil_status?.trim())
      newErrors["personal_information.civil_status"] =
        "Civil status is required.";

    if (!formData.personal_information.religion?.trim())
      newErrors["personal_information.religion"] = "Religion is required.";

    if (!formData.personal_information.college_office?.trim())
      newErrors["personal_information.college_office"] =
        "College/Office is required.";

    if (!formData.personal_information.employment_status?.trim())
      newErrors["personal_information.employment_status"] =
        "Employment status is required.";

    if (!formData.personal_information.employment_appointment_status?.trim())
      newErrors["personal_information.employment_appointment_status"] =
        "Employment appointment status is required.";

    if (formData.personal_information.solo_parent == null)
      newErrors["personal_information.solo_parent"] =
        "Solo parent status is required.";

    if (!formData.personal_information.total_annual_family_income?.trim())
      newErrors["personal_information.total_annual_family_income"] =
        "Total annual family income is required.";

    if (
      !formData.personal_information.health_problems ||
      formData.personal_information.health_problems.length === 0
    )
      newErrors["personal_information.health_problems"] =
        "Health problems field is required.";

    // Economic & Financial Role validation
    if (formData.economic_financial_role.breadwinner == null)
      newErrors["economic_financial_role.breadwinner"] =
        "Breadwinner status is required.";

    if (
      !formData.economic_financial_role.income_sources ||
      formData.economic_financial_role.income_sources.length === 0
    )
      newErrors["economic_financial_role.income_sources"] =
        "At least one income source is required.";

    if (formData.economic_financial_role.cultural_barrier_work == null)
      newErrors["economic_financial_role.cultural_barrier_work"] =
        "Cultural barrier work field is required.";

    if (formData.economic_financial_role.manage_financial_resources == null)
      newErrors["economic_financial_role.manage_financial_resources"] =
        "Manage financial resources field is required.";

    if (
      formData.economic_financial_role.participate_financial_decisions == null
    )
      newErrors["economic_financial_role.participate_financial_decisions"] =
        "Participate in financial decisions field is required.";

    // Reproductive & Family Role validation
    if (!formData.reproductive_family_role.childbearing_stage?.trim())
      newErrors["reproductive_family_role.childbearing_stage"] =
        "Childbearing stage is required.";

    if (!formData.reproductive_family_role.child_rearing_stage?.trim())
      newErrors["reproductive_family_role.child_rearing_stage"] =
        "Child rearing stage is required.";

    if (!formData.reproductive_family_role.family_planning?.trim())
      newErrors["reproductive_family_role.family_planning"] =
        "Family planning field is required.";

    if (!formData.reproductive_family_role.spouse_share_childcare?.trim())
      newErrors["reproductive_family_role.spouse_share_childcare"] =
        "Spouse share childcare field is required.";

    if (!formData.reproductive_family_role.attend_school_needs?.trim())
      newErrors["reproductive_family_role.attend_school_needs"] =
        "Attend school needs field is required.";

    if (!formData.reproductive_family_role.childcare_responsibility?.trim())
      newErrors["reproductive_family_role.childcare_responsibility"] =
        "Childcare responsibility is required.";

    // Household Managing Role
    if (!formData.household_managing_role.spouse_participate_household?.trim())
      newErrors["household_managing_role.spouse_participate_household"] =
        "Spouse participation is required.";

    if (formData.household_managing_role.family_participate_household == null)
      newErrors["household_managing_role.family_participate_household"] =
        "Family participation is required.";

    if (formData.household_managing_role.decision_manage_household == null)
      newErrors["household_managing_role.decision_manage_household"] =
        "Decision manage household is required.";

    if (
      !formData.household_managing_role.household_decision_explanation?.trim()
    )
      newErrors["household_managing_role.household_decision_explanation"] =
        "Household decision explanation is required.";

    // Community Involvement
    if (formData.community_involvement.community_involvement == null)
      newErrors["community_involvement.community_involvement"] =
        "Community involvement is required.";

    if (formData.community_involvement.exercise_right_to_vote == null)
      newErrors["community_involvement.exercise_right_to_vote"] =
        "Exercise right to vote is required.";

    if (!formData.community_involvement.spouse_different_religion?.trim())
      newErrors["community_involvement.spouse_different_religion"] =
        "Spouse different religion field is required.";

    if (!formData.community_involvement.spouse_cultural_difference?.trim())
      newErrors["community_involvement.spouse_cultural_difference"] =
        "Spouse cultural difference field is required.";

    // Housing Work-Life Balance
    if (
      formData.social_development.housing_work_life_balance
        .house_property_owned == null
    )
      newErrors[
        "social_development.housing_work_life_balance.house_property_owned"
      ] = "House property owned is required.";

    if (
      !formData.social_development.housing_work_life_balance.job_hinder_parent_role?.trim()
    )
      newErrors[
        "social_development.housing_work_life_balance.job_hinder_parent_role"
      ] = "Job hinder parent role is required.";

    if (
      !formData.social_development.housing_work_life_balance.working_parent_hindrance_career?.trim()
    )
      newErrors[
        "social_development.housing_work_life_balance.working_parent_hindrance_career"
      ] = "Working parent hindrance career is required.";

    if (
      formData.social_development.housing_work_life_balance.enough_rest == null
    )
      newErrors["social_development.housing_work_life_balance.enough_rest"] =
        "Enough rest is required.";

    if (
      formData.social_development.housing_work_life_balance.manage_stress ==
      null
    )
      newErrors["social_development.housing_work_life_balance.manage_stress"] =
        "Manage stress field is required.";

    Object.entries(
      formData.social_development.personal_development_empowerment
    ).forEach(([key, value]) => {
      if (value == null)
        newErrors[
          `social_development.personal_development_empowerment.${key}`
        ] = `${key.replace(/_/g, " ")} is required.`;
    });

    Object.entries(formData.social_development.awareness).forEach(
      ([key, value]) => {
        if (!value?.trim())
          newErrors[
            `social_development.awareness.${key}`
          ] = `${key} awareness is required.`;
      }
    );

    Object.entries(
      formData.social_development.observed_in_university_or_community
    ).forEach(([key, value]) => {
      if (!value?.trim())
        newErrors[
          `social_development.observed_in_university_or_community.${key}`
        ] = `${key} observation is required.`;
    });

    if (!formData.social_development.other_training_needs?.length)
      newErrors["social_development.other_training_needs"] =
        "Please specify other training needs or 'None'.";

    Object.entries(formData.environmental_climate).forEach(([key, value]) => {
      if (value == null || value === "")
        newErrors[`environmental_climate.${key}`] = `${key.replace(
          /_/g,
          " "
        )} is required.`;
    });

    Object.entries(formData.gender_responsive).forEach(([key, value]) => {
      if (value == null || value === "")
        newErrors[`gender_responsive.${key}`] = `${key.replace(
          /_/g,
          " "
        )} is required.`;
    });

    Object.entries(formData.security_peace.gender_based_experiences).forEach(
      ([key, value]) => {
        if (!value?.trim())
          newErrors[
            `security_peace.gender_based_experiences.${key}`
          ] = `${key.replace(/_/g, " ")} is required.`;
      }
    );

    Object.entries(formData.security_peace.other_experiences).forEach(
      ([key, value]) => {
        if (!value?.trim())
          newErrors[`security_peace.other_experiences.${key}`] = `${key.replace(
            /_/g,
            " "
          )} is required.`;
      }
    );

    Object.entries(formData.security_peace.vaw_services_awareness).forEach(
      ([key, value]) => {
        if (!value?.trim())
          newErrors[
            `security_peace.vaw_services_awareness.${key}`
          ] = `${key.replace(/_/g, " ")} is required.`;
      }
    );

    return newErrors;
  };

  const handleSave = async () => {
    const validationErrors = validateForm();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setShowUpdateModal(false);
      setToastMessage("Please fill in all required fields.");
      setToastColor("failure");
      setShowToast(true);
      return;
    }
    try {
      const userId = formData._id;
      console.log("UserId", userId);
      if (!userId) throw new Error("User ID not found");

      setIsUpdating(true);

      const response = await fetch(`/api/profile/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to update profile");

      const data = await response.json();
      console.log("Updated profile:", data.data);
      setFormData(data.data);
      setOriginalData(data.data);
      setShowUpdateModal(false);

      setToastMessage("Profile updated successfully!");
      setToastColor("success");
      setShowToast(true);
    } catch (error) {
      console.error("Error updating profile:", error);

      setShowUpdateModal(false);
      setToastMessage("Failed to update profile. Please try again.");
      setToastColor("failure");

      setShowToast(true);
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  return (
    <div className="min-h-screen flex flex-col pt-4 pb-10 sm:p-4 bg-gray-50">
      {showToast && (
        <div className="fixed top-5 right-5 z-50">
          <Toast color={toastColor} onDismiss={() => setShowToast(false)}>
            <div className="ml-3 text-sm font-normal">{toastMessage}</div>
          </Toast>
        </div>
      )}

      <div className="pb-8">
        <h1 className="text-3xl sm:text-4xl font-bold">Edit Profile</h1>
        <p className="text-gray-400">
          Update your personal, gender data, affiliation, and contact
          information
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="shadow-sm bg-white px-6 py-6 rounded-md">
          <h1 className="text-xl font-medium pb-4">Personal Information</h1>
          <div className="grid grid-cols-2 gap-2 space-y-1">
            <div>
              <label className="text-gray-500 font-medium">First Name</label>
              <input
                className="border border-gray-300 rounded p-2 w-full"
                value={formData.personal_information.first_name || ""}
                onChange={(e) =>
                  handleChange(
                    "personal_information",
                    "first_name",
                    e.target.value
                  )
                }
              />
              {errors["personal_information.first_name"] && (
                <p className="text-red-500 text-xs mt-1">
                  {errors["personal_information.first_name"]}
                </p>
              )}
            </div>

            <div>
              <label className="text-gray-500 font-medium">Last Name</label>
              <input
                className="border border-gray-300 rounded p-2 w-full"
                value={formData.personal_information.last_name || ""}
                onChange={(e) =>
                  handleChange(
                    "personal_information",
                    "last_name",
                    e.target.value
                  )
                }
              />
              {errors["personal_information.last_name"] && (
                <p className="text-red-500 text-xs mt-1">
                  {errors["personal_information.last_name"]}
                </p>
              )}
            </div>

            {/* Sex */}
            <div>
              <label className="text-gray-500 font-medium">Sex</label>
              <select
                className="border border-gray-300 p-2 rounded w-full"
                value={formData.personal_information.sex || ""}
                onChange={(e) =>
                  handleChange("personal_information", "sex", e.target.value)
                }
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>

            {/* Gender Preference */}
            <div>
              <label className="text-gray-500 font-medium">
                Gender Preference
              </label>
              <select
                className="border border-gray-300 p-2 rounded w-full"
                value={formData.personal_information.gender_preference || ""}
                onChange={(e) =>
                  handleChange(
                    "personal_information",
                    "gender_preference",
                    e.target.value
                  )
                }
              >
                <option value="Heterosexual Male">Heterosexual Male</option>
                <option value="Heterosexual Female">Heterosexual Female</option>
                <option value="Gay">Gay</option>
                <option value="Lesbian">Lesbian</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>

            <div>
              <label className="text-gray-500 font-medium">Age Bracket</label>

              <select
                className="border border-gray-300 rounded p-2 w-full"
                value={formData.personal_information.age_bracket || ""}
                onChange={(e) =>
                  handleChange(
                    "personal_information",
                    "age_bracket",
                    e.target.value
                  )
                }
              >
                <option value="18-30">18-30</option>
                <option value="31-40">31-40</option>
                <option value="41-50">41-50</option>
                <option value="51-60">51-60</option>
                <option value="61 and above">61 and above</option>
              </select>
            </div>

            <div>
              <label className="text-gray-500 font-medium">Civil Status</label>
              <select
                className="border border-gray-300 p-2 rounded w-full"
                value={formData.personal_information.civil_status || ""}
                onChange={(e) =>
                  handleChange(
                    "personal_information",
                    "civil_status",
                    e.target.value
                  )
                }
              >
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Widowed">Widowed</option>
                <option value="Separated">Separated</option>
                <option value="Divorced">Divorced</option>
              </select>
            </div>

            <div>
              <label className="text-gray-500 font-medium">Religion</label>
              <input
                className="border border-gray-300 rounded p-2 w-full"
                value={formData.personal_information.religion || ""}
                onChange={(e) =>
                  handleChange(
                    "personal_information",
                    "religion",
                    e.target.value
                  )
                }
              />
            </div>

            <div>
              <label className="text-gray-500 font-medium">
                College Office
              </label>

              <select
                className="border border-gray-300 rounded p-2 w-full"
                value={formData.personal_information.college_office || ""}
                onChange={(e) =>
                  handleChange(
                    "personal_information",
                    "college_office",
                    e.target.value
                  )
                }
              >
                <option>Graduate School</option>
                <option>College of Agriculture</option>
                <option>College of Allied Health Sciences</option>
                <option>College of Arts & Social Sciences</option>
                <option>College of Business & Accountancy</option>
                <option>College of Criminal Justice Education</option>
                <option>College of Education</option>
                <option>College of Engineering</option>
                <option>College of Environmental Studies</option>
                <option>College of Fisheries & Aquatic Sciences</option>
                <option>College of Governance</option>
                <option>College of Industrial Technology</option>
                <option>College of Information & Computing Sciences</option>
                <option>
                  Offices under the Office of the University President
                </option>
                <option>
                  Offices under the Office of the Vice President for Academic
                  Affairs
                </option>
                <option>
                  Offices under the Office of the Vice President for
                  Administration and Finance
                </option>
                <option>
                  Offices under the Office of the Vice President for Research
                  and Extension
                </option>
                <option>
                  Offices under the Office of the Vice President for Student
                  Affairs and Services
                </option>
              </select>
            </div>

            <div>
              <label className="text-gray-500 font-medium">
                Employment Status
              </label>

              <select
                className="border border-gray-300 rounded p-2 w-full"
                value={formData.personal_information.employment_status || ""}
                onChange={(e) =>
                  handleChange(
                    "personal_information",
                    "employment_status",
                    e.target.value
                  )
                }
              >
                <option>Faculty</option>
                <option>Non-teaching Personnel</option>
              </select>
            </div>

            <div>
              <label className="text-gray-500 font-medium">
                Employment Appointment Status
              </label>
              <input
                className="border border-gray-300 rounded p-2 w-full"
                value={
                  formData.personal_information.employment_appointment_status ||
                  ""
                }
                onChange={(e) =>
                  handleChange(
                    "personal_information",
                    "employment_appointment_status",
                    e.target.value
                  )
                }
              />
            </div>

            <div>
              <label className="text-gray-500 font-medium">Solo Parent</label>
              <select
                className="border border-gray-300 p-2 rounded w-full"
                value={String(formData.personal_information.solo_parent)}
                onChange={(e) =>
                  handleChange(
                    "personal_information",
                    "solo_parent",
                    e.target.value === "true"
                  )
                }
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>

            <div>
              <label className="text-gray-500 font-medium">
                Total Annual Family Income
              </label>

              <select
                className="border border-gray-300 rounded p-2 w-full"
                value={
                  formData.personal_information.total_annual_family_income || ""
                }
                onChange={(e) =>
                  handleChange(
                    "personal_information",
                    "total_annual_family_income",
                    e.target.value
                  )
                }
              >
                <option>₱1,000.00 - ₱50,000.00</option>
                <option>₱51,000.00 - ₱100,000.00</option>
                <option>₱101,000.00 - ₱200,000.00</option>
                <option>₱201,000.00 - ₱300,000.00</option>
                <option>₱301,000.00 - ₱400,000.00</option>
                <option>₱401,000.00 - ₱500,000.00</option>
                <option>₱501,000.00 and above</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="text-gray-500 font-medium">
                Health Problems
              </label>
              <input
                className="border border-gray-300 rounded p-2 w-full"
                value={
                  formData.personal_information.health_problems?.join(", ") ||
                  ""
                }
                onChange={(e) =>
                  handleChange(
                    "personal_information",
                    "health_problems",
                    e.target.value.split(",").map((v) => v.trim())
                  )
                }
                placeholder="Separate multiple health problems with commas"
              />
            </div>
          </div>
        </div>

        <div className="shadow-sm bg-white px-6 py-6 rounded-md">
          <h1 className="text-xl font-medium pb-4">
            Economic & Financial Role
          </h1>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-gray-500 font-medium">Breadwinner</label>
              <select
                className="border border-gray-300 p-2 rounded w-full"
                value={formData.economic_financial_role.breadwinner}
                onChange={(e) =>
                  handleChange(
                    "economic_financial_role",
                    "breadwinner",
                    e.target.value === "true"
                  )
                }
              >
                <option value={true}>Yes</option>
                <option value={false}>No</option>
              </select>
            </div>

            <div>
              <label className="text-gray-500 font-medium">
                Income Sources
              </label>
              <input
                type="text"
                className="border border-gray-300 p-2 rounded w-full"
                value={formData.economic_financial_role.income_sources.join(
                  ", "
                )}
                onChange={(e) =>
                  handleChange(
                    "economic_financial_role",
                    "income_sources",
                    e.target.value.split(",").map((s) => s.trim())
                  )
                }
                placeholder="Comma separated, e.g., Salary, Passive Income"
              />
            </div>

            <div>
              <label className="text-gray-500 font-medium">
                Cultural Barrier Work
              </label>
              <select
                className="border border-gray-300 p-2 rounded w-full"
                value={formData.economic_financial_role.cultural_barrier_work}
                onChange={(e) =>
                  handleChange(
                    "economic_financial_role",
                    "cultural_barrier_work",
                    e.target.value === "true"
                  )
                }
              >
                <option value={true}>Yes</option>
                <option value={false}>No</option>
              </select>
            </div>

            <div>
              <label className="text-gray-500 font-medium">
                Manage Financial Resources
              </label>
              <select
                className="border border-gray-300 p-2 rounded w-full"
                value={
                  formData.economic_financial_role.manage_financial_resources
                }
                onChange={(e) =>
                  handleChange(
                    "economic_financial_role",
                    "manage_financial_resources",
                    e.target.value === "true"
                  )
                }
              >
                <option value={true}>Yes</option>
                <option value={false}>No</option>
              </select>
            </div>

            <div>
              <label className="text-gray-500 font-medium">
                Participate in Financial Decisions
              </label>
              <select
                className="border border-gray-300 p-2 rounded w-full"
                value={
                  formData.economic_financial_role
                    .participate_financial_decisions
                }
                onChange={(e) =>
                  handleChange(
                    "economic_financial_role",
                    "participate_financial_decisions",
                    e.target.value === "true"
                  )
                }
              >
                <option value={true}>Yes</option>
                <option value={false}>No</option>
              </select>
            </div>
          </div>
        </div>

        {/*Reproductive */}

        <div className="shadow-sm bg-white px-6 py-6 rounded-md">
          <h1 className="text-xl font-medium pb-4">
            Reproductive & Family Role
          </h1>

          <div className="grid grid-cols-2 gap-4">
            {/* Childbearing Stage */}
            <div>
              <label className="text-gray-500 font-medium">
                Childbearing Stage
              </label>
              <select
                className="border border-gray-300 p-2 rounded w-full"
                value={
                  formData.reproductive_family_role.childbearing_stage || ""
                }
                onChange={(e) =>
                  handleChange(
                    "reproductive_family_role",
                    "childbearing_stage",
                    e.target.value
                  )
                }
              >
                <option value="">Select</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="N/A">N/A</option>
              </select>
              {errors["reproductive_family_role.childbearing_stage"] && (
                <p className="text-red-500 text-xs mt-1">
                  {errors["reproductive_family_role.childbearing_stage"]}
                </p>
              )}
            </div>

            {/* Child Rearing Stage */}
            <div>
              <label className="text-gray-500 font-medium">
                Child Rearing Stage
              </label>
              <select
                className="border border-gray-300 p-2 rounded w-full"
                value={
                  formData.reproductive_family_role.child_rearing_stage || ""
                }
                onChange={(e) =>
                  handleChange(
                    "reproductive_family_role",
                    "child_rearing_stage",
                    e.target.value
                  )
                }
              >
                <option value="">Select</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="N/A">N/A</option>
              </select>
              {errors["reproductive_family_role.child_rearing_stage"] && (
                <p className="text-red-500 text-xs mt-1">
                  {errors["reproductive_family_role.child_rearing_stage"]}
                </p>
              )}
            </div>

            {/* Family Planning */}
            <div>
              <label className="text-gray-500 font-medium">
                Family Planning
              </label>
              <select
                className="border border-gray-300 p-2 rounded w-full"
                value={formData.reproductive_family_role.family_planning || ""}
                onChange={(e) =>
                  handleChange(
                    "reproductive_family_role",
                    "family_planning",
                    e.target.value
                  )
                }
              >
                <option value="">Select</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="N/A">N/A</option>
              </select>
              {errors["reproductive_family_role.family_planning"] && (
                <p className="text-red-500 text-xs mt-1">
                  {errors["reproductive_family_role.family_planning"]}
                </p>
              )}
            </div>

            {/* Spouse Share Childcare */}
            <div>
              <label className="text-gray-500 font-medium">
                Spouse Share Childcare
              </label>
              <select
                className="border border-gray-300 p-2 rounded w-full"
                value={
                  formData.reproductive_family_role.spouse_share_childcare || ""
                }
                onChange={(e) =>
                  handleChange(
                    "reproductive_family_role",
                    "spouse_share_childcare",
                    e.target.value
                  )
                }
              >
                <option value="">Select</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="N/A">N/A</option>
              </select>
              {errors["reproductive_family_role.spouse_share_childcare"] && (
                <p className="text-red-500 text-xs mt-1">
                  {errors["reproductive_family_role.spouse_share_childcare"]}
                </p>
              )}
            </div>

            <div>
              <label className="text-gray-500 font-medium">
                Attend School Needs
              </label>
              <select
                className="border border-gray-300 p-2 rounded w-full"
                value={
                  formData.reproductive_family_role.attend_school_needs || ""
                }
                onChange={(e) =>
                  handleChange(
                    "reproductive_family_role",
                    "attend_school_needs",
                    e.target.value
                  )
                }
              >
                <option value="">Select</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="N/A">N/A</option>
              </select>
              {errors["reproductive_family_role.attend_school_needs"] && (
                <p className="text-red-500 text-xs mt-1">
                  {errors["reproductive_family_role.attend_school_needs"]}
                </p>
              )}
            </div>

            <div>
              <label className="text-gray-500 font-medium">
                Childcare Responsibility
              </label>
              <input
                className="border border-gray-300 p-2 rounded w-full"
                value={
                  formData.reproductive_family_role.childcare_responsibility ||
                  ""
                }
                onChange={(e) =>
                  handleChange(
                    "reproductive_family_role",
                    "childcare_responsibility",
                    e.target.value
                  )
                }
              />

              {errors["reproductive_family_role.childcare_responsibility"] && (
                <p className="text-red-500 text-xs mt-1">
                  {errors["reproductive_family_role.childcare_responsibility"]}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="shadow-sm bg-white px-6 py-6 rounded-md">
          <h1 className="text-xl font-medium pb-4">Household Managing Role</h1>

          <div className="grid grid-cols-2 gap-4">
            {/* Spouse Participate Household */}
            <div>
              <label className="text-gray-500 font-medium">
                Spouse Participate Household
              </label>
              <select
                className="border border-gray-300 p-2 rounded w-full"
                value={
                  formData.household_managing_role
                    .spouse_participate_household || ""
                }
                onChange={(e) =>
                  handleChange(
                    "household_managing_role",
                    "spouse_participate_household",
                    e.target.value
                  )
                }
              >
                <option value="">Select</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="N/A">N/A</option>
              </select>
              {errors[
                "household_managing_role.spouse_participate_household"
              ] && (
                <p className="text-red-500 text-xs mt-1">
                  {
                    errors[
                      "household_managing_role.spouse_participate_household"
                    ]
                  }
                </p>
              )}
            </div>

            <div>
              <label className="text-gray-500 font-medium">
                Family Participate Household
              </label>
              <select
                className="border border-gray-300 p-2 rounded w-full"
                value={String(
                  formData.household_managing_role.family_participate_household
                )}
                onChange={(e) =>
                  handleChange(
                    "household_managing_role",
                    "family_participate_household",
                    e.target.value === "true"
                  )
                }
              >
                <option value="">Select</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
              {errors[
                "household_managing_role.family_participate_household"
              ] && (
                <p className="text-red-500 text-xs mt-1">
                  {
                    errors[
                      "household_managing_role.family_participate_household"
                    ]
                  }
                </p>
              )}
            </div>

            {/* Decision Manage Household */}
            <div>
              <label className="text-gray-500 font-medium">
                Decision Manage Household
              </label>
              <select
                className="border border-gray-300 p-2 rounded w-full"
                value={String(
                  formData.household_managing_role.decision_manage_household
                )}
                onChange={(e) =>
                  handleChange(
                    "household_managing_role",
                    "decision_manage_household",
                    e.target.value === "true"
                  )
                }
              >
                <option value="">Select</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
              {errors["household_managing_role.decision_manage_household"] && (
                <p className="text-red-500 text-xs mt-1">
                  {errors["household_managing_role.decision_manage_household"]}
                </p>
              )}
            </div>

            <div>
              <label className="text-gray-500 font-medium">
                Household Decision Explanation
              </label>
              <input
                className="border border-gray-300 p-2 rounded w-full"
                value={
                  formData.household_managing_role
                    .household_decision_explanation || ""
                }
                onChange={(e) =>
                  handleChange(
                    "household_managing_role",
                    "household_decision_explanation",
                    e.target.value
                  )
                }
              />
              {errors[
                "household_managing_role.household_decision_explanation"
              ] && (
                <p className="text-red-500 text-xs mt-1">
                  {
                    errors[
                      "household_managing_role.household_decision_explanation"
                    ]
                  }
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="shadow-sm bg-white px-6 py-6 rounded-md mt-6">
          <h1 className="text-xl font-medium pb-4">Community Involvement</h1>

          <div className="grid grid-cols-2 gap-4">
            {/* Community Involvement */}
            <div>
              <label className="text-gray-500 font-medium">
                Community Involvement
              </label>
              <select
                className="border border-gray-300 p-2 rounded w-full"
                value={String(
                  formData.community_involvement.community_involvement
                )}
                onChange={(e) =>
                  handleChange(
                    "community_involvement",
                    "community_involvement",
                    e.target.value === "true"
                  )
                }
              >
                <option value="">Select</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
              {errors["community_involvement.community_involvement"] && (
                <p className="text-red-500 text-xs mt-1">
                  {errors["community_involvement.community_involvement"]}
                </p>
              )}
            </div>

            {/* Exercise Right To Vote */}
            <div>
              <label className="text-gray-500 font-medium">
                Exercise Right To Vote
              </label>
              <select
                className="border border-gray-300 p-2 rounded w-full"
                value={String(
                  formData.community_involvement.exercise_right_to_vote
                )}
                onChange={(e) =>
                  handleChange(
                    "community_involvement",
                    "exercise_right_to_vote",
                    e.target.value === "true"
                  )
                }
              >
                <option value="">Select</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
              {errors["community_involvement.exercise_right_to_vote"] && (
                <p className="text-red-500 text-xs mt-1">
                  {errors["community_involvement.exercise_right_to_vote"]}
                </p>
              )}
            </div>

            {/* Spouse Different Religion */}
            <div>
              <label className="text-gray-500 font-medium">
                Spouse Different Religion
              </label>
              <select
                className="border border-gray-300 p-2 rounded w-full"
                value={
                  formData.community_involvement.spouse_different_religion || ""
                }
                onChange={(e) =>
                  handleChange(
                    "community_involvement",
                    "spouse_different_religion",
                    e.target.value
                  )
                }
              >
                <option value="">Select</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="N/A">N/A</option>
              </select>
              {errors["community_involvement.spouse_different_religion"] && (
                <p className="text-red-500 text-xs mt-1">
                  {errors["community_involvement.spouse_different_religion"]}
                </p>
              )}
            </div>

            {/* Spouse Cultural Difference */}
            <div>
              <label className="text-gray-500 font-medium">
                Spouse Cultural Difference
              </label>
              <select
                className="border border-gray-300 p-2 rounded w-full"
                value={
                  formData.community_involvement.spouse_cultural_difference ||
                  ""
                }
                onChange={(e) =>
                  handleChange(
                    "community_involvement",
                    "spouse_cultural_difference",
                    e.target.value
                  )
                }
              >
                <option value="">Select</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="N/A">N/A</option>
              </select>
              {errors["community_involvement.spouse_cultural_difference"] && (
                <p className="text-red-500 text-xs mt-1">
                  {errors["community_involvement.spouse_cultural_difference"]}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="shadow-sm bg-white px-6 py-6 rounded-md mt-6">
          <h1 className="text-xl font-medium pb-4">
            Social Development - Housing & Work-Life Balance
          </h1>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-gray-500 font-medium">
                House Property Owned
              </label>
              <select
                className="border border-gray-300 p-2 rounded w-full"
                value={String(
                  formData.social_development.housing_work_life_balance
                    .house_property_owned ?? ""
                )}
                onChange={(e) =>
                  handleNestedChange(
                    "social_development",
                    "housing_work_life_balance",
                    "house_property_owned",
                    e.target.value === "true"
                  )
                }
              >
                <option value="">Select</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>

            {/* Job Hinder Parent Role */}
            <div>
              <label className="text-gray-500 font-medium">
                Job Hinder Parent Role
              </label>
              <select
                className="border border-gray-300 p-2 rounded w-full"
                value={
                  formData.social_development.housing_work_life_balance
                    .job_hinder_parent_role ?? ""
                }
                onChange={(e) =>
                  handleNestedChange(
                    "social_development",
                    "housing_work_life_balance",
                    "job_hinder_parent_role",
                    e.target.value
                  )
                }
              >
                <option value="">Select</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="N/A">N/A</option>
              </select>
            </div>

            {/* Working Parent Hindrance Career */}
            <div>
              <label className="text-gray-500 font-medium">
                Working Parent Hindrance Career
              </label>
              <select
                className="border border-gray-300 p-2 rounded w-full"
                value={
                  formData.social_development.housing_work_life_balance
                    .working_parent_hindrance_career ?? ""
                }
                onChange={(e) =>
                  handleNestedChange(
                    "social_development",
                    "housing_work_life_balance",
                    "working_parent_hindrance_career",
                    e.target.value
                  )
                }
              >
                <option value="">Select</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="N/A">N/A</option>
              </select>
            </div>

            {/* Enough Rest */}
            <div>
              <label className="text-gray-500 font-medium">Enough Rest</label>
              <select
                className="border border-gray-300 p-2 rounded w-full"
                value={String(
                  formData.social_development.housing_work_life_balance
                    .enough_rest ?? ""
                )}
                onChange={(e) =>
                  handleNestedChange(
                    "social_development",
                    "housing_work_life_balance",
                    "enough_rest",
                    e.target.value === "true"
                  )
                }
              >
                <option value="">Select</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>

            <div>
              <label className="text-gray-500 font-medium">Manage Stress</label>
              <select
                className="border border-gray-300 p-2 rounded w-full"
                value={String(
                  formData.social_development.housing_work_life_balance
                    .manage_stress ?? ""
                )}
                onChange={(e) =>
                  handleNestedChange(
                    "social_development",
                    "housing_work_life_balance",
                    "manage_stress",
                    e.target.value === "true"
                  )
                }
              >
                <option value="">Select</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
            {formData.social_development.housing_work_life_balance
              .manage_stress && (
              <div>
                <label className="text-gray-500 font-medium">
                  Stress Management Methods
                </label>
                <input
                  className="border border-gray-300 p-2 rounded w-full"
                  value={
                    formData.social_development.housing_work_life_balance
                      .stress_management_methods || ""
                  }
                  onChange={(e) =>
                    handleNestedChange(
                      "social_development",
                      "housing_work_life_balance",
                      "stress_management_methods",
                      e.target.value
                    )
                  }
                  placeholder="Describe your stress management methods"
                />
              </div>
            )}
          </div>

          <h1 className="text-xl font-medium pb-4 mt-6">
            Social Development - Personal Development & Empowerment
          </h1>

          <div className="grid grid-cols-2 gap-4">
            {/* Undertake Empowerment Activities */}
            <div>
              <label className="text-gray-500 font-medium">
                Undertake Empowerment Activities
              </label>
              <select
                className="border border-gray-300 p-2 rounded w-full"
                value={String(
                  formData.social_development.personal_development_empowerment
                    .undertake_empowerment_activities ?? ""
                )}
                onChange={(e) =>
                  handleNestedChange(
                    "social_development",
                    "personal_development_empowerment",
                    "undertake_empowerment_activities",
                    e.target.value === "true"
                  )
                }
              >
                <option value="">Select</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>

            {/* Home Environment Growth */}
            <div>
              <label className="text-gray-500 font-medium">
                Home Environment Growth
              </label>
              <select
                className="border border-gray-300 p-2 rounded w-full"
                value={String(
                  formData.social_development.personal_development_empowerment
                    .home_environment_growth ?? ""
                )}
                onChange={(e) =>
                  handleNestedChange(
                    "social_development",
                    "personal_development_empowerment",
                    "home_environment_growth",
                    e.target.value === "true"
                  )
                }
              >
                <option value="">Select</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>

            {/* Community Environment Growth */}
            <div>
              <label className="text-gray-500 font-medium">
                Community Environment Growth
              </label>
              <select
                className="border border-gray-300 p-2 rounded w-full"
                value={String(
                  formData.social_development.personal_development_empowerment
                    .community_environment_growth ?? ""
                )}
                onChange={(e) =>
                  handleNestedChange(
                    "social_development",
                    "personal_development_empowerment",
                    "community_environment_growth",
                    e.target.value === "true"
                  )
                }
              >
                <option value="">Select</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
          </div>

          <div>
            <h1 className="text-xl font-medium pb-4">Awareness of RA Acts</h1>
            <div className="grid grid-cols-2 gap-2 space-y-1">
              {Object.keys(formData.social_development.awareness).map((ra) => (
                <div key={ra}>
                  <label className="text-gray-500 font-medium">
                    {ra.replace("_", " ")}
                  </label>
                  <select
                    className="border border-gray-300 p-2 rounded w-full"
                    value={formData.social_development.awareness[ra]}
                    onChange={(e) =>
                      handleNestedChange(
                        "social_development",
                        "awareness",
                        ra,
                        e.target.value
                      )
                    }
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                    <option value="Not Sure">Not Sure</option>
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h1 className="text-xl font-medium pb-4">
              Observed in University/Community
            </h1>
            <div className="grid grid-cols-2 gap-2 space-y-1">
              {Object.keys(
                formData.social_development.observed_in_university_or_community
              ).map((ra) => (
                <div key={ra}>
                  <label className="text-gray-500 font-medium">
                    {ra.replace("_", " ")}
                  </label>
                  <select
                    className="border border-gray-300 p-2 rounded w-full"
                    value={
                      formData.social_development
                        .observed_in_university_or_community[ra]
                    }
                    onChange={(e) =>
                      handleNestedChange(
                        "social_development",
                        "observed_in_university_or_community",
                        ra,
                        e.target.value
                      )
                    }
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                    <option value="Not Sure">Not Sure</option>
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h1 className="text-xl font-medium pb-4">Other Training Needs</h1>
            {formData.social_development.other_training_needs.map(
              (item, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    className="border border-gray-300 p-2 rounded w-full"
                    value={item}
                    onChange={(e) => {
                      const updated = [
                        ...formData.social_development.other_training_needs,
                      ];
                      updated[index] = e.target.value;
                      handleNestedChange(
                        "social_development",
                        "other_training_needs",
                        null,
                        updated
                      );
                    }}
                  />
                </div>
              )
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 space-y-1">
          {[
            "environmental_protection",
            "disaster_reduction",
            "disaster_knowledge_personal",
            "disaster_knowledge_family",
            "disaster_knowledge_officemates",
            "fire_drill",
            "earthquake_drill",
            "trained_marshals",
            "emergency_equipment_home",
            "emergency_equipment_office",
          ].map((key) => {
            const isBoolean =
              typeof formData.environmental_climate[key] === "boolean";

            return (
              <div key={key}>
                <label className="text-gray-500 font-medium">
                  {key
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (c) => c.toUpperCase())}
                </label>

                <select
                  className="border border-gray-300 p-2 rounded w-full"
                  value={String(formData.environmental_climate[key] ?? "")}
                  onChange={(e) => {
                    const value = isBoolean
                      ? e.target.value === "true"
                      : e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      environmental_climate: {
                        ...prev.environmental_climate,
                        [key]: value,
                      },
                    }));

                    setErrors((prev) => ({
                      ...prev,
                      [`environmental_climate.${key}`]: "",
                    }));
                  }}
                >
                  {isBoolean ? (
                    <>
                      <option value="">Select</option>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </>
                  ) : (
                    <>
                      <option value="">Select</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                      <option value="N/A">N/A</option>
                    </>
                  )}
                </select>
              </div>
            );
          })}
        </div>

        <div className="shadow-sm bg-white px-6 py-6 rounded-md mt-6">
          <h1 className="text-xl font-medium pb-4">Gender Responsive</h1>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(formData.gender_responsive).map(([key, value]) => (
              <div key={key}>
                <label className="text-gray-500 font-medium">
                  {key.replace(/_/g, " ")}
                </label>
                {typeof value === "boolean" ? (
                  <select
                    className="border border-gray-300 p-2 rounded w-full"
                    value={String(value)}
                    onChange={(e) =>
                      handleChange(
                        "gender_responsive",
                        key,
                        e.target.value === "true"
                      )
                    }
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                ) : (
                  <select
                    className="border border-gray-300 p-2 rounded w-full"
                    value={value || ""}
                    onChange={(e) =>
                      handleChange("gender_responsive", key, e.target.value)
                    }
                  >
                    <option>Always</option>

                    <option>Very Frequently</option>
                    <option>Occasionally</option>
                    <option>Rarely</option>
                    <option>Very Rarely</option>
                    <option>Never</option>
                  </select>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="shadow-sm bg-white px-6 py-6 rounded-md mt-6">
          <h1 className="text-xl font-medium pb-4">
            Security & Peace - Gender-Based Experiences
          </h1>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(
              formData.security_peace.gender_based_experiences
            ).map(([key, value]) => (
              <div key={key}>
                <label className="text-gray-500 font-medium">
                  {key.replace(/_/g, " ")}
                </label>
                <select
                  className="border border-gray-300 p-2 rounded w-full"
                  value={value || ""}
                  onChange={(e) =>
                    handleNestedChange(
                      "security_peace",
                      "gender_based_experiences",
                      key,
                      e.target.value
                    )
                  }
                >
                  <option value="Never">Never</option>
                  <option value="Rarely">Rarely</option>
                  <option value="Sometimes">Sometimes</option>
                  <option value="Often">Often</option>
                  <option value="Always">Always</option>
                </select>
              </div>
            ))}
          </div>

          <div>
            <h1 className="text-xl font-medium pb-4">Other Experiences</h1>
            <div className="grid grid-cols-2 gap-2 space-y-1">
              {Object.keys(formData.security_peace.other_experiences).map(
                (key) => (
                  <div key={key}>
                    <label className="text-gray-500 font-medium">
                      {key
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, (c) => c.toUpperCase())}
                    </label>
                    <select
                      className="border border-gray-300 p-2 rounded w-full"
                      value={formData.security_peace.other_experiences[key]}
                      onChange={(e) =>
                        handleNestedChange(
                          "security_peace",
                          "other_experiences",
                          key,
                          e.target.value
                        )
                      }
                    >
                      <option value="Never">Never</option>
                      <option value="Rarely">Rarely</option>
                      <option value="Sometimes">Sometimes</option>
                      <option value="Often">Often</option>
                      <option value="Always">Always</option>
                    </select>
                  </div>
                )
              )}
            </div>
          </div>

          <div>
            <h1 className="text-xl font-medium pb-4">VAW Services Awareness</h1>
            <div className="grid grid-cols-2 gap-2 space-y-1">
              {Object.keys(formData.security_peace.vaw_services_awareness).map(
                (key) => (
                  <div key={key}>
                    <label className="text-gray-500 font-medium">
                      {key
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, (c) => c.toUpperCase())}
                    </label>
                    <select
                      className="border border-gray-300 p-2 rounded w-full"
                      value={
                        formData.security_peace.vaw_services_awareness[key]
                      }
                      onChange={(e) =>
                        handleNestedChange(
                          "security_peace",
                          "vaw_services_awareness",
                          key,
                          e.target.value
                        )
                      }
                    >
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                      <option value="Not Sure">Not Sure</option>
                    </select>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-row gap-2 mt-4 col-span-2">
        <Button
          className="flex items-center gap-1"
          onClick={() => setShowUpdateModal(true)}
          disabled={!isChanged}
        >
          <FaSave className="w-5 h-5" />
          Save Changes
        </Button>
        <Button
          color="white"
          className="border border-gray-300"
          onClick={() => window.location.reload()}
        >
          Cancel
        </Button>
      </div>
      {showUpdateModal && (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-82 sm:w-96">
            <h2 className="text-lg font-medium">Confirm Update</h2>
            <p className="mb-6 text-gray-600">
              Are you sure you want to update your profile with these changes?
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                onClick={() => setShowUpdateModal(false)}
              >
                Cancel
              </button>
              <Button
                className="flex items-center gap-1"
                onClick={handleSave}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4l3-3-3-3v4a10 10 0 100 20v-4l-3 3 3 3v-4a8 8 0 01-8-8z"
                      ></path>
                    </svg>
                    Updating...
                  </>
                ) : (
                  <>Confirm Update</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
