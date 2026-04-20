"use client";
import React, { useEffect, useState } from "react";

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
  { key: "president", label: "University President" },
  { key: "vicePresidents", label: "Vice Presidents" },
  { key: "campusDirectors", label: "Campus Directors" },
  { key: "collegeDeans", label: "College Deans" },
  { key: "associateDeans", label: "Associate Deans/Principal" },
  {
    key: "office_of_the_president",
    label: "Officials under the Office of the University President",
  },
  {
    key: "office_of_the_vice_president_academic_affairs",
    label:
      "Officials under the Office of the Vice-President for Academic Affairs",
  },
  {
    key: "office_of_the_vice_president_admin_finance",
    label:
      "Officials under the Office of the Vice-President for Administration and Finance",
  },
  {
    key: "office_of_the_vice_president_student_affairs",
    label:
      "Officials under the Office of the Vice-President for Student Affairs and Services",
  },
  {
    key: "office_of_the_vice_president_research_extension",
    label:
      "Officials under the Office of the Vice-President for Research and Extension",
  },
];

function getUserFullName(user) {
  if (!user) return "";
  if (user.personal_info_id && user.personal_info_id.personal) {
    const p = user.personal_info_id.personal;
    if (p.first_name || p.last_name) {
      return `${p.first_name || ""} ${p.last_name || ""}`.trim();
    }
  }
  if (user.first_name || user.last_name) {
    return `${user.first_name || ""} ${user.last_name || ""}`.trim();
  }
  return user.username || user._id || "";
}

function UniversityOfficialsContent() {
  const [officials, setOfficials] = useState(null);
  const [officialsId, setOfficialsId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [section, setSection] = useState(SECTIONS[0].key);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [addError, setAddError] = useState("");

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editSection, setEditSection] = useState(null);
  const [editIndex, setEditIndex] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [debouncedUserSearch, setDebouncedUserSearch] = useState("");

  useEffect(() => {
    fetchOfficials();
    fetchUsers();
  }, []);

  const fetchOfficials = async () => {
    setLoading(true);
    const res = await fetch("/api/university-officials");
    const data = await res.json();
    if (data.data && data.data[0]) {
      setOfficials(data.data[0]);
      setOfficialsId(data.data[0]._id);
    } else {
      setOfficials({});
      setOfficialsId(null);
    }
    setLoading(false);
  };

  const fetchUsers = async () => {
    const res = await fetch("/api/profile");
    const data = await res.json();
    setUsers(data.data || []);
  };

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedUserSearch(userSearch), 300);
    return () => clearTimeout(handler);
  }, [userSearch]);

  useEffect(() => {
    let filtered = users;
    if (debouncedUserSearch) {
      const s = debouncedUserSearch.toLowerCase();
      filtered = users.filter(
        (u) =>
          u.username?.toLowerCase().includes(s) ||
          u.personal_info_id?.personal?.first_name?.toLowerCase().includes(s) ||
          u.personal_info_id?.personal?.last_name?.toLowerCase().includes(s),
      );
    }
    setFilteredUsers(filtered.slice(0, 30));
  }, [debouncedUserSearch, users]);

  const handleOpenModal = () => {
    setForm({});
    setAddError("");
    setUserSearch("");
    setShowUserDropdown(false);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setForm({});
    setAddError("");
    setUserSearch("");
    setShowUserDropdown(false);
  };

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSectionChange = (e) => {
    setSection(e.target.value);
    setForm({});
    setAddError("");
    setUserSearch("");
    setShowUserDropdown(false);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setAddError("");
    setLoading(true);
    try {
      const res = await fetch("/api/university-officials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, data: form }),
      });
      const data = await res.json();
      if (data.success) {
        fetchOfficials();
        handleCloseModal();
      } else {
        setAddError(data.error || "Failed to add official");
      }
    } catch (err) {
      setAddError("Network error");
    }
    setLoading(false);
  };


  const handlePrintOfficials = () => {
  if (!officials) return;

  const html = `
    <html>
      <head>
        <title>University Officials Report</title>
       <style>
  body {
    font-family: Arial, sans-serif;
    padding: 20px;
    margin: 0;
  }

  h2 {
    text-align: center;
    margin: 0 0 20px 0;
  }

  h4 {
    margin: 16px 0 6px 0;
  }

  table {
    border-collapse: collapse;
    width: 100%;
    margin: 10px; 
  }

  th, td {
    border: 1px solid #333;
    padding: 6px;
    font-size: 12px;
  }

  th {
    background: #f2f2f2;
  }
</style>
      </head>
      <body>
        <h2>University Officials Report</h2>

        ${SECTIONS.map((sec) => {
          const sectionData = Array.isArray(officials[sec.key])
            ? officials[sec.key]
            : officials[sec.key]
              ? [officials[sec.key]]
              : [];

          if (!sectionData.length) return "";

          return `
            <h4>${sec.label}</h4>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Position</th>
                  ${
                    sec.key === "campusDirectors"
                      ? "<th>Branch</th>"
                      : sec.key === "collegeDeans" || sec.key === "associateDeans"
                      ? "<th>College</th>"
                      : ""
                  }
                </tr>
              </thead>
              <tbody>
                ${sectionData
                  .map((o) => {
                    const name = getUserFullName(o.name);
                    const position = o.position || "";
                    const branch = o.branch || "";
                    const college = o.college || "";

                    return `
                      <tr>
                        <td>${name}</td>
                        <td>${position}</td>
                        ${
                          sec.key === "campusDirectors"
                            ? `<td>${branch}</td>`
                            : sec.key === "collegeDeans" ||
                              sec.key === "associateDeans"
                            ? `<td>${college}</td>`
                            : ""
                        }
                      </tr>
                    `;
                  })
                  .join("")}
              </tbody>
            </table>
         
          `;
        }).join("")}
      </body>
    </html>
  `;

  const iframe = document.createElement("iframe");
  Object.assign(iframe.style, {
    position: "fixed",
    right: "0",
    bottom: "0",
    width: "0",
    height: "0",
    border: "0",
  });

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(html);
  doc.close();

  iframe.onload = () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => document.body.removeChild(iframe), 1000);
  };
};

  const renderNameField = () => (
    <div className="relative">
      <input
        type="text"
        className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
        placeholder="Search user by name or username"
        value={userSearch || form.nameDisplay || ""}
        onChange={(e) => {
          setUserSearch(e.target.value);
          setShowUserDropdown(true);
          setForm((f) => ({ ...f, name: "", nameDisplay: "" }));
        }}
        onFocus={() => setShowUserDropdown(true)}
        autoComplete="off"
        required
      />
      {showUserDropdown && (
        <div className=" bg-white border rounded w-full max-h-32 overflow-y-auto shadow-lg mt-1">
          {filteredUsers.length === 0 && (
            <div className="p-2 text-gray-400">No users found</div>
          )}
          {filteredUsers.map((u) => (
            <div
              key={u._id}
              className={`p-2 cursor-pointer hover:bg-blue-100 ${form.name === u._id ? "bg-blue-200" : ""}`}
              onClick={() => {
                setForm((f) => ({
                  ...f,
                  name: u._id,
                  nameDisplay:
                    `${u.personal_info_id?.personal?.first_name || ""} ${u.personal_info_id?.personal?.last_name || ""}`.trim(),
                }));
                setUserSearch("");
                setShowUserDropdown(false);
              }}
            >
              {u.personal_info_id?.personal?.first_name}{" "}
              {u.personal_info_id?.personal?.last_name}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderFormFields = () => {
    switch (section) {
      case "president":
        return (
          <>
            <label>
              Name:
              {renderNameField()}
            </label>
            <label>
              Position:
              <select
                name="position"
                value={form.position || ""}
                onChange={handleChange}
                required
                className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">Select Position</option>
                {PRESIDENT.map((pos) => (
                  <option key={pos} value={pos}>
                    {pos}
                  </option>
                ))}
              </select>
            </label>
          </>
        );
      case "vicePresidents":
        return (
          <>
            <label>
              Name:
              {renderNameField()}
            </label>
            <label>
              Position:
              <select
                name="position"
                value={form.position || ""}
                onChange={handleChange}
                required
                className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">Select Position</option>
                {VICE_POSITIONS.map((pos) => (
                  <option key={pos} value={pos}>
                    {pos}
                  </option>
                ))}
              </select>
            </label>
          </>
        );
      case "campusDirectors":
        return (
          <>
            <label>Name:{renderNameField()}</label>
            <label>
              Position:{" "}
              <select
                name="position"
                value={form.position || ""}
                onChange={handleChange}
                required
                className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">Select Position</option>
                {CAMPUS_DIRECTOR_POSITION.map((pos) => (
                  <option key={pos} value={pos}>
                    {pos}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Branch:{" "}
              <select
                name="branch"
                value={form.branch || ""}
                onChange={handleChange}
                className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
              >
                <option value="">Select Branch</option>
                {MARSU_BRANCH.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </label>
          </>
        );
      case "collegeDeans":
        return (
          <>
            <label>Name: {renderNameField()}</label>
            <label>
              Position:{" "}
              <select
                name="position"
                value={form.position || ""}
                onChange={handleChange}
                className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
              >
                <option value="">Select Position</option>
                {DEANS.map((pos) => (
                  <option key={pos} value={pos}>
                    {pos}
                  </option>
                ))}
              </select>
            </label>
            <label>
              College:{" "}
              <select
                name="college"
                value={form.college || ""}
                onChange={handleChange}
                className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
              >
                <option value="">Select College</option>
                {COLLEGE.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </>
        );
      case "associateDeans":
        return (
          <>
            <label>Name:{renderNameField()}</label>
            <label>
              Position:{" "}
              <select
                name="position"
                value={form.position || ""}
                onChange={handleChange}
                className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
              >
                <option value="">Select Position</option>
                {DEANS.map((pos) => (
                  <option key={pos} value={pos}>
                    {pos}
                  </option>
                ))}
              </select>
            </label>
            <label>
              College:{" "}
              <select
                name="college"
                value={form.college || ""}
                onChange={handleChange}
                className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
              >
                <option value="">Select College</option>
                {COLLEGE.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </>
        );
      case "office_of_the_president":
        return (
          <>
            <label>Name:{renderNameField()}</label>
            <label>
              Position:{" "}
              <select
                name="position"
                value={form.position || ""}
                onChange={handleChange}
                className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
              >
                <option value="">Select Position</option>
                {POSITION_UNDER_PRESIDENT.map((pos) => (
                  <option key={pos} value={pos}>
                    {pos}
                  </option>
                ))}
              </select>
            </label>
          </>
        );
      case "office_of_the_vice_president_academic_affairs":
        return (
          <>
            <label>Name:{renderNameField()}</label>
            <label>
              Position:{" "}
              <select
                name="position"
                value={form.position || ""}
                onChange={handleChange}
                className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
              >
                <option value="">Select Position</option>
                {POSITION_UNDER_VICE_PRESIDENT_ACADEMIC_AFFAIRS.map((pos) => (
                  <option key={pos} value={pos}>
                    {pos}
                  </option>
                ))}
              </select>
            </label>
          </>
        );
      case "office_of_the_vice_president_admin_finance":
        return (
          <>
            <label>Name:{renderNameField()}</label>
            <label>
              Position:{" "}
              <select
                name="position"
                value={form.position || ""}
                onChange={handleChange}
                className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
              >
                <option value="">Select Position</option>
                {POSITION_UNDER_VICE_PRESIDENT_ADMIN_FINANCE.map((pos) => (
                  <option key={pos} value={pos}>
                    {pos}
                  </option>
                ))}
              </select>
            </label>
          </>
        );
      case "office_of_the_vice_president_student_affairs":
        return (
          <>
            <label>Name:{renderNameField()}</label>
            <label>
              Position:{" "}
              <select
                name="position"
                value={form.position || ""}
                onChange={handleChange}
                className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
              >
                <option value="">Select Position</option>
                {POSITION_UNDER_VICE_PRESIDENT_STUDENT_AFFAIRS.map((pos) => (
                  <option key={pos} value={pos}>
                    {pos}
                  </option>
                ))}
              </select>
            </label>
          </>
        );
      case "office_of_the_vice_president_research_extension":
        return (
          <>
            <label>Name:{renderNameField()}</label>
            <label>
              Position:{" "}
              <select
                name="position"
                value={form.position || ""}
                onChange={handleChange}
                className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
              >
                <option value="">Select Position</option>
                {POSITION_UNDER_VICE_PRESIDENT_RESEARCH_EXTENSION.map((pos) => (
                  <option key={pos} value={pos}>
                    {pos}
                  </option>
                ))}
              </select>
            </label>
          </>
        );
      default:
        return (
          <>
            <label>Name:{renderNameField()}</label>
            <label>
              Position:{" "}
              <select
                name="position"
                value={form.position || ""}
                onChange={handleChange}
                className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
              >
                <option value="">Select Position</option>
                {DEANS.map((pos) => (
                  <option key={pos} value={pos}>
                    {pos}
                  </option>
                ))}
              </select>
            </label>
            <label>
              College:{" "}
              <select
                name="college"
                value={form.college || ""}
                onChange={handleChange}
                className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
              >
                <option value="">Select College</option>
                {COLLEGE.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </>
        );
    }
  };

  const handleEdit = (sectionKey, index) => {
    setEditSection(sectionKey);
    setEditIndex(index);
    const sectionData = Array.isArray(officials[sectionKey])
      ? officials[sectionKey]
      : officials[sectionKey]
        ? [officials[sectionKey]]
        : [];
    const official = sectionData[index];
    setEditForm({
      ...official,
      name: official.name?._id || official.name,
      nameDisplay: getUserFullName(official.name),
    });
    setUserSearch("");
    setShowUserDropdown(false);
    setEditError("");
    setEditLoading(false);
    setEditModalOpen(true);
  };

  // Interactive name field for edit modal
  const renderEditNameField = () => (
    <div className="relative">
      <input
        type="text"
        className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
        placeholder="Search user by name or username"
        value={userSearch || editForm.nameDisplay || ""}
        onChange={(e) => {
          setUserSearch(e.target.value);
          setShowUserDropdown(true);
          setEditForm((f) => ({ ...f, name: "", nameDisplay: "" }));
        }}
        onFocus={() => setShowUserDropdown(true)}
        autoComplete="off"
        required
      />
      {showUserDropdown && (
        <div className=" bg-white border rounded w-full max-h-32 overflow-y-auto shadow-lg mt-1">
          {filteredUsers.length === 0 && (
            <div className="p-2 text-gray-400">No users found</div>
          )}
          {filteredUsers.map((u) => (
            <div
              key={u._id}
              className={`p-2 cursor-pointer hover:bg-blue-100 ${editForm.name === u._id ? "bg-blue-200" : ""}`}
              onClick={() => {
                setEditForm((f) => ({
                  ...f,
                  name: u._id,
                  nameDisplay:
                    `${u.personal_info_id?.personal?.first_name || ""} ${u.personal_info_id?.personal?.last_name || ""}`.trim(),
                }));
                setUserSearch("");
                setShowUserDropdown(false);
              }}
            >
              {u.personal_info_id?.personal?.first_name}{" "}
              {u.personal_info_id?.personal?.last_name}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setEditForm({});
    setEditSection(null);
    setEditIndex(null);
    setEditError("");
    setEditLoading(false);
  };

  const handleEditChange = (e) => {
    setEditForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
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
        body: JSON.stringify({
          section: editSection,
          index: editIndex,
          data: editForm,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchOfficials();
        handleCloseEditModal();
      } else {
        setEditError(data.error || "Failed to update official");
      }
    } catch (err) {
      setEditError("Network error");
    }
    setEditLoading(false);
  };

  const renderOfficialsTable = () => {
    if (!officials) return null;
    return (
      <>
        {SECTIONS.map((sec) => {
          const sectionData = Array.isArray(officials[sec.key])
            ? officials[sec.key]
            : officials[sec.key]
              ? [officials[sec.key]]
              : [];
          return (
            <div key={sec.key}>
              <div className="mt-6 mb-2 text-lg font-semibold text-slate-800">
                {sec.label}
              </div>
              <div className="overflow-x-auto rounded-xl shadow bg-white mb-6">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Position
                      </th>
                      {sec.key === "campusDirectors" && (
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Branch
                        </th>
                      )}
                      {sec.key === "collegeDeans" && (
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          College
                        </th>
                      )}
                      {sec.key === "associateDeans" && (
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          College
                        </th>
                      )}
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Edit
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {sectionData.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="text-center text-gray-400 py-6"
                        >
                          No data
                        </td>
                      </tr>
                    ) : (
                      sectionData.map((o, idx) => (
                        <tr
                          key={o._id || o.name}
                          className="hover:bg-slate-50 transition"
                        >
                          <td className="px-6 py-3 whitespace-nowrap">
                            {getUserFullName(o.name)}
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap">
                            {o.position}
                          </td>
                          {sec.key === "campusDirectors" && (
                            <td className="px-6 py-3 whitespace-nowrap">
                              {o.branch}
                            </td>
                          )}
                          {sec.key === "collegeDeans" && (
                            <td className="px-6 py-3 whitespace-nowrap">
                              {o.college}
                            </td>
                          )}
                          {sec.key === "associateDeans" && (
                            <td className="px-6 py-3 whitespace-nowrap">
                              {o.college}
                            </td>
                          )}
                          <td className="px-6 py-3 whitespace-nowrap">
                            <button
                              className="text-blue-600 hover:underline font-semibold"
                              onClick={() => handleEdit(sec.key, idx)}
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </>
    );
  };

  return (
    <div className="p-6">
      <div className="flex justify-between">
        <h2 className="text-2xl font-bold mb-6 text-slate-800">
          University Officials
        </h2>
        <div className="flex gap-4">
          <button
  onClick={handlePrintOfficials}
  className="mb-4 px-5 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition font-semibold"
>
  Print Officials
</button>
        <button
          onClick={handleOpenModal}
          className="mb-4 px-5 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition font-semibold"
        >
          Add Official
        </button>
        </div>
       
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/30 bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl min-w-[320px] min-h-[200px] relative shadow-xl w-full max-w-md">
            <button
              onClick={handleCloseModal}
              className="absolute top-2 right-3 text-5xl text-gray-400 hover:text-gray-700 focus:outline-none"
              aria-label="Close"
            >
              &times;
            </button>
            <h3 className="text-lg font-bold mb-4 text-slate-700">
              Add Official
            </h3>
            <form onSubmit={handleAdd} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1 font-medium text-slate-700">
                Section:
                <select
                  value={section}
                  onChange={handleSectionChange}
                  className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  {SECTIONS.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              {renderFormFields()}
              {addError && (
                <div className="text-red-600 text-sm">{addError}</div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition font-semibold disabled:opacity-60"
              >
                {loading ? "Adding..." : "Add"}
              </button>
            </form>
          </div>
        </div>
      )}
      {editModalOpen && (
        <div className="fixed inset-0 bg-black/30 bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl min-w-[320px] min-h-[200px] relative shadow-xl w-full max-w-md">
            <button
              onClick={handleCloseEditModal}
              className="absolute top-2 right-3 text-5xl text-gray-400 hover:text-gray-700 focus:outline-none"
              aria-label="Close"
            >
              &times;
            </button>
            <h3 className="text-lg font-bold mb-4 text-slate-700">
              Edit Official
            </h3>
            <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1 font-medium text-slate-700">
                Section:
                <select
                  value={editSection || ""}
                  onChange={(e) => setEditSection(e.target.value)}
                  className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  {SECTIONS.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              {(() => {
                switch (editSection) {
                  case "president":
                    return (
                      <>
                        <label>
                          Name:
                          {renderEditNameField()}
                        </label>
                        <label>
                          Position:
                          <select
                            name="position"
                            value={editForm.position || ""}
                            onChange={handleEditChange}
                            required
                            className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                          >
                            <option value="">Select Position</option>
                            {PRESIDENT.map((pos) => (
                              <option key={pos} value={pos}>
                                {pos}
                              </option>
                            ))}
                          </select>
                        </label>
                      </>
                    );
                  case "vicePresidents":
                    return (
                      <>
                        <label>
                          Name:
                          {renderEditNameField()}
                        </label>
                        <label>
                          Position:
                          <select
                            name="position"
                            value={editForm.position || ""}
                            onChange={handleEditChange}
                            required
                            className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                          >
                            <option value="">Select Position</option>
                            {VICE_POSITIONS.map((pos) => (
                              <option key={pos} value={pos}>
                                {pos}
                              </option>
                            ))}
                          </select>
                        </label>
                      </>
                    );
                  case "campusDirectors":
                    return (
                      <>
                        <label>Name:{renderEditNameField()}</label>
                        <label>
                          Position:
                          <select
                            name="position"
                            value={editForm.position || ""}
                            onChange={handleEditChange}
                            required
                            className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                          >
                            <option value="">Select Position</option>
                            {CAMPUS_DIRECTOR_POSITION.map((pos) => (
                              <option key={pos} value={pos}>
                                {pos}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Branch:
                          <select
                            name="branch"
                            value={editForm.branch || ""}
                            onChange={handleEditChange}
                            className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                            required
                          >
                            <option value="">Select Branch</option>
                            {MARSU_BRANCH.map((b) => (
                              <option key={b} value={b}>
                                {b}
                              </option>
                            ))}
                          </select>
                        </label>
                      </>
                    );
                  case "collegeDeans":
                    return (
                      <>
                        <label>Name: {renderEditNameField()}</label>
                        <label>
                          Position:
                          <select
                            name="position"
                            value={editForm.position || ""}
                            onChange={handleEditChange}
                            className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                            required
                          >
                            <option value="">Select Position</option>
                            {DEANS.map((pos) => (
                              <option key={pos} value={pos}>
                                {pos}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          College:
                          <select
                            name="college"
                            value={editForm.college || ""}
                            onChange={handleEditChange}
                            className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                            required
                          >
                            <option value="">Select College</option>
                            {COLLEGE.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </label>
                      </>
                    );
                  case "associateDeans":
                    return (
                      <>
                        <label>Name:{renderEditNameField()}</label>
                        <label>
                          Position:
                          <select
                            name="position"
                            value={editForm.position || ""}
                            onChange={handleEditChange}
                            className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                            required
                          >
                            <option value="">Select Position</option>
                            {DEANS.map((pos) => (
                              <option key={pos} value={pos}>
                                {pos}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          College:
                          <select
                            name="college"
                            value={editForm.college || ""}
                            onChange={handleEditChange}
                            className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                            required
                          >
                            <option value="">Select College</option>
                            {COLLEGE.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </label>
                      </>
                    );
                  case "office_of_the_president":
                    return (
                      <>
                        <label>Name:{renderEditNameField()}</label>
                        <label>
                          Position:
                          <select
                            name="position"
                            value={editForm.position || ""}
                            onChange={handleEditChange}
                            className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                            required
                          >
                            <option value="">Select Position</option>
                            {POSITION_UNDER_PRESIDENT.map((pos) => (
                              <option key={pos} value={pos}>
                                {pos}
                              </option>
                            ))}
                          </select>
                        </label>
                      </>
                    );
                  case "office_of_the_vice_president_academic_affairs":
                    return (
                      <>
                        <label>Name:{renderEditNameField()}</label>
                        <label>
                          Position:
                          <select
                            name="position"
                            value={editForm.position || ""}
                            onChange={handleEditChange}
                            className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                            required
                          >
                            <option value="">Select Position</option>
                            {POSITION_UNDER_VICE_PRESIDENT_ACADEMIC_AFFAIRS.map(
                              (pos) => (
                                <option key={pos} value={pos}>
                                  {pos}
                                </option>
                              ),
                            )}
                          </select>
                        </label>
                      </>
                    );
                  case "office_of_the_vice_president_admin_finance":
                    return (
                      <>
                        <label>Name:{renderEditNameField()}</label>
                        <label>
                          Position:
                          <select
                            name="position"
                            value={editForm.position || ""}
                            onChange={handleEditChange}
                            className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                            required
                          >
                            <option value="">Select Position</option>
                            {POSITION_UNDER_VICE_PRESIDENT_ADMIN_FINANCE.map(
                              (pos) => (
                                <option key={pos} value={pos}>
                                  {pos}
                                </option>
                              ),
                            )}
                          </select>
                        </label>
                      </>
                    );
                  case "office_of_the_vice_president_student_affairs":
                    return (
                      <>
                        <label>Name:{renderEditNameField()}</label>
                        <label>
                          Position:
                          <select
                            name="position"
                            value={editForm.position || ""}
                            onChange={handleEditChange}
                            className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                            required
                          >
                            <option value="">Select Position</option>
                            {POSITION_UNDER_VICE_PRESIDENT_STUDENT_AFFAIRS.map(
                              (pos) => (
                                <option key={pos} value={pos}>
                                  {pos}
                                </option>
                              ),
                            )}
                          </select>
                        </label>
                      </>
                    );
                  case "office_of_the_vice_president_research_extension":
                    return (
                      <>
                        <label>Name:{renderEditNameField()}</label>
                        <label>
                          Position:
                          <select
                            name="position"
                            value={editForm.position || ""}
                            onChange={handleEditChange}
                            className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                            required
                          >
                            <option value="">Select Position</option>
                            {POSITION_UNDER_VICE_PRESIDENT_RESEARCH_EXTENSION.map(
                              (pos) => (
                                <option key={pos} value={pos}>
                                  {pos}
                                </option>
                              ),
                            )}
                          </select>
                        </label>
                      </>
                    );
                  default:
                    return (
                      <>
                        <label>Name:{renderEditNameField()}</label>
                        <label>
                          Position:
                          <select
                            name="position"
                            value={editForm.position || ""}
                            onChange={handleEditChange}
                            className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                            required
                          >
                            <option value="">Select Position</option>
                            {DEANS.map((pos) => (
                              <option key={pos} value={pos}>
                                {pos}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          College:
                          <select
                            name="college"
                            value={editForm.college || ""}
                            onChange={handleEditChange}
                            className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                            required
                          >
                            <option value="">Select College</option>
                            {COLLEGE.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </label>
                      </>
                    );
                }
              })()}
              {editError && (
                <div className="text-red-600 text-sm">{editError}</div>
              )}
              <button
                type="submit"
                disabled={editLoading}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition font-semibold disabled:opacity-60"
              >
                {editLoading ? "Editing..." : "Edit"}
              </button>
            </form>
          </div>
        </div>
      )}
      <div className="mt-8">
        {loading ? (
          <div className="text-center text-gray-500">Loading...</div>
        ) : (
          renderOfficialsTable()
        )}
      </div>
    </div>
  );
}

export default UniversityOfficialsContent;
