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

  // const handleBirthdayChange = (value) => {
  //   const today = new Date().toISOString().split("T")[0];
  //   if (value > today) {

  //     return;
  //   }
  //   handleChange("birthday", value);
  // };

  const handleAddressChange = (addressType, field, value) => {
    setFormData((prev) => ({
      ...prev,
      contact: {
        ...prev.contact,
        [addressType]: {
          ...prev.contact[addressType],
          [field]: value,
        },
      },
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    // Personal Info
    if (!formData.personal.firstName?.trim())
      newErrors["personal.firstName"] = "First name is required.";
    if (!formData.personal.lastName?.trim())
      newErrors["personal.lastName"] = "Last name is required.";
    if (!formData.personal.birthday)
      newErrors["personal.birthday"] = "Birthday is required.";
    if (!formData.personal.civilStatus)
      newErrors["personal.civilStatus"] = "Civil Status is required.";
    if (!formData.personal.nationality)
      newErrors["personal.nationality"] = "Nationality is required.";
    if (!formData.personal.bloodType)
      newErrors["personal.bloodType"] = "Blood Type is required.";

    //Gad Data
    if (formData.gadData.isPWD === true) {
      if (!formData.gadData.disabilityDetails?.trim()) {
        newErrors["gadData.disabilityDetails"] =
          "Disability details are required if PWD.";
      }
    }

    // Contact Info
    if (!formData.contact.email?.trim())
      newErrors["contact.email"] = "Email is required.";
    if (!formData.contact.mobileNumber?.trim())
      newErrors["contact.mobileNumber"] = "Mobile number is required.";

    // University Affiliation
    if (!formData.affiliation.campus?.trim())
      newErrors["affiliation.campus"] = "Campus is required.";
    if (!formData.affiliation.college?.trim())
      newErrors["affiliation.college"] = "College is required.";

    if (currentStatus === "Student") {
      if (!formData.affiliation.studentDetails?.course?.trim())
        newErrors["affiliation.studentDetails.course"] =
          "Course is required for students.";
    }

    if (currentStatus === "Employee") {
      if (!formData.affiliation.employeeDetails?.position?.trim())
        newErrors["affiliation.employeeDetails.position"] =
          "Position is required for employees.";
    }

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

      <div className="grid md:grid-cols-2 gap-4">
        <div className="shadow-sm bg-white px-6 py-6 rounded-md">
          <h1 className="text-xl font-medium pb-4">Personal Info</h1>
          <div className="grid grid-cols-2 gap-2 space-y-4">
            <div>
              <label className="text-gray-500 font-medium">First Name</label>
              <input
                className="border border-gray-300 rounded p-2 w-full"
                value={formData.personal.firstName}
                onChange={(e) =>
                  handleChange("personal", "firstName", e.target.value)
                }
              />
              {errors["personal.firstName"] && (
                <p className="text-red-500 text-xs mt-1">
                  {errors["personal.firstName"]}
                </p>
              )}
            </div>

            <div>
              <label className="text-gray-500 font-medium">Last Name</label>
              <input
                className="border border-gray-300 rounded p-2 w-full"
                value={formData.personal.lastName}
                onChange={(e) =>
                  handleChange("personal", "lastName", e.target.value)
                }
              />
              {errors["personal.lastName"] && (
                <p className="text-red-500 text-xs mt-1">
                  {errors["personal.lastName"]}
                </p>
              )}
            </div>
            <div>
              <label className="text-gray-500 font-medium">Middle Name</label>
              <input
                className="border border-gray-300 rounded p-2 w-full"
                value={formData.personal.middleName}
                onChange={(e) =>
                  handleChange("personal", "middleName", e.target.value)
                }
              />
              {errors["personal.middleName"] && (
                <p className="text-red-500 text-xs mt-1">
                  {errors["personal.middleName"]}
                </p>
              )}
            </div>


            <div>
              <label className="text-gray-500 font-medium">Birthday</label>
              <input
                type="date"
                className="border border-gray-300 rounded p-2 w-full"
                value={formData.personal.birthday?.substring(0, 10) || ""}
                onChange={(e) =>
                  handleChange("personal", "birthday", e.target.value)
                }
                max={new Date().toISOString().split("T")[0]}
              />
              {errors["personal.birthday"] && (
                <p className="text-red-500 text-xs mt-1">
                  {errors["personal.birthday"]}
                </p>
              )}
            </div>

            <div>
              <label className="text-gray-500 font-medium">Civil Status</label>
              <select
                className="border border-gray-300 p-2 rounded w-full"
                value={formData.personal.civilStatus}
                onChange={(e) =>
                  handleChange("personal", "civilStatus", e.target.value)
                }
              >
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Widowed">Widowed</option>
                <option value="Separated">Separated</option>
                <option value="Divorced">Divorced</option>
              </select>
              {errors["personal.civilStatus"] && (
                <p className="text-red-500 text-xs mt-1">
                  {errors["personal.civilStatus"]}
                </p>
              )}
            </div>

            <div>
              <label className="text-gray-500 font-medium">Nationality</label>
              <input
                className="border border-gray-300 rounded p-2 w-full"
                value={formData.personal.nationality}
                onChange={(e) =>
                  handleChange("personal", "nationality", e.target.value)
                }
              />
              {errors["personal.nationality"] && (
                <p className="text-red-500 text-xs mt-1">
                  {errors["personal.nationality"]}
                </p>
              )}
            </div>

            <div>
              <label className="text-gray-500 font-medium">Blood Type</label>
              <select
                className="border border-gray-300 p-2 rounded w-full"
                value={formData.personal.bloodType}
                onChange={(e) =>
                  handleChange("personal", "bloodType", e.target.value)
                }
              >
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
              {errors["personal.bloodType"] && (
                <p className="text-red-500 text-xs mt-1">
                  {errors["personal.bloodType"]}
                </p>
              )}
            </div>

            <div>
              <label className="text-gray-500 font-medium">Religion</label>
              <input
                className="border border-gray-300 rounded p-2 w-full"
                value={formData.personal.religion}
                onChange={(e) =>
                  handleChange("personal", "religion", e.target.value)
                }
              />
              {errors["personal.religion"] && (
                <p className="text-red-500 text-xs mt-1">
                  {errors["personal.religion"]}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Gender & Equity Data */}
        <div className="shadow-sm bg-white px-6 py-6 rounded-md">
          <h1 className="text-xl font-medium pb-4">Gender & Equity Data</h1>
          <div className="grid grid-cols-2 gap-2 space-y-4">
            <div>
              <label className="text-gray-500 font-medium">Sex At Birth</label>
              <select
                className="border border-gray-300 p-2 rounded w-full"
                value={formData.gadData.sexAtBirth || ""}
                onChange={(e) =>
                  handleChange("gadData", "sexAtBirth", e.target.value)
                }
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Intersex">Intersex</option>
                <option value="Prefer not to disclose">
                  Prefer not to disclose
                </option>
              </select>
            </div>

            <div>
              <label className="text-gray-500 font-medium">
                Gender Identity
              </label>
              <input
                className="border border-gray-300 p-2 rounded w-full"
                value={formData.gadData.genderIdentity || ""}
                onChange={(e) =>
                  handleChange("gadData", "genderIdentity", e.target.value)
                }
              />
            </div>

            <div>
              <label className="text-gray-500 font-medium">
                Gender Expression
              </label>
              <input
                className="border border-gray-300 p-2 rounded w-full"
                value={formData.gadData.genderExpression || ""}
                onChange={(e) =>
                  handleChange("gadData", "genderExpression", e.target.value)
                }
              />
            </div>

            <div>
              <label className="text-gray-500 font-medium">
                Sexual Orientation
              </label>
              <select
                className="border border-gray-300 p-2 rounded w-full"
                value={formData.gadData.sexualOrientation}
                onChange={(e) =>
                  handleChange("gadData", "sexualOrientation", e.target.value)
                }
              >
                <option value="Heterosexual">Heterosexual</option>
                <option value="Homosexual">Homosexual</option>
                <option value="Bisexual">Bisexual</option>
                <option value="Pansexual">Pansexual</option>
                <option value="Asexual">Asexual</option>
                <option value="Aromantic">Aromantic</option>
                <option value="Demisexual">Demisexual</option>
                <option value="Queer">Queer</option>
                <option value="Prefer not to disclose">
                  Prefer not to disclose
                </option>
              </select>
            </div>

            <div>
              <label className="text-gray-500 font-medium">
                Person with Disability
              </label>
              <select
                className="border border-gray-300 p-2 rounded w-full"
                value={String(formData.gadData.isPWD)}
                onChange={(e) =>
                  handleChange("gadData", "isPWD", e.target.value === "true")
                }
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>

            {formData.gadData.isPWD === true && (
              <div className="col-span-2">
                <label className="text-gray-500 font-medium">
                  Disability Details
                </label>
                <input
                  className="border border-gray-300 p-2 rounded w-full"
                  value={formData.gadData.disabilityDetails || ""}
                  onChange={(e) =>
                    handleChange("gadData", "disabilityDetails", e.target.value)
                  }
                  placeholder="Specify disability"
                />
                {errors["gadData.disabilityDetails"] && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors["gadData.disabilityDetails"]}
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="text-gray-500 font-medium">
                Indigenous Person
              </label>
              <select
                className="border border-gray-300 p-2 rounded w-full"
                value={String(formData.gadData.isIndigenousPerson)}
                onChange={(e) =>
                  handleChange(
                    "gadData",
                    "isIndigenousPerson",
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
                Socio Economic Status
              </label>
              <select
                className="border border-gray-300 p-2 rounded w-full"
                value={formData.gadData.socioEconomicStatus || ""}
                onChange={(e) =>
                  handleChange("gadData", "socioEconomicStatus", e.target.value)
                }
              >
                <option value="">Select</option>
                <option value="Low Income">Low Income</option>
                <option value="Middle Income">Middle Income</option>
                <option value="High Income">High Income</option>
                <option value="Prefer not to disclose">
                  Prefer not to disclose
                </option>
              </select>
            </div>

            <div>
              <label className="text-gray-500 font-medium">
                Head of Household
              </label>
              <input
                className="border border-gray-300 p-2 rounded w-full"
                value={formData.gadData.headOfHousehold || ""}
                onChange={(e) =>
                  handleChange("gadData", "headOfHousehold", e.target.value)
                }
                placeholder="e.g., Self, Spouse, Parent"
              />
            </div>
          </div>
        </div>

        <div className="shadow-sm bg-white px-6 py-6 rounded-md">
          <h1 className="text-xl font-medium pb-4">University Affiliation</h1>

          <div className="grid grid-cols-2 gap-2 space-y-4">
            <div>
              <label className="text-gray-500 font-medium">Campus</label>
              <input
                type="text"
                className="border border-gray-300 p-2 w-full rounded"
                value={formData.affiliation.campus || ""}
                onChange={(e) =>
                  handleChange("affiliation", "campus", e.target.value)
                }
              />
            </div>

            <div>
              <label className="text-gray-500 font-medium">
                College/Office
              </label>
              <select
                className="border border-gray-300 p-2 w-full rounded"
                value={formData.affiliation.college || ""}
                onChange={(e) =>
                  handleChange("affiliation", "college", e.target.value)
                }
              >
                <option value="Graduate School">Graduate School</option>
                <option value="College of Agriculture">
                  College of Agriculture
                </option>
                <option value="College of Allied Health Sciences">
                  College of Allied Health Sciences
                </option>
                <option value="College of Arts & Social Sciences">
                  College of Arts & Social Sciences
                </option>
                <option value="College of Business & Accountancy">
                  College of Business & Accountancy
                </option>
                <option value="College of Criminal Justice Education">
                  College of Criminal Justice Education
                </option>
                <option value="College of Education">
                  College of Education
                </option>
                <option value="College of Engineering">
                  College of Engineering
                </option>
                <option value="College of Environmental Studies">
                  College of Environmental Studies
                </option>
                <option value="College of Fisheries & Aquatic Sciences">
                  College of Fisheries & Aquatic Sciences
                </option>
                <option value="College of Governance">
                  College of Governance
                </option>
                <option value="College of Industrial Technology">
                  College of Industrial Technology
                </option>
                <option value="College of Information & Computing Sciences">
                  College of Information & Computing Sciences
                </option>
                <option value="Offices under the Office of the University President">
                  Offices under the Office of the University President
                </option>
                <option value="Offices under the Office of the Vice President for Academic Affairs">
                  Offices under the Office of the Vice President for Academic
                  Affairs
                </option>
                <option value="Offices under the Office of the Vice President for Administration and Finance">
                  Offices under the Office of the Vice President for
                  Administration and Finance
                </option>
                <option value="Offices under the Office of the Vice President for Research and Extension">
                  Offices under the Office of the Vice President for Research
                  and Extension
                </option>
                <option value="Offices under the Office of the Vice President for Student Affairs and Services">
                  Offices under the Office of the Vice President for Student
                  Affairs and Services
                </option>
              </select>
            </div>
          </div>

          {currentStatus === "Employee" && (
            <div className="grid grid-cols-2 gap-2 mt-4">
              <div>
                <label className="text-gray-500 font-medium">Department</label>
                <input
                  type="text"
                  className="border border-gray-300 p-2 w-full rounded"
                  value={formData.affiliation.employeeDetails?.department || ""}
                  onChange={(e) =>
                    handleNestedChange(
                      "affiliation",
                      "employeeDetails",
                      "department",
                      e.target.value
                    )
                  }
                />
              </div>
              <div>
                <label className="text-gray-500 font-medium">Position</label>
                <input
                  type="text"
                  className="border border-gray-300 p-2 w-full rounded"
                  value={formData.affiliation.employeeDetails?.position || ""}
                  onChange={(e) =>
                    handleNestedChange(
                      "affiliation",
                      "employeeDetails",
                      "position",
                      e.target.value
                    )
                  }
                />
              </div>
              <div>
                <label className="text-gray-500 font-medium">
                  Employment Type
                </label>
                <select
                  className="border border-gray-300 p-2 w-full rounded"
                  value={
                    formData.affiliation.employeeDetails?.employmentType || ""
                  }
                  onChange={(e) =>
                    handleNestedChange(
                      "affiliation",
                      "employeeDetails",
                      "employmentType",
                      e.target.value
                    )
                  }
                >
                  <option value="">Select Type</option>
                  <option value="Faculty">Permanent</option>
                  <option value="Non-teaching-Personnel">Contractual</option>
                </select>
              </div>
            </div>
          )}

          {currentStatus === "Student" && (
            <div className="grid grid-cols-2 gap-2 mt-4">
              <div>
                <label className="text-gray-500 font-medium">Course</label>
                <input
                  type="text"
                  className="border border-gray-300 p-2 w-full rounded"
                  value={formData.affiliation.studentDetails?.course || ""}
                  onChange={(e) =>
                    handleNestedChange(
                      "affiliation",
                      "studentDetails",
                      "course",
                      e.target.value
                    )
                  }
                />
              </div>

              <div>
                <label className="text-gray-500 font-medium">Year Level</label>
                <select
                  className="border border-gray-300 p-2 w-full rounded"
                  value={formData.affiliation.studentDetails?.yearLevel || ""}
                  onChange={(e) =>
                    handleNestedChange(
                      "affiliation",
                      "studentDetails",
                      "yearLevel",
                      Number(e.target.value)
                    )
                  }
                >
                  <option value="">Select Year</option>
                  <option value={1}>1st Year</option>
                  <option value={2}>2nd Year</option>
                  <option value={3}>3rd Year</option>
                  <option value={4}>4th Year</option>
                  <option value={5}>5th Year</option>
                </select>
              </div>

              <div>
                <label className="text-gray-500 font-medium">Scholar?</label>
                <select
                  className="border border-gray-300 p-2 w-full rounded"
                  value={String(formData.affiliation.studentDetails?.isScholar)}
                  onChange={(e) =>
                    handleNestedChange(
                      "affiliation",
                      "studentDetails",
                      "isScholar",
                      e.target.value === "true"
                    )
                  }
                >
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="shadow-sm bg-white px-6 py-6 rounded-md">
          <h1 className="text-xl font-medium pb-4 col-span-2">Contact Info</h1>

          <div className="grid grid-cols-2 gap-2 space-y-4">
            <div>
              <label className="text-gray-500 font-medium">Email</label>
              <input
                type="email"
                className="border border-gray-300 p-2 rounded w-full"
                placeholder="Enter email"
                value={formData.contact.email || ""}
                onChange={(e) =>
                  handleChange("contact", "email", e.target.value)
                }
              />
            </div>

            <div>
              <label className="text-gray-500 font-medium">Mobile Number</label>
              <input
                type="text"
                className="border border-gray-300 p-2 rounded w-full"
                placeholder="Enter mobile number"
                value={formData.contact.mobileNumber || ""}
                onChange={(e) =>
                  handleChange("contact", "mobileNumber", e.target.value)
                }
              />
            </div>
          </div>

          <div className="mt-4">
            <h3 className="font-medium mb-2">Permanent Address</h3>
            <div className="grid grid-cols-2 gap-4">
              {["street", "barangay", "city", "province"].map((field) => (
                <div key={field}>
                  <label className="capitalize text-gray-500 font-medium">
                    {field.replace("No", " No.")}
                  </label>
                  <input
                    type="text"
                    className="border border-gray-300 p-2 rounded w-full"
                    placeholder={`Enter ${field}`}
                    value={formData.contact.permanentAddress?.[field] || ""}
                    onChange={(e) =>
                      handleAddressChange(
                        "permanentAddress",
                        field,
                        e.target.value
                      )
                    }
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <h3 className="font-medium mb-2">Current Address</h3>
            <div className="grid grid-cols-2 gap-4">
              {["street", "barangay", "city", "province"].map((field) => (
                <div key={field}>
                  <label className="capitalize text-gray-500 font-medium">
                    {field.replace("No", " No.")}
                  </label>
                  <input
                    type="text"
                    className="border border-gray-300 p-2 rounded w-full"
                    placeholder={`Enter ${field}`}
                    value={formData.contact.currentAddress?.[field] || ""}
                    onChange={(e) =>
                      handleAddressChange(
                        "currentAddress",
                        field,
                        e.target.value
                      )
                    }
                  />
                </div>
              ))}
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
