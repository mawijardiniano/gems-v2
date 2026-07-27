"use client";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useSelector } from "react-redux";
import {
  FaPlus,
  FaTimes,
  FaEdit,
  FaTrash,
  FaUserTie,
  FaUniversity,
  FaSearch,
  FaChevronDown,
  FaChevronRight,
  FaExclamationTriangle,
  FaCheckCircle,
  FaBuilding,
  FaMapMarkerAlt,
  FaGraduationCap,
  FaPrint,
} from "react-icons/fa";
import PrintUniversityOfficials from "../components/Print/PrintUniversityOfficials";

// ─── Constants ─────────────────────────────────────────────────────
const PRESIDENT = ["University President"];
const VICE_POSITIONS = [
  "VP for Academic Affairs",
  "VP for Administration",
  "VP for Research",
  "VP for Students",
];
const CAMPUS_DIRECTOR_POSITION = ["Campus Director", "Center Administrator"];
const MARSU_BRANCH = [
  "MarSU Boac",
  "MarSU Gasan",
  "MarSU Sta. Cruz",
  "MarSU Torrijos",
  "MarSU Mogpog",
];
const COLLEGE = [
  "COE - Laboratory High School",
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
const DEANS = [
  "Dean",
  "Associate Dean",
  "Principal",
  "Concurrent Assoc. Dean for Graduate School Extended Programs",
];
const POSITION_UNDER_PRESIDENT = [
  "Secretary of the University and of the Board of Regents",
  "Chief, Presidential Management Staff",
  "Acting Executive Assistant",
  "Presidential Assistant for Social Media Communications",
  "Presidential Assistant for Advocacy Projects",
  "Director, Institutional Quality Assurance",
  "Director, International Relations & Linkages",
  "Head, Legal Services",
  "Head, Internal Audit Services",
  "Head, Institutional Planning and Development",
  "Head, Information Unit",
  "Focal Point/Person, Gender & Development",
  "Safety Officer",
  "Data Protection Officer",
];
const POSITION_UNDER_VICE_PRESIDENT_ACADEMIC_AFFAIRS = [
  "Director, Curriculum and Instruction",
  "Manager, Science Laboratories",
];
const POSITION_UNDER_VICE_PRESIDENT_ADMIN_FINANCE = [
  "Acting Chief Administrative Officer/Supervising Administrative Officer & Concurrent Head, HRM",
  "Head, General Services",
  "Head, Records Management",
  "Concurrent Head, Security Services",
  "Head, Info & Comm. Technology",
  "Head, Physical Facilities & Project Mgt.",
  "Head, Supply and Property Mgt.",
  "Head, Procurement Unit",
  "Head, Electrical Services",
  "Head, Motorpool Services",
  "Head, Disaster Risk Reduction & Mgt.",
  "Deputy Head, DRRM",
  "Concurrent Director, Financial Services",
  "Head, Accounting Unit",
  "Head, Budgeting Unit",
  "Head, Cashiering Unit",
  "Director, Business Affairs and Prod. Services",
  "Head, Income-Generating Projects",
  "Concurrent Head, Prod. & Commercialization",
];
const POSITION_UNDER_VICE_PRESIDENT_STUDENT_AFFAIRS = [
  "Director, Student Welfare",
  "Concurrent Head, Guidance & Counselling Office",
  "Head, Career and Job Placement",
  "Head, Information & Orientation Service Office",
  "Head, Student Assistantship and Economic Enterprise Development",
  "Director, Student Programs and Services",
  "Head, Admission and Registration",
  "Head, Alumni Relations",
  "Head, Culture and Arts",
  "Head, Foreign/International Student Services",
  "Head, Health Services",
  "Head, Learning Resource Center",
  "Head, Multi-Faith Services",
  "Head, National Service Training Program",
  "Head, Scholarship & Financial Assistance",
  "Head, Sports and Wellness",
  "Head, Student Housing & Residential Services",
  "Focal Person, Services for Persons with Disabilities and Special Needs",
  "Director, Student Development",
  "Head, Student Discipline",
  "Concurrent Head, Student Organization And Activities",
  "Head, Student Publication",
  "Head, Student Volunteer and Community Outreach",
];
const POSITION_UNDER_VICE_PRESIDENT_RESEARCH_EXTENSION = [
  "Concurrent Director, Research",
  "Director, Extension",
  "Director, Publication",
  "Director Knowledge & Technology Transfer Office (KTTO)",
  "Manager, Innovation & Technology Support Office",
];

const SECTIONS = [
  { key: "president", label: "University President", icon: FaUserTie, color: "amber" },
  { key: "vicePresidents", label: "Vice Presidents", icon: FaUserTie, color: "blue" },
  { key: "campusDirectors", label: "Campus Directors", icon: FaMapMarkerAlt, color: "green" },
  { key: "collegeDeans", label: "College Deans", icon: FaGraduationCap, color: "violet" },
  { key: "associateDeans", label: "Associate Deans / Principal", icon: FaGraduationCap, color: "indigo" },
  { key: "office_of_the_president", label: "Officials under the Office of the University President", icon: FaBuilding, color: "amber" },
  { key: "office_of_the_vice_president_academic_affairs", label: "Officials under the Office of the VP for Academic Affairs", icon: FaBuilding, color: "blue" },
  { key: "office_of_the_vice_president_admin_finance", label: "Officials under the Office of the VP for Admin and Finance", icon: FaBuilding, color: "green" },
  { key: "office_of_the_vice_president_student_affairs", label: "Officials under the Office of the VP for Student Affairs", icon: FaBuilding, color: "violet" },
  { key: "office_of_the_vice_president_research_extension", label: "Officials under the Office of the VP for Research and Extension", icon: FaBuilding, color: "indigo" },
];

const SECTION_POSITIONS = {
  president: PRESIDENT,
  vicePresidents: VICE_POSITIONS,
  campusDirectors: CAMPUS_DIRECTOR_POSITION,
  collegeDeans: DEANS,
  associateDeans: DEANS,
  office_of_the_president: POSITION_UNDER_PRESIDENT,
  office_of_the_vice_president_academic_affairs: POSITION_UNDER_VICE_PRESIDENT_ACADEMIC_AFFAIRS,
  office_of_the_vice_president_admin_finance: POSITION_UNDER_VICE_PRESIDENT_ADMIN_FINANCE,
  office_of_the_vice_president_student_affairs: POSITION_UNDER_VICE_PRESIDENT_STUDENT_AFFAIRS,
  office_of_the_vice_president_research_extension: POSITION_UNDER_VICE_PRESIDENT_RESEARCH_EXTENSION,
};

const SECTION_HAS_BRANCH = ["campusDirectors"];
const SECTION_HAS_COLLEGE = ["collegeDeans", "associateDeans"];

// ─── Helpers ───────────────────────────────────────────────────────
function getUserFullName(user) {
  if (!user) return "";
  if (user.personal_info_id?.personal) {
    const p = user.personal_info_id.personal;
    if (p.first_name || p.last_name) return `${p.first_name || ""} ${p.last_name || ""}`.trim();
  }
  if (user.first_name || user.last_name) return `${user.first_name || ""} ${user.last_name || ""}`.trim();
  return user.username || user._id || "";
}

const colorMap = {
  amber: "bg-amber-50 text-amber-600 border-amber-200",
  blue: "bg-blue-50 text-blue-600 border-blue-200",
  green: "bg-emerald-50 text-emerald-600 border-emerald-200",
  violet: "bg-violet-50 text-violet-600 border-violet-200",
  indigo: "bg-indigo-50 text-indigo-600 border-indigo-200",
};

// ─── Skeleton ──────────────────────────────────────────────────────
function SkeletonSection() {
  return (
    <div className="animate-pulse rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden mb-6">
      <div className="px-6 py-4 border-b border-gray-50">
        <div className="h-5 w-48 bg-gray-200 rounded" />
      </div>
      <div className="p-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4">
            <div className="h-4 w-32 bg-gray-200 rounded" />
            <div className="h-4 w-48 bg-gray-200 rounded" />
            <div className="h-4 w-16 bg-gray-200 rounded ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Empty State ───────────────────────────────────────────────────
function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="h-14 w-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-3">
        <Icon className="h-7 w-7 text-gray-300" />
      </div>
      <p className="text-sm font-medium text-gray-900 mb-1">{title}</p>
      <p className="text-xs text-gray-500 text-center max-w-xs mb-4">{description}</p>
      {action}
    </div>
  );
}

// ─── User Search Field ─────────────────────────────────────────────
function UserSearchField({ value, onChange, users, selectedUserId }) {
  const [search, setSearch] = useState(value || "");
  const [showDropdown, setShowDropdown] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handler);
  }, [search]);

  const filteredUsers = useMemo(() => {
    let filtered = users;
    if (debouncedSearch) {
      const s = debouncedSearch.toLowerCase();
      filtered = users.filter(
        (u) =>
          u.username?.toLowerCase().includes(s) ||
          u.personal_info_id?.personal?.first_name?.toLowerCase().includes(s) ||
          u.personal_info_id?.personal?.last_name?.toLowerCase().includes(s),
      );
    }
    return filtered.slice(0, 30);
  }, [debouncedSearch, users]);

  const selectedName = useMemo(() => {
    if (!selectedUserId) return "";
    const u = users.find((u) => u._id === selectedUserId);
    if (!u) return "";
    return getUserFullName(u);
  }, [selectedUserId, users]);

  return (
    <div className="relative">
      <div className="relative">
        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
        <input
          type="text"
          className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition"
          placeholder="Search user by name or username..."
          value={search || selectedName}
          onChange={(e) => {
            setSearch(e.target.value);
            setShowDropdown(true);
            onChange("");
          }}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          autoComplete="off"
          required
        />
      </div>
      {showDropdown && (
        <div className="absolute z-20 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
          {filteredUsers.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-400">No users found</div>
          ) : (
            filteredUsers.map((u) => (
              <button
                key={u._id}
                type="button"
                className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition flex items-center gap-2 ${
                  selectedUserId === u._id ? "bg-blue-50 text-blue-700" : "text-gray-700"
                }`}
                onClick={() => {
                  onChange(u._id);
                  setSearch("");
                  setShowDropdown(false);
                }}
              >
                <div className="h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600 shrink-0">
                  {(u.personal_info_id?.personal?.first_name?.[0] || u.username?.[0] || "?").toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {getUserFullName(u)}
                  </p>
                  <p className="text-xs text-gray-400 truncate">@{u.username}</p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Official Form Fields ──────────────────────────────────────────
function OfficialFormFields({ section, form, onChange, users }) {
  const positions = SECTION_POSITIONS[section] || DEANS;
  const hasBranch = SECTION_HAS_BRANCH.includes(section);
  const hasCollege = SECTION_HAS_COLLEGE.includes(section);

  return (
    <div className="space-y-4">
      {/* Name */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">
          Name
        </label>
        <UserSearchField
          value={form.nameDisplay || ""}
          onChange={(userId) => onChange("name", userId)}
          users={users}
          selectedUserId={form.name}
        />
      </div>

      {/* Position */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">
          Position
        </label>
        <select
          value={form.position || ""}
          onChange={(e) => onChange("position", e.target.value)}
          required
          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition bg-white"
        >
          <option value="">Select Position</option>
          {positions.map((pos) => (
            <option key={pos} value={pos}>{pos}</option>
          ))}
        </select>
      </div>

      {/* Branch (campus directors only) */}
      {hasBranch && (
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">
            Branch
          </label>
          <select
            value={form.branch || ""}
            onChange={(e) => onChange("branch", e.target.value)}
            required
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition bg-white"
          >
            <option value="">Select Branch</option>
            {MARSU_BRANCH.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
      )}

      {/* College (deans only) */}
      {hasCollege && (
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">
            College
          </label>
          <select
            value={form.college || ""}
            onChange={(e) => onChange("college", e.target.value)}
            required
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition bg-white"
          >
            <option value="">Select College</option>
            {COLLEGE.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

// ─── Official Modal ────────────────────────────────────────────────
function OfficialModal({ open, onClose, onSave, title, section, onSectionChange, form, onFormChange, users, error, loading }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                <FaUserTie className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">{title}</h2>
                <p className="text-xs text-gray-500">Add a new university official record</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
            >
              <FaTimes className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={onSave} className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2.5 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              <FaExclamationTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">
              Section
            </label>
            <select
              value={section}
              onChange={onSectionChange}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition bg-white"
            >
              {SECTIONS.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>

          <OfficialFormFields
            section={section}
            form={form}
            onChange={onFormChange}
            users={users}
          />

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-blue-200"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </>
              ) : (
                "Save Official"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Section Card ──────────────────────────────────────────────────
function SectionCard({ section, officials, onEdit, isCoordinator, expanded, onToggle }) {
  const sectionData = useMemo(() => {
    const data = officials?.[section.key];
    return Array.isArray(data) ? data : data ? [data] : [];
  }, [officials, section.key]);

  const Icon = section.icon;
  const color = section.color;

  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden mb-5 transition-all duration-200 hover:shadow-md">
      {/* Section header */}
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition"
      >
        <div className="flex items-center gap-3">
          <div className={`h-9 w-9 rounded-lg ${colorMap[color] || colorMap.blue} flex items-center justify-center`}>
            <Icon className="h-4.5 w-4.5" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-gray-900">{section.label}</h3>
            <p className="text-xs text-gray-500">{sectionData.length} official{sectionData.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            sectionData.length > 0 ? "bg-emerald-50 text-emerald-600" : "bg-gray-50 text-gray-400"
          }`}>
            {sectionData.length > 0 ? "Active" : "Empty"}
          </span>
          {expanded ? (
            <FaChevronDown className="h-3.5 w-3.5 text-gray-400" />
          ) : (
            <FaChevronRight className="h-3.5 w-3.5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-50">
          {sectionData.length === 0 ? (
            <div className="px-6 py-8">
              <EmptyState
                icon={Icon}
                title="No officials in this section"
                description="Add officials to populate this section."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Position</th>
                    {section.key === "campusDirectors" && (
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Branch</th>
                    )}
                    {(section.key === "collegeDeans" || section.key === "associateDeans") && (
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">College</th>
                    )}
                    {!isCoordinator && (
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sectionData.map((o, idx) => (
                    <tr key={o._id || idx} className="hover:bg-gray-50/80 transition-colors duration-150 group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 flex items-center justify-center text-xs font-bold text-blue-700 shrink-0">
                            {(getUserFullName(o.name)?.[0] || "?").toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {getUserFullName(o.name)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">{o.position}</span>
                      </td>
                      {section.key === "campusDirectors" && (
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600">{o.branch}</span>
                        </td>
                      )}
                      {(section.key === "collegeDeans" || section.key === "associateDeans") && (
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600">{o.college}</span>
                        </td>
                      )}
                      {!isCoordinator && (
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => onEdit(section.key, idx)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-300 transition-all opacity-0 group-hover:opacity-100"
                          >
                            <FaEdit className="h-3 w-3" />
                            Edit
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────
export default function UniversityOfficialsContent() {
  const role = useSelector((state) => state.auth.role);
  const isCoordinator = role === "gad coordinator";

  const [officials, setOfficials] = useState(null);
  const [officialsId, setOfficialsId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState({});

  // Add modal state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addSection, setAddSection] = useState(SECTIONS[0].key);
  const [addForm, setAddForm] = useState({});
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editSection, setEditSection] = useState(null);
  const [editIndex, setEditIndex] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  // Success/error banners
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const [users, setUsers] = useState([]);

  // Auto-dismiss
  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(""), 3000); return () => clearTimeout(t); }
  }, [success]);
  useEffect(() => {
    if (error) { const t = setTimeout(() => setError(""), 4000); return () => clearTimeout(t); }
  }, [error]);

  // Fetch data
  const fetchOfficials = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/university-officials");
      const data = await res.json();
      if (data.data?.[0]) {
        setOfficials(data.data[0]);
        setOfficialsId(data.data[0]._id);
      } else {
        setOfficials({});
        setOfficialsId(null);
      }
    } catch {
      setError("Failed to load officials");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/profile");
      const data = await res.json();
      setUsers(data.data || []);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchOfficials();
    fetchUsers();
  }, [fetchOfficials, fetchUsers]);

  // Toggle section expansion
  const toggleSection = (key) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Auto-expand first section with data
  useEffect(() => {
    if (officials && !loading) {
      const firstWithData = SECTIONS.find((sec) => {
        const data = officials[sec.key];
        return Array.isArray(data) ? data.length > 0 : !!data;
      });
      if (firstWithData) {
        setExpandedSections((prev) => {
          if (Object.keys(prev).length === 0) {
            return { [firstWithData.key]: true };
          }
          return prev;
        });
      }
    }
  }, [officials, loading]);

  // ── Add handlers ──────────────────────────────────────────────
  const handleOpenAddModal = () => {
    setAddForm({});
    setAddError("");
    setAddSection(SECTIONS[0].key);
    setAddModalOpen(true);
  };

  const handleCloseAddModal = () => {
    setAddModalOpen(false);
    setAddForm({});
    setAddError("");
  };

  const handleAddFormChange = (field, value) => {
    setAddForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setAddError("");
    setAddLoading(true);
    try {
      const res = await fetch("/api/university-officials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: addSection, data: addForm }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess("Official added successfully!");
        fetchOfficials();
        handleCloseAddModal();
        setExpandedSections((prev) => ({ ...prev, [addSection]: true }));
      } else {
        setAddError(data.error || "Failed to add official");
      }
    } catch {
      setAddError("Network error");
    } finally {
      setAddLoading(false);
    }
  };

  // ── Edit handlers ─────────────────────────────────────────────
  const handleEdit = (sectionKey, index) => {
    setEditSection(sectionKey);
    setEditIndex(index);
    const sectionData = Array.isArray(officials[sectionKey])
      ? officials[sectionKey]
      : officials[sectionKey] ? [officials[sectionKey]] : [];
    const official = sectionData[index];
    setEditForm({
      ...official,
      name: official.name?._id || official.name,
      nameDisplay: getUserFullName(official.name),
    });
    setEditError("");
    setEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setEditForm({});
    setEditSection(null);
    setEditIndex(null);
    setEditError("");
  };

  const handleEditFormChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditError("");
    setEditLoading(true);
    try {
      if (!officialsId) {
        setEditError("No officials document found");
        setEditLoading(false);
        return;
      }
      const res = await fetch(`/api/university-officials/${officialsId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: editSection, index: editIndex, data: editForm }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess("Official updated successfully!");
        fetchOfficials();
        handleCloseEditModal();
      } else {
        setEditError(data.error || "Failed to update official");
      }
    } catch {
      setEditError("Network error");
    } finally {
      setEditLoading(false);
    }
  };

  // ── Stats ─────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!officials) return { total: 0, sectionsWithData: 0 };
    let total = 0;
    let sectionsWithData = 0;
    SECTIONS.forEach((sec) => {
      const data = officials[sec.key];
      const count = Array.isArray(data) ? data.length : data ? 1 : 0;
      total += count;
      if (count > 0) sectionsWithData++;
    });
    return { total, sectionsWithData };
  }, [officials]);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            University Officials
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage university officials and their designations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <PrintUniversityOfficials
            officials={officials}
            SECTIONS={SECTIONS}
            getUserFullName={getUserFullName}
          />
          {!isCoordinator && (
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-sm shadow-blue-200"
            >
              <FaPlus className="h-3.5 w-3.5" />
              Add Official
            </button>
          )}
        </div>
      </div>

      {/* ── Success / Error Banners ─────────────────────────────── */}
      {success && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm animate-slide-up">
          <FaCheckCircle className="h-5 w-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm animate-slide-up">
          <FaExclamationTriangle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Summary ─────────────────────────────────────────────── */}
      {!loading && officials && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <FaUserTie className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Officials</p>
                <p className="text-xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                <FaUniversity className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Sections Populated</p>
                <p className="text-xl font-bold text-gray-900">{stats.sectionsWithData} / {SECTIONS.length}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center">
                <FaBuilding className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</p>
                <p className="text-xl font-bold text-gray-900 text-sm">
                  {officials?.updatedAt
                    ? new Date(officials.updatedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "N/A"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Sections ────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => <SkeletonSection key={i} />)}
        </div>
      ) : !officials || Object.keys(officials).length === 0 ? (
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-12">
          <EmptyState
            icon={FaUserTie}
            title="No officials data"
            description="Add your first university official to get started."
            action={
              !isCoordinator ? (
                <button
                  onClick={handleOpenAddModal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <FaPlus className="h-3 w-3" />
                  Add Official
                </button>
              ) : null
            }
          />
        </div>
      ) : (
        <div>
          {SECTIONS.map((sec) => (
            <SectionCard
              key={sec.key}
              section={sec}
              officials={officials}
              onEdit={handleEdit}
              isCoordinator={isCoordinator}
              expanded={expandedSections[sec.key] || false}
              onToggle={() => toggleSection(sec.key)}
            />
          ))}
        </div>
      )}

      {/* ── Add Modal ───────────────────────────────────────────── */}
      <OfficialModal
        open={addModalOpen}
        onClose={handleCloseAddModal}
        onSave={handleAddSubmit}
        title="Add Official"
        section={addSection}
        onSectionChange={(e) => {
          setAddSection(e.target.value);
          setAddForm({});
          setAddError("");
        }}
        form={addForm}
        onFormChange={handleAddFormChange}
        users={users}
        error={addError}
        loading={addLoading}
      />

      {/* ── Edit Modal ──────────────────────────────────────────── */}
      <OfficialModal
        open={editModalOpen}
        onClose={handleCloseEditModal}
        onSave={handleEditSubmit}
        title="Edit Official"
        section={editSection || SECTIONS[0].key}
        onSectionChange={(e) => setEditSection(e.target.value)}
        form={editForm}
        onFormChange={handleEditFormChange}
        users={users}
        error={editError}
        loading={editLoading}
      />
    </div>
  );
}