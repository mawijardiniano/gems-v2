"use client";

import { useEffect, useState } from "react";
import { FaBriefcase } from "react-icons/fa";

const OFFICES = [
  "Graduate School",
  "College of Agriculture",
  "College of Allied Health Sciences",
  "College of Arts & Social Sciences",
  "College of Business & Accountancy",
  "College of Criminal Justice Education",
  "College of Education",
  "College of Engineering",
  "College of Environmental Studies",
  "College of Fisheries & Aquatic Sciences",
  "College of Governance",
  "College of Industrial Technology",
  "College of Information & Computing Sciences",
  "Offices under the Office of the University President",
  "Offices under the Office of the Vice President for Academic Affairs",
  "Offices under the Office of the Vice President for Administration and Finance",
  "Offices under the Office of the Vice President for Research and Extension",
  "Offices under the Office of the Vice President for Student Affairs and Services",
];

const EMPLOYMENT_STATUS = ["Faculty", "Non-teaching Personnel"];

const APPOINTMENT_STATUS_MAP = {
  "Non-teaching Personnel": [
    "Regular",
    "Temporary",
    "Coterminous",
    "Casual",
    "Job Order",
    "Contract of Service (Skilled)",
    "Utility Worker",
  ],
  Faculty: [
    "Regular",
    "Temporary",
    "University Lecturer",
    "Part-time Lecturer",
    "Clinical Instructor",
    "Adjunct",
  ],
};

export default function EmploymentContent() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: "",
    office: "",
    employment_status: "",
    employment_appointment_status: "",
  });
  const [originalData, setOriginalData] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastColor, setToastColor] = useState("success");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/profile/my-profile", {
          credentials: "include",
        });
        if (!mounted) return;
        if (!res.ok) return setProfile(null);
        const body = await res.json();
        const profileObj = body?.data || body?.profile || body || null;
        console.log("Loaded profile (employment):", profileObj);
        setProfile(profileObj);
        const employment =
          profileObj?.affiliation?.employment_information || null;
        setFormData({
          employee_id: employment?.employee_id || "",
          office: employment?.office || "",
          employment_status: employment?.employment_status || "",
          employment_appointment_status:
            employment?.employment_appointment_status || "",
        });
        setOriginalData(employment);
      } catch (e) {
        console.error("Error fetching profile (employment):", e);
        setProfile(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, []);

  const handleChange = (key, value) =>
    setFormData((p) => {
      const updated = { ...p, [key]: value };
      if (key === "employment_status") {
        updated.employment_appointment_status = "";
      }
      return updated;
    });

  const handleSave = async () => {
    if (
      !formData.employee_id ||
      !formData.office ||
      !formData.employment_status
    ) {
      setToastMessage(
        "Employee ID, Office and Employment Status are required.",
      );
      setToastColor("failure");
      setShowToast(true);
      return;
    }
    if (
      formData.employment_status === "Non-teaching Personnel" &&
      !formData.employment_appointment_status
    ) {
      setToastMessage(
        "Appointment status is required for Non-teaching Personnel.",
      );
      setToastColor("failure");
      setShowToast(true);
      return;
    }

    try {
      const userId = profile?._id;
      if (!userId) throw new Error("User ID not found");
      setIsUpdating(true);

      const payload = {
        affiliation: { employment_information: formData },
      };
      console.log("Saving employment payload:", payload);

      const res = await fetch(`/api/profile/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch (err) {
        data = text;
      }
      if (!res.ok) {
        console.error("Failed to save employment info:", res.status, data);
        throw new Error("Failed to save employment info");
      }

      const updatedEmployment =
        data.data.affiliation?.employment_information || formData;
      setFormData({
        employee_id: updatedEmployment.employee_id || "",
        office: updatedEmployment.office || "",
        employment_status: updatedEmployment.employment_status || "",
        employment_appointment_status:
          updatedEmployment.employment_appointment_status || "",
      });
      setOriginalData(updatedEmployment);
      setIsEditing(false);
      setToastMessage("Employment information saved.");
      setToastColor("success");
      setShowToast(true);

      try {
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("profileUpdated", { detail: data.data }),
          );
        }
      } catch (e) {}
    } catch (e) {
      console.error(e);
      setToastMessage("Failed to save employment info.");
      setToastColor("failure");
      setShowToast(true);
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) return <p className="text-gray-500">Loading...</p>;
  if (!profile) return <p className="text-gray-500">No profile found.</p>;

  return (
    <div className="p-6">
      <div className="border border-gray-200 p-6 rounded    ">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <FaBriefcase className="text-2xl text-gray-600" />
            <div>
              <h1 className="text-lg font-medium">Employment Information</h1>
            </div>
          </div>
          <div className="flex gap-2">
            {isEditing && (
              <button
                onClick={handleSave}
                disabled={isUpdating}
                className="bg-blue-600 text-white px-3 py-1 rounded disabled:opacity-50"
              >
                {isUpdating ? "Saving..." : "Save"}
              </button>
            )}
            <button
              onClick={() => {
                if (isEditing) {
                  setFormData({
                    employee_id: originalData?.employee_id || "",
                    office: originalData?.office || "",
                    employment_status: originalData?.employment_status || "",
                    employment_appointment_status:
                      originalData?.employment_appointment_status || "",
                  });
                }
                setIsEditing(!isEditing);
              }}
              className="bg-white border border-gray-200 px-3 py-1 rounded"
            >
              {isEditing ? "Cancel" : "Edit"}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-600">Employee ID</label>
            {isEditing ? (
              <input
                className="border border-gray-300 rounded px-3 py-1 w-full"
                value={formData.employee_id}
                onChange={(e) => handleChange("employee_id", e.target.value)}
              />
            ) : (
              <p className="border border-gray-300 rounded px-3 py-1 w-full">
                {formData.employee_id || "N/A"}
              </p>
            )}
          </div>

          <div className="">
            <label className="text-sm text-gray-600">Office</label>
            {isEditing ? (
              <select
                className="border border-gray-300 rounded px-3 py-1 w-full truncate"
                value={formData.office}
                onChange={(e) => handleChange("office", e.target.value)}
              >
                <option value="">Select Office</option>
                {OFFICES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            ) : (
              <p className="border border-gray-300 rounded px-3 py-1 w-full">
                {formData.office || "N/A"}
              </p>
            )}
          </div>

          <div>
            <label className="text-sm text-gray-600">Employment Status</label>
            {isEditing ? (
              <select
                className="border border-gray-300 rounded px-3 py-1 w-full"
                value={formData.employment_status}
                onChange={(e) =>
                  handleChange("employment_status", e.target.value)
                }
              >
                <option value="">Select Status</option>
                {EMPLOYMENT_STATUS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            ) : (
              <p className="border border-gray-300 rounded px-3 py-1 w-full">
                {formData.employment_status || "N/A"}
              </p>
            )}
          </div>

          <div>
            <label className="text-sm text-gray-600">Appointment Status</label>
            {isEditing ? (
              <select
                className="border border-gray-300 rounded px-3 py-1 w-full"
                value={formData.employment_appointment_status}
                onChange={(e) =>
                  handleChange("employment_appointment_status", e.target.value)
                }
                disabled={!formData.employment_status}
              >
                <option value="">Select Appointment</option>
                {(formData.employment_status
                  ? APPOINTMENT_STATUS_MAP[formData.employment_status] || []
                  : []
                ).map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            ) : (
              <p className="border border-gray-300 rounded px-3 py-1 w-full ">
                {formData.employment_appointment_status || "N/A"}
              </p>
            )}
          </div>
        </div>
      </div>

      {showToast && (
        <div
          className={`fixed bottom-4 right-4 px-4 py-2 rounded text-white ${
            toastColor === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
