"use client";

import { useEffect, useState } from "react";
import {
  FaSave,
  FaTimes,
  FaEdit,
  FaCheckCircle,
  FaBriefcase,
  FaBuilding,
  FaIdBadge,
  FaUserTie,
  FaClipboardList,
} from "react-icons/fa";

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
    "Regular", "Temporary", "Coterminous", "Casual", "Job Order",
    "Contract of Service (Skilled)", "Utility Worker",
  ],
  Faculty: [
    "Regular", "Temporary", "University Lecturer", "Part-time Lecturer",
    "Clinical Instructor", "Adjunct",
  ],
};

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
        const employment = profileObj?.affiliation?.employment_information || null;
        setFormData({
          employee_id: employment?.employee_id || "",
          office: employment?.office || "",
          employment_status: employment?.employment_status || "",
          employment_appointment_status: employment?.employment_appointment_status || "",
        });
        setOriginalData(employment);
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
    setFormData((p) => {
      const updated = { ...p, [key]: value };
      if (key === "employment_status") {
        updated.employment_appointment_status = "";
      }
      return updated;
    });

  const handleSave = async () => {
    if (!formData.employee_id || !formData.office || !formData.employment_status) {
      showToast("Employee ID, Office and Employment Status are required.", "failure");
      return;
    }
    if (formData.employment_status === "Non-teaching Personnel" && !formData.employment_appointment_status) {
      showToast("Appointment status is required for Non-teaching Personnel.", "failure");
      return;
    }

    try {
      const userId = profile?._id;
      if (!userId) throw new Error("User ID not found");
      setIsUpdating(true);

      const payload = { affiliation: { employment_information: formData } };

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

      const updatedEmployment = data.data.affiliation?.employment_information || formData;
      setFormData({
        employee_id: updatedEmployment.employee_id || "",
        office: updatedEmployment.office || "",
        employment_status: updatedEmployment.employment_status || "",
        employment_appointment_status: updatedEmployment.employment_appointment_status || "",
      });
      setOriginalData(updatedEmployment);
      setIsEditing(false);
      showToast("Employment information saved successfully.");

      try {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("profileUpdated", { detail: data.data }));
        }
      } catch (e) {}
    } catch (e) {
      console.error(e);
      showToast("Failed to save employment info.", "failure");
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) return (
    <div className="py-6 px-0 md:px-2 max-w-5xl mx-auto">
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-gray-400">
          <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Loading employment information...</p>
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

  const employmentCards = [
    { icon: <FaIdBadge />, label: "Employee ID", value: formData.employee_id, color: "bg-rose-50 text-rose-600" },
    { icon: <FaBuilding />, label: "Office", value: formData.office, color: "bg-purple-50 text-purple-600" },
    { icon: <FaUserTie />, label: "Employment Status", value: formData.employment_status, color: "bg-amber-50 text-amber-600" },
    { icon: <FaClipboardList />, label: "Appointment Status", value: formData.employment_appointment_status, color: "bg-teal-50 text-teal-600" },
  ];

  return (
    <div className="py-6 px-0 md:px-2 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Employment Information</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your employment and work details</p>
          </div>
          <div className="flex items-center gap-3">
            {isEditing && (
              <button
                onClick={handleSave}
                disabled={isUpdating}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white text-sm font-semibold rounded-lg hover:bg-amber-700 transition-all disabled:opacity-50 shadow-sm hover:shadow-md"
              >
                <FaSave className="text-xs" />
                {isUpdating ? "Saving..." : "Save Changes"}
              </button>
            )}
            <button
              onClick={() => {
                if (isEditing) {
                  setFormData({
                    employee_id: originalData?.employee_id || "",
                    office: originalData?.office || "",
                    employment_status: originalData?.employment_status || "",
                    employment_appointment_status: originalData?.employment_appointment_status || "",
                  });
                }
                setIsEditing(!isEditing);
              }}
              className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg border transition-all ${
                isEditing
                  ? "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  : "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 hover:border-amber-300"
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
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <FaBriefcase />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Employment Profile</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {employmentCards.map((card, i) => (
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
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                <FaBriefcase />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">Employment Details</h2>
                <p className="text-xs text-gray-500 mt-0.5">Update your employment information</p>
              </div>
            </div>
          </div>
          <div className="px-8 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Employee ID <span className="text-red-400">*</span></label>
                <input
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300 transition-all"
                  value={formData.employee_id}
                  onChange={(e) => handleChange("employee_id", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Office <span className="text-red-400">*</span></label>
                <select
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300 transition-all"
                  value={formData.office}
                  onChange={(e) => handleChange("office", e.target.value)}
                >
                  <option value="">Select Office</option>
                  {OFFICES.map((c) => (<option key={c} value={c}>{c}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Employment Status <span className="text-red-400">*</span></label>
                <select
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300 transition-all"
                  value={formData.employment_status}
                  onChange={(e) => handleChange("employment_status", e.target.value)}
                >
                  <option value="">Select Status</option>
                  {EMPLOYMENT_STATUS.map((s) => (<option key={s} value={s}>{s}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Appointment Status</label>
                <select
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300 transition-all disabled:opacity-50"
                  value={formData.employment_appointment_status}
                  onChange={(e) => handleChange("employment_appointment_status", e.target.value)}
                  disabled={!formData.employment_status}
                >
                  <option value="">Select Appointment</option>
                  {(formData.employment_status
                    ? APPOINTMENT_STATUS_MAP[formData.employment_status] || []
                    : []
                  ).map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
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