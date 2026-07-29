"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FaUser,
  FaSave,
  FaTimes,
  FaEdit,
  FaVenusMars,
  FaHeart,
  FaGlobeAsia,
  FaBirthdayCake,
  FaTint,
  FaIdBadge,
  FaHash,
  FaGraduationCap,
  FaBriefcase,
  FaBuilding,
  FaUniversity,
  FaLayerGroup,
  FaClock,
  FaBookOpen,
  FaCheckCircle,
  FaUserGraduate,
  FaUserTie,
  FaCalendarAlt,
} from "react-icons/fa";

const CIVIL_STATUS = [
  "Single",
  "Married",
  "Widow",
  "Legally Separated Marriage",
  "Living In/Common Law",
  "Annulled",
];

const RELIGIONS = [
  "Roman Catholic",
  "Iglesia ni Cristo (Church of Christ)",
  "Iglesia Evangelica Metodista en las Islas Filipinas (IEMELIF)",
  "United Church of Christ in the Philippines (UCCP)",
  "Baptist Church",
  "Assemblies of God",
  "Seventh-day Adventist Church",
  "Aglipayan Church (Philippine Independent Church)",
  "Victory Christian Fellowship",
  "Jesus Is Lord Church (JIL)",
  "El Shaddai",
  "Church of the Foursquare Gospel",
  "The Church of Jesus Christ of Latter-day Saints",
  "Jehovah’s Witnesses",
  "Baptist",
  "Other",
];

const BLOOD_TYPES = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
  "Unknown",
];
const CURRENT_STATUS = ["Student", "Employee"];
const CAMPUS = ["Boac", "Sta. Cruz"];


const COLLEGE_TO_PROGRAMS = {
  "Graduate School": [
    "Doctor of Education",
    "Master in Information Technology",
    "Master in Public Administration",
    "Master of Arts in Education",
  ],
  "College of Agriculture": [
    "Bachelor in Agricultural Technology",
    "Bachelor of Science in Agriculture",
  ],
  "College of Allied Health Sciences": [
    "Bachelor of Science in Midwifery",
    "Bachelor of Science in Nursing",
  ],
  "College of Arts and Social Sciences": [
    "Bachelor of Arts in Communication",
    "Bachelor of Arts in English Language Studies",
    "Bachelor of Science in Social Work",
  ],
  "College of Business and Accountancy": [
    "Bachelor of Science in Accountancy",
    "Bachelor of Science in Accounting Information System",
    "Bachelor of Science in Business Administration",
    "Bachelor of Science in Entrepreneurship",
    "Bachelor of Science in Tourism Management",
  ],
  "College of Criminal Justice Education": [
    "Bachelor of Science in Criminology",
    "Bachelor of Science in Law Enforcement Administration",
  ],
  "College of Education": [
    "Bachelor of Culture and Arts Education",
    "Bachelor of Elementary Education",
    "Bachelor of Secondary Education",
    "Bachelor of Technology and Livelihood Education",
    "Certificate in Teachers Professional Education",
  ],
  "College of Engineering": [
    "Bachelor of Science in Civil Engineering",
    "Bachelor of Science in Computer Engineering",
    "Bachelor of Science in Electrical Engineering",
    "Bachelor of Science in Electronics Engineering",
    "Bachelor of Science in Mechanical Engineering",
  ],
  "College of Environmental Studies": [
    "Bachelor of Science in Environmental Science",
  ],
  "College of Fisheries and Aquatic Sciences": [
    "Bachelor of Science in Fisheries",
  ],
  "College of Governance": [
    "Bachelor in Public Administration",
    "Bachelor of Arts in Political Science",
  ],
  "College of Industrial Technology": [
    "Bachelor of Science in Industrial Technology",
  ],
  "College of Information and Computing Sciences": [
    "Bachelor of Science in Information Systems",
    "Bachelor of Science in Information Technology",
  ],
  "Laboratory School": ["Senior-High School"],
};

const COLLEGES = Object.keys(COLLEGE_TO_PROGRAMS);

const YEAR_LEVELS = [
  "1st Year",
  "2nd Year",
  "3rd Year",
  "4th Year",
  "5th Year",
  "6th Year",
];
const SCHOLAR_STATUS = ["Yes", "No"];

const OFFICES = [
  "Graduate School",
  "College of Agriculture",
  "College of Allied Health Sciences",
  "College of Arts and Social Sciences",
  "College of Business and Accountancy",
  "College of Criminal Justice Education",
  "College of Education",
  "College of Engineering",
  "College of Environmental Studies",
  "College of Fisheries and Aquatic Sciences",
  "College of Governance",
  "College of Industrial Technology",
  "College of Information and Computing Sciences",
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
const ALL_APPOINTMENTS = Array.from(
  new Set(Object.values(APPOINTMENT_STATUS_MAP).flat()),
);

const DEFAULT_PERSONAL = {
  first_name: "",
  middle_name: "",
  last_name: "",
  civil_status: "",
  religion: "",
  nationality: "Filipino",
  currentStatus: "",
  birthday: "",
  bloodType: "",
};

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function DetailCard({ icon, label, value, color }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center gap-4">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg shrink-0 ${color || "bg-indigo-50 text-indigo-600"}`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            {label}
          </p>
          <p className="text-base font-semibold text-gray-900 mt-1 truncate">
            {value || "—"}
          </p>
        </div>
      </div>
    </div>
  );
}

function Toast({ message, type, visible }) {
  if (!visible) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
      <div
        className={`flex items-center gap-3 px-6 py-4 rounded-xl shadow-lg border ${
          type === "success"
            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : "bg-red-50 border-red-200 text-red-800"
        }`}
      >
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

export default function PersonalInformationContent({ profile }) {
  const router = useRouter();
  const [currentProfile, setCurrentProfile] = useState(profile || null);
  const [formData, setFormData] = useState(DEFAULT_PERSONAL);
  const [originalData, setOriginalData] = useState(DEFAULT_PERSONAL);
  const [academicData, setAcademicData] = useState({
    student_id: "",
    campus: "",
    college: "",
    course: "",
    year_level: "",
    isScholar: "",
  });
  const [originalAcademic, setOriginalAcademic] = useState(null);
  const [employmentData, setEmploymentData] = useState({
    employee_id: "",
    office: "",
    employment_status: "",
    employment_appointment_status: "",
  });
  const [originalEmployment, setOriginalEmployment] = useState(null);
  const [statusChanged, setStatusChanged] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [toast, setToast] = useState({
    visible: false,
    message: "",
    type: "success",
  });

  const showToast = (message, type = "success") => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3000);
  };

  useEffect(() => {
    const personal = (profile && profile.personal) || {};
    const normalized = {
      ...DEFAULT_PERSONAL,
      ...personal,
      birthday: personal.birthday
        ? new Date(personal.birthday).toISOString().slice(0, 10)
        : "",
    };
    setFormData(normalized);
    setOriginalData(normalized);

    const academic = profile?.affiliation?.academic_information || {};
    const employment = profile?.affiliation?.employment_information || {};
    const normalizedAcademic = {
      student_id: academic.student_id || "",
      campus: academic.campus || "",
      college: academic.college || "",
      course: academic.course || "",
      year_level: academic.year_level || "",
      isScholar: academic.isScholar || "",
    };
    const normalizedEmployment = {
      employee_id: employment.employee_id || "",
      office: employment.office || "",
      employment_status: employment.employment_status || "",
      employment_appointment_status:
        employment.employment_appointment_status || "",
    };
    setAcademicData(normalizedAcademic);
    setOriginalAcademic(normalizedAcademic);
    setEmploymentData(normalizedEmployment);
    setOriginalEmployment(normalizedEmployment);
    setStatusChanged(false);
  }, [profile]);

  const handleChange = (key, value) => {
    if (key === "currentStatus") {
      setIsEditing(true);
      setStatusChanged(true);
      if (value === "Student") {
        setEmploymentData({
          employee_id: "",
          office: "",
          employment_status: "",
          employment_appointment_status: "",
        });
      }
      if (value === "Employee") {
        setAcademicData({
          student_id: "",
          campus: "",
          college: "",
          course: "",
          year_level: "",
          isScholar: "",
        });
      }
    }
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleAcademicChange = (key, value) => {
    setAcademicData((prev) => ({ ...prev, [key]: value }));
  };

  // College and Course are dependent: changing college must clear
  // whatever course was previously selected, since it may not belong
  // to the newly selected college's program list.
  const handleCollegeChange = (value) => {
    setAcademicData((prev) => ({ ...prev, college: value, course: "" }));
  };

  const handleEmploymentChange = (key, value) => {
    setEmploymentData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    const required = [
      formData.first_name,
      formData.last_name,
      formData.civil_status,
      formData.religion,
      formData.currentStatus,
      formData.birthday,
      formData.bloodType,
    ];

    if (required.some((v) => !v)) {
      showToast(
        "First name, Last name, Civil status, Religion, Current Status, Birthday, and Blood Type are required.",
        "failure",
      );
      return;
    }

    const isStudent = formData.currentStatus === "Student";
    const isEmployee = formData.currentStatus === "Employee";

    if (isStudent) {
      const aReq = [
        academicData.student_id,
        academicData.campus,
        academicData.college,
        academicData.course,
        academicData.year_level,
        academicData.isScholar,
      ];
      if (aReq.some((v) => !v)) {
        showToast(
          "Academic info is required when status is Student.",
          "failure",
        );
        return;
      }
    }

    if (isEmployee) {
      const eReq = [
        employmentData.employee_id,
        employmentData.office,
        employmentData.employment_status,
        employmentData.employment_appointment_status,
      ];
      if (eReq.some((v) => !v)) {
        showToast(
          "Employment info is required when status is Employee.",
          "failure",
        );
        return;
      }
    }

    try {
      const profileId = currentProfile?._id;
      if (!profileId) throw new Error("Profile ID not found");
      setIsUpdating(true);

      const payload = {
        personal: {
          ...formData,
          birthday: formData.birthday
            ? new Date(formData.birthday).toISOString()
            : "",
        },
      };

      if (isStudent || isEmployee) {
        payload.affiliation = {};
        if (isStudent) payload.affiliation.academic_information = academicData;
        if (isEmployee)
          payload.affiliation.employment_information = employmentData;
      }

      const res = await fetch(`/api/profile/${profileId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to update profile");
      const data = await res.json();
      const updated = data.data || currentProfile;
      const updatedPersonal = updated.personal || formData;
      const updatedAcademic =
        updated.affiliation?.academic_information || academicData;
      const updatedEmployment =
        updated.affiliation?.employment_information || employmentData;
      const normalized = {
        ...DEFAULT_PERSONAL,
        ...updatedPersonal,
        birthday: updatedPersonal.birthday
          ? new Date(updatedPersonal.birthday).toISOString().slice(0, 10)
          : "",
      };

      setCurrentProfile(updated);
      setFormData(normalized);
      setOriginalData(normalized);
      setAcademicData({ ...updatedAcademic });
      setOriginalAcademic({ ...updatedAcademic });
      setEmploymentData({ ...updatedEmployment });
      setOriginalEmployment({ ...updatedEmployment });
      setStatusChanged(false);
      setIsEditing(false);
      showToast("Personal information saved successfully.");

      try {
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("profileUpdated", { detail: updated }),
          );
        }
      } catch (e) {}
    } catch (err) {
      console.error(err);
      showToast("Failed to update personal info.", "failure");
    } finally {
      setIsUpdating(false);
    }
  };

  const renderField = (label, key, options, required = false) => {
    const value = formData[key];
    if (!isEditing) return null;

    if (options) {
      return (
        <select
          value={value || ""}
          onChange={(e) => handleChange(key, e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
        >
          <option value="">Select {label}</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    }

    const inputType = key === "birthday" ? "date" : "text";
    const maxDate =
      key === "birthday" ? new Date().toISOString().split("T")[0] : undefined;
    return (
      <input
        type={inputType}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
        value={value || ""}
        onChange={(e) => handleChange(key, e.target.value)}
        {...(key === "birthday" ? { max: maxDate } : {})}
      />
    );
  };

  const renderSelect = (
    label,
    value,
    onChange,
    options,
    variant = "indigo",
    disabled = false,
  ) => {
    const focusRing =
      variant === "emerald"
        ? "focus:ring-emerald-200 focus:border-emerald-300"
        : variant === "amber"
          ? "focus:ring-amber-200 focus:border-amber-300"
          : "focus:ring-indigo-200 focus:border-indigo-300";
    return isEditing ? (
      <select
        className={`w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 ${focusRing} transition-all disabled:opacity-60 disabled:cursor-not-allowed`}
        value={value}
        onChange={onChange}
        disabled={disabled}
      >
        <option value="">
          {disabled ? `Select College first` : `Select ${label}`}
        </option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    ) : (
      <p className="text-sm font-semibold text-gray-900 py-2.5">
        {value || "—"}
      </p>
    );
  };

  const renderInput = (label, value, onChange, variant = "indigo") => {
    const focusRing =
      variant === "emerald"
        ? "focus:ring-emerald-200 focus:border-emerald-300"
        : variant === "amber"
          ? "focus:ring-amber-200 focus:border-amber-300"
          : "focus:ring-indigo-200 focus:border-indigo-300";
    return isEditing ? (
      <input
        className={`w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 ${focusRing} transition-all`}
        value={value}
        onChange={onChange}
      />
    ) : (
      <p className="text-sm font-semibold text-gray-900 py-2.5">
        {value || "—"}
      </p>
    );
  };

  // View mode summary cards
  const personalCards = [
    {
      icon: <FaUser />,
      label: "First Name",
      value: formData.first_name,
      color: "bg-indigo-50 text-indigo-600",
    },
    {
      icon: <FaUser />,
      label: "Middle Name",
      value: formData.middle_name,
      color: "bg-indigo-50 text-indigo-600",
    },
    {
      icon: <FaUser />,
      label: "Last Name",
      value: formData.last_name,
      color: "bg-indigo-50 text-indigo-600",
    },
    {
      icon: <FaVenusMars />,
      label: "Civil Status",
      value: formData.civil_status,
      color: "bg-rose-50 text-rose-600",
    },
    {
      icon: <FaHeart />,
      label: "Religion",
      value:
        formData.religion === "Other"
          ? formData.religion_other
          : formData.religion,
      color: "bg-purple-50 text-purple-600",
    },
    {
      icon: <FaGlobeAsia />,
      label: "Nationality",
      value: formData.nationality,
      color: "bg-teal-50 text-teal-600",
    },
    {
      icon: <FaIdBadge />,
      label: "Current Status",
      value: formData.currentStatus,
      color: "bg-amber-50 text-amber-600",
    },
    {
      icon: <FaBirthdayCake />,
      label: "Birthday",
      value: formatDate(formData.birthday),
      color: "bg-sky-50 text-sky-600",
    },
    {
      icon: <FaTint />,
      label: "Blood Type",
      value: formData.bloodType,
      color: "bg-red-50 text-red-600",
    },
  ];

  const availableCourses = COLLEGE_TO_PROGRAMS[academicData.college] || [];

  return (
    <div className="py-6 px-0 md:px-2 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Personal Information
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage your personal profile details
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isEditing && (
              <button
                onClick={handleSave}
                disabled={isUpdating}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-sm hover:shadow-md"
              >
                <FaSave className="text-xs" />
                {isUpdating ? "Saving..." : "Save Changes"}
              </button>
            )}
            <button
              onClick={() => {
                if (isEditing) {
                  setFormData(originalData);
                  setAcademicData(originalAcademic || academicData);
                  setEmploymentData(originalEmployment || employmentData);
                  setStatusChanged(false);
                }
                setIsEditing(!isEditing);
              }}
              className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg border transition-all ${
                isEditing
                  ? "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  : "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300"
              }`}
            >
              {isEditing ? (
                <>
                  <FaTimes className="text-xs" /> Cancel
                </>
              ) : (
                <>
                  <FaEdit className="text-xs" /> Edit
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Personal Information - View Mode */}
      {!isEditing && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <FaUser />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              Basic Information
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {personalCards.map((card, i) => (
              <DetailCard key={i} {...card} />
            ))}
          </div>
        </div>
      )}

      {/* Personal Information - Edit Mode */}
      {isEditing && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-8">
          <div className="px-8 py-5 border-b border-gray-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <FaUser />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  Basic Information
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Update your personal details
                </p>
              </div>
            </div>
          </div>
          <div className="px-8 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                  First Name <span className="text-red-400">*</span>
                </label>
                <input
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
                  value={formData.first_name}
                  onChange={(e) => handleChange("first_name", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                  Middle Name
                </label>
                <input
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
                  value={formData.middle_name}
                  onChange={(e) => handleChange("middle_name", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                  Last Name <span className="text-red-400">*</span>
                </label>
                <input
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
                  value={formData.last_name}
                  onChange={(e) => handleChange("last_name", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                  Civil Status <span className="text-red-400">*</span>
                </label>
                <select
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
                  value={formData.civil_status}
                  onChange={(e) => handleChange("civil_status", e.target.value)}
                >
                  <option value="">Select Civil Status</option>
                  {CIVIL_STATUS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                  Religion <span className="text-red-400">*</span>
                </label>
                <select
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
                  value={formData.religion}
                  onChange={(e) => handleChange("religion", e.target.value)}
                >
                  <option value="">Select Religion</option>
                  {RELIGIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              {formData.religion === "Other" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                    Specify Religion
                  </label>
                  <input
                    className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
                    placeholder="Please specify your religion"
                    value={formData.religion_other || ""}
                    onChange={(e) =>
                      handleChange("religion_other", e.target.value)
                    }
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                  Nationality
                </label>
                <input
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
                  value={formData.nationality}
                  onChange={(e) => handleChange("nationality", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                  Current Status <span className="text-red-400">*</span>
                </label>
                <select
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
                  value={formData.currentStatus}
                  onChange={(e) =>
                    handleChange("currentStatus", e.target.value)
                  }
                >
                  <option value="">Select Status</option>
                  {CURRENT_STATUS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                  Birthday <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
                  value={formData.birthday}
                  onChange={(e) => handleChange("birthday", e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                  Blood Type <span className="text-red-400">*</span>
                </label>
                <select
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
                  value={formData.bloodType}
                  onChange={(e) => handleChange("bloodType", e.target.value)}
                >
                  <option value="">Select Blood Type</option>
                  {BLOOD_TYPES.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Academic Information */}
      {(isEditing ? formData.currentStatus === "Student" : statusChanged) && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-8">
          <div className="px-8 py-5 border-b border-gray-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <FaGraduationCap />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  Academic Information
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Student academic details
                </p>
              </div>
            </div>
          </div>
          <div className="px-8 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                  Student ID
                </label>
                {renderInput(
                  "Student ID",
                  academicData.student_id,
                  (e) => handleAcademicChange("student_id", e.target.value),
                  "emerald",
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                  Campus
                </label>
                {renderSelect(
                  "Campus",
                  academicData.campus,
                  (e) => handleAcademicChange("campus", e.target.value),
                  CAMPUS,
                  "emerald",
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                  College
                </label>
                {renderSelect(
                  "College",
                  academicData.college,
                  (e) => handleCollegeChange(e.target.value),
                  COLLEGES,
                  "emerald",
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                  Course
                </label>
                {renderSelect(
                  "Course",
                  academicData.course,
                  (e) => handleAcademicChange("course", e.target.value),
                  availableCourses,
                  "emerald",
                  !academicData.college,
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                  Year Level
                </label>
                {renderSelect(
                  "Year Level",
                  academicData.year_level,
                  (e) => handleAcademicChange("year_level", e.target.value),
                  YEAR_LEVELS,
                  "emerald",
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                  Scholarship Status
                </label>
                {renderSelect(
                  "Scholarship",
                  academicData.isScholar,
                  (e) => handleAcademicChange("isScholar", e.target.value),
                  SCHOLAR_STATUS,
                  "emerald",
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Employment Information */}
      {(isEditing ? formData.currentStatus === "Employee" : statusChanged) && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-8">
          <div className="px-8 py-5 border-b border-gray-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                <FaBriefcase />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  Employment Information
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Employee work details
                </p>
              </div>
            </div>
          </div>
          <div className="px-8 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                  Employee ID
                </label>
                {renderInput(
                  "Employee ID",
                  employmentData.employee_id,
                  (e) => handleEmploymentChange("employee_id", e.target.value),
                  "amber",
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                  Office
                </label>
                {renderSelect(
                  "Office",
                  employmentData.office,
                  (e) => handleEmploymentChange("office", e.target.value),
                  OFFICES,
                  "amber",
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                  Employment Status
                </label>
                {renderSelect(
                  "Status",
                  employmentData.employment_status,
                  (e) => {
                    handleEmploymentChange("employment_status", e.target.value);
                    handleEmploymentChange("employment_appointment_status", "");
                  },
                  EMPLOYMENT_STATUS,
                  "amber",
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                  Appointment Status
                </label>
                {renderSelect(
                  "Appointment",
                  employmentData.employment_appointment_status,
                  (e) =>
                    handleEmploymentChange(
                      "employment_appointment_status",
                      e.target.value,
                    ),
                  APPOINTMENT_STATUS_MAP[employmentData.employment_status] ||
                    ALL_APPOINTMENTS,
                  "amber",
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
      />
    </div>
  );
}