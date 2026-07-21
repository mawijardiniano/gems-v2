"use client";

import { useEffect, useState } from "react";
import {
  FaSave,
  FaTimes,
  FaEdit,
  FaCheckCircle,
  FaGraduationCap,
  FaUniversity,
  FaBookOpen,
  FaLayerGroup,
  FaClock,
  FaIdBadge,
  FaAward,
  FaSchool,
} from "react-icons/fa";

const COURSE = ["Information System", "Information Technology"];
const CAMPUS = ["Boac", "Sta. Cruz"];
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
  "1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year", "6th Year",
];
const SCHOLAR_STATUS = ["Yes", "No"];

function DetailCard({ icon, label, value, color }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg shrink-0 ${color || "bg-indigo-50 text-indigo-600"}`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
          <p className="text-base font-semibold text-gray-900 mt-1 truncate">{value || "—"}</p>
        </div>
      </div>
    </div>
  );
}

function Toast({ message, type, visible }) {
  if (!visible) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
      <div className={`flex items-center gap-3 px-6 py-4 rounded-xl shadow-lg border ${
        type === "success"
          ? "bg-emerald-50 border-emerald-200 text-emerald-800"
          : "bg-red-50 border-red-200 text-red-800"
      }`}>
        {type === "success" ? (
          <FaCheckCircle className="text-emerald-500 shrink-0 text-lg" />
        ) : (
          <FaTimes className="text-red-500 shrink-0 text-lg" />
        )}
        <p className="text-sm font-semibold">{message}</p>
      </div>
    </div>
  );
}

export default function AcademicContent() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [formData, setFormData] = useState({
    campus: "",
    student_id: "",
    college: "",
    course: "",
    year_level: "",
    isScholar: "",
  });
  const [originalData, setOriginalData] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: "", type: "success" });

  const showToast = (message, type = "success") => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3000);
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/profile/my-profile", { credentials: "include" });
        if (!mounted) return;
        if (!res.ok) return setProfile(null);
        const body = await res.json();
        const profileObj = body?.data || body?.profile || body || null;
        setProfile(profileObj);
        const academic = profileObj?.affiliation?.academic_information || null;
        setFormData({
          campus: academic?.campus || "",
          student_id: academic?.student_id || "",
          college: academic?.college || "",
          course: academic?.course || "",
          year_level: academic?.year_level || "",
          isScholar: academic?.isScholar || "",
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
    const required = [formData.student_id, formData.campus, formData.college, formData.course, formData.year_level, formData.isScholar];

    if (required.some((v) => !v)) {
      showToast("Student ID, Campus, College, Course, Year Level, and Scholarship status are required.", "failure");
      return;
    }

    try {
      const profileId = profile?._id;
      if (!profileId) throw new Error("Profile ID not found");
      setIsUpdating(true);
      const payload = { affiliation: { academic_information: formData } };
      const res = await fetch(`/api/profile/${profileId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save academic info");
      const data = await res.json();
      const updatedProfile = data.data || profile;
      const updatedAcademic = updatedProfile?.affiliation?.academic_information || formData;
      setFormData({
        student_id: updatedAcademic.student_id || "",
        campus: updatedAcademic.campus || "",
        college: updatedAcademic.college || "",
        course: updatedAcademic.course || "",
        year_level: updatedAcademic.year_level || "",
        isScholar: updatedAcademic.isScholar || "",
      });
      setProfile(updatedProfile);
      setOriginalData(updatedAcademic);
      setIsEditing(false);
      showToast("Academic information saved successfully.");
      try {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("profileUpdated", { detail: updatedProfile }));
        }
      } catch (e) {}
    } catch (e) {
      console.error(e);
      showToast("Failed to save academic info.", "failure");
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) return (
    <div className="py-6 px-0 md:px-2 max-w-5xl mx-auto">
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-gray-400">
          <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Loading academic information...</p>
        </div>
      </div>
    </div>
  );

  if (!profile) return (
    <div className="py-6 px-0 md:px-2 max-w-5xl mx-auto">
      <div className="text-center py-20">
        <p className="text-gray-500">No profile found.</p>
      </div>
    </div>
  );

  const isStudent = profile?.personal?.currentStatus === "Student";

  if (!isStudent) return (
    <div className="py-6 px-0 md:px-2 max-w-5xl mx-auto">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center">
        <FaGraduationCap className="mx-auto text-amber-400 text-4xl mb-4" />
        <h2 className="text-lg font-semibold text-amber-800 mb-2">Academic Information</h2>
        <p className="text-sm text-amber-700">
          Academic details apply only to students. Set your current status to <strong>Student</strong> in your Personal Information to edit these details.
        </p>
      </div>
    </div>
  );

  const academicCards = [
    { icon: <FaIdBadge />, label: "Student ID", value: formData.student_id, color: "bg-rose-50 text-rose-600" },
    { icon: <FaSchool />, label: "Campus", value: formData.campus, color: "bg-purple-50 text-purple-600" },
    { icon: <FaUniversity />, label: "College", value: formData.college, color: "bg-indigo-50 text-indigo-600" },
    { icon: <FaBookOpen />, label: "Course", value: formData.course, color: "bg-teal-50 text-teal-600" },
    { icon: <FaLayerGroup />, label: "Year Level", value: formData.year_level, color: "bg-amber-50 text-amber-600" },
    { icon: <FaAward />, label: "Scholarship", value: formData.isScholar, color: "bg-sky-50 text-sky-600" },
  ];

  return (
    <div className="py-6 px-0 md:px-2 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Academic Information</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your student academic details</p>
          </div>
          <div className="flex items-center gap-3">
            {isEditing && (
              <button
                onClick={handleSave}
                disabled={isUpdating}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-all disabled:opacity-50 shadow-sm hover:shadow-md"
              >
                <FaSave className="text-xs" />
                {isUpdating ? "Saving..." : "Save Changes"}
              </button>
            )}
            <button
              onClick={() => {
                if (isEditing) {
                  setFormData({
                    student_id: originalData?.student_id || "",
                    campus: originalData?.campus || "",
                    college: originalData?.college || "",
                    course: originalData?.course || "",
                    year_level: originalData?.year_level || "",
                    isScholar: originalData?.isScholar || "",
                  });
                }
                setIsEditing(!isEditing);
              }}
              className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg border transition-all ${
                isEditing
                  ? "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300"
              }`}
            >
              {isEditing ? (
                <><FaTimes className="text-xs" /> Cancel</>
              ) : (
                <><FaEdit className="text-xs" /> Edit</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* View Mode */}
      {!isEditing && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <FaGraduationCap />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Academic Profile</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {academicCards.map((card, i) => (
              <DetailCard key={i} {...card} />
            ))}
          </div>
        </div>
      )}

      {/* Edit Mode */}
      {isEditing && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-8">
          <div className="px-8 py-5 border-b border-gray-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <FaGraduationCap />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">Academic Details</h2>
                <p className="text-xs text-gray-500 mt-0.5">Update your student academic information</p>
              </div>
            </div>
          </div>
          <div className="px-8 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Student ID <span className="text-red-400">*</span></label>
                <input
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 transition-all"
                  value={formData.student_id}
                  onChange={(e) => handleChange("student_id", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Campus <span className="text-red-400">*</span></label>
                <select
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 transition-all"
                  value={formData.campus}
                  onChange={(e) => handleChange("campus", e.target.value)}
                >
                  <option value="">Select Campus</option>
                  {CAMPUS.map((c) => (<option key={c} value={c}>{c}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">College <span className="text-red-400">*</span></label>
                <select
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 transition-all"
                  value={formData.college}
                  onChange={(e) => handleChange("college", e.target.value)}
                >
                  <option value="">Select College</option>
                  {COLLEGES.map((c) => (<option key={c} value={c}>{c}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Course <span className="text-red-400">*</span></label>
                <select
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 transition-all"
                  value={formData.course}
                  onChange={(e) => handleChange("course", e.target.value)}
                >
                  <option value="">Select Course</option>
                  {COURSE.map((c) => (<option key={c} value={c}>{c}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Year Level <span className="text-red-400">*</span></label>
                <select
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 transition-all"
                  value={formData.year_level}
                  onChange={(e) => handleChange("year_level", e.target.value)}
                >
                  <option value="">Select Year Level</option>
                  {YEAR_LEVELS.map((y) => (<option key={y} value={y}>{y}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Scholarship Status <span className="text-red-400">*</span></label>
                <select
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 transition-all"
                  value={formData.isScholar}
                  onChange={(e) => handleChange("isScholar", e.target.value)}
                >
                  <option value="">Select Status</option>
                  {SCHOLAR_STATUS.map((s) => (<option key={s} value={s}>{s}</option>))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      <Toast message={toast.message} type={toast.type} visible={toast.visible} />
    </div>
  );
}