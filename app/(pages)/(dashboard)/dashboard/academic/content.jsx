"use client";

import { useEffect, useState } from "react";
import { FaGraduationCap } from "react-icons/fa";

const COLLEGES = [
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
];

const YEAR_LEVELS = [
  "1st Year",
  "2nd Year",
  "3rd Year",
  "4th Year",
  "5th Year",
  "6th Year",
];

export default function AcademicContent() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [formData, setFormData] = useState({
    student_id: "",
    college: "",
    year_level: "",
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
        setProfile(profileObj);
        const academic =
          profileObj?.personal_information?.academic_information || null;
        setFormData({
          student_id: academic?.student_id || "",
          college: academic?.college || "",
          year_level: academic?.year_level || "",
        });
        setOriginalData(academic);
      } catch (e) {
        console.error(e);
        setProfile(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, []);

  const handleChange = (key, value) =>
    setFormData((p) => ({ ...p, [key]: value }));

  const handleSave = async () => {
    if (!formData.student_id || !formData.college || !formData.year_level) {
      setToastMessage("Student ID, College and Year Level are required.");
      setToastColor("failure");
      setShowToast(true);
      return;
    }

    try {
      const userId = profile?._id;
      if (!userId) throw new Error("User ID not found");
      setIsUpdating(true);

      const payload = {
        personal_information: { academic_information: formData },
      };

      const res = await fetch(`/api/profile/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save academic info");
      const data = await res.json();

      const updatedAcademic =
        data.data.personal_information?.academic_information || formData;
      setFormData({
        student_id: updatedAcademic.student_id || "",
        college: updatedAcademic.college || "",
        year_level: updatedAcademic.year_level || "",
      });
      setOriginalData(updatedAcademic);
      setIsEditing(false);
      setToastMessage("Academic information saved.");
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
      setToastMessage("Failed to save academic info.");
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
      <div className="border border-gray-200 p-6 rounded">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <FaGraduationCap className="text-2xl text-gray-600" />
            <div>
              <h1 className="text-lg font-medium">Academic Information</h1>
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
                    student_id: originalData?.student_id || "",
                    college: originalData?.college || "",
                    year_level: originalData?.year_level || "",
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
            <label className="text-sm text-gray-600">Student ID</label>
            {isEditing ? (
              <input
                className="border border-gray-300 rounded px-3 py-1 w-full"
                value={formData.student_id}
                onChange={(e) => handleChange("student_id", e.target.value)}
              />
            ) : (
              <p className=" border border-gray-300 rounded px-3 py-1 w-full">
                {formData.student_id || "N/A"}
              </p>
            )}
          </div>

          <div>
            <label className="text-sm text-gray-600">College</label>
            {isEditing ? (
              <select
                className="border border-gray-300 rounded px-3 py-1 w-full"
                value={formData.college}
                onChange={(e) => handleChange("college", e.target.value)}
              >
                <option value="">Select College</option>
                {COLLEGES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            ) : (
              <p className="border border-gray-300 rounded px-3 py-1 w-full">
                {formData.college || "N/A"}
              </p>
            )}
          </div>

          <div>
            <label className="text-sm text-gray-600">Year Level</label>
            {isEditing ? (
              <select
                className="border border-gray-300 rounded px-3 py-1 w-full"
                value={formData.year_level}
                onChange={(e) => handleChange("year_level", e.target.value)}
              >
                <option value="">Select Year Level</option>
                {YEAR_LEVELS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            ) : (
              <p className="border border-gray-300 rounded px-3 py-1 w-full">
                {formData.year_level || "N/A"}
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
