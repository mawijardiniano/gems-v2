"use client";

import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";

const SECTIONS = [
  { key: "chairOrHeadOfAgency", label: "Chair/Head of Agency" },
  { key: "executiveCommittee", label: "Executive Committee" },
  { key: "technicalWorkingGroup", label: "Technical Working Group" },
  { key: "secretariat", label: "Secretariat" },
];

const SECTION_CHOICES = [
  { key: "chairOrHeadOfAgency", label: "Chair/Head of Agency" },
  { key: "executiveCommittee", label: "Executive Committee" },
  { key: "technicalWorkingGroup", label: "Technical Working Group" },
  { key: "secretariat", label: "Secretariat" },
];

const OFFICIAL_GROUPS_ORDER = [
  "president",
  "vicePresidents",
  "campusDirectors",
  "collegeDeans",
  "associateDeans",
  "office_of_the_president",
  "office_of_the_vice_president_academic_affairs",
  "office_of_the_vice_president_admin_finance",
  "office_of_the_vice_president_student_affairs",
  "office_of_the_vice_president_research_extension",
];

function CheckboxTree({ officials, selected, onChange }) {
  const [expanded, setExpanded] = React.useState({});

  const handleSectionToggle = (section) => {
    setExpanded((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const selectedSet = React.useMemo(() => new Set(selected || []), [selected]);

  const handleSectionCheck = (section, checked) => {
    const items = Array.isArray(officials[section]) ? officials[section] : [];
    const allKeys = items.map(
      (item) => `${section}:${item.name?._id || item._id || item.name}`,
    );
    if (checked) {
      onChange((prev) => [...new Set([...prev, ...allKeys])]);
      setExpanded((prev) => ({ ...prev, [section]: true }));
    } else {
      onChange((prev) => prev.filter((id) => !allKeys.includes(id)));
    }
  };

  const handleItemCheck = (section, id, checked) => {
    const key = `${section}:${id}`;
    if (checked) {
      onChange([...new Set([...selected, key])]);
    } else {
      onChange(selected.filter((sid) => sid !== key));
    }
  };

  return (
    <div className="border rounded p-2 max-h-50 overflow-y-auto bg-gray-50">
      {OFFICIAL_GROUPS_ORDER.map((section) => {
        let items = officials[section];
        if (items && !Array.isArray(items)) items = [items];
        if (!items || items.length === 0) return null;
        return (
          <div key={section} className="mb-2">
            <div className="flex items-center">
              <button
                type="button"
                className="mr-2 text-xs"
                onClick={() => handleSectionToggle(section)}
              >
                {expanded[section] ? "▼" : "▶"}
              </button>
              <input
                type="checkbox"
                checked={
                  Array.isArray(items) &&
                  items.length > 0 &&
                  items.every((item) =>
                    selectedSet.has(
                      `${section}:${item.name?._id || item._id || item.name}`,
                    ),
                  )
                }
                onChange={(e) => handleSectionCheck(section, e.target.checked)}
                className="mr-2"
              />
              <span className="font-semibold">
                {section
                  .replace(/_/g, " ")
                  .replace(/([A-Z])/g, " $1")
                  .replace(/^./, (str) => str.toUpperCase())}
              </span>
            </div>
            {expanded[section] && Array.isArray(items) && (
              <div className="ml-6 mt-1">
                {items.map((item) => {
                  const id = item.name?._id || item._id || item.name;
                  const key = `${section}:${id}`;
                  const label = (() => {
                    if (section === "campusDirectors")
                      return (
                        item?.branch ||
                        item?.position ||
                        item?.name?.personal_info_id?.first_name ||
                        item?.name?.email ||
                        id
                      );
                    if (section === "collegeDeans")
                      return (
                        item?.college ||
                        item?.position ||
                        item?.name?.personal_info_id?.first_name ||
                        item?.name?.email ||
                        id
                      );
                    if (section === "associateDeans")
                      return (
                        item?.college ||
                        item?.branch ||
                        item?.position ||
                        item?.name?.personal_info_id?.first_name ||
                        item?.name?.email ||
                        id
                      );
                    return (
                      item?.position ||
                      item?.name?.personal_info_id?.first_name ||
                      item?.name?.email ||
                      item?.branch ||
                      item?.college ||
                      id
                    );
                  })();
                  return (
                    <div key={key} className="flex items-center mb-1">
                      <input
                        type="checkbox"
                        checked={selectedSet.has(key)}
                        onChange={(e) =>
                          handleItemCheck(section, id, e.target.checked)
                        }
                        className="mr-2"
                      />
                      <span>{label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function GFPSManager() {
  const [section, setSection] = useState(SECTION_CHOICES[0].key);
  const [showModal, setShowModal] = useState(false);
  const [selectedOfficials, setSelectedOfficials] = useState([]);
  const [gfps, setGfps] = useState({});
  const [loadingGfps, setLoadingGfps] = useState(true);
  const [officials, setOfficials] = useState({});
  const [execRoles, setExecRoles] = useState({});
  const [editingSection, setEditingSection] = useState(null);
  const role = useSelector((state) => state.auth.role);

  useEffect(() => {
    setExecRoles((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((id) => {
        if (!selectedOfficials.includes(id)) delete updated[id];
      });
      selectedOfficials.forEach((id) => {
        if (!updated[id]) updated[id] = "member";
      });
      return updated;
    });
  }, [selectedOfficials]);

  async function fetchGfps() {
    setLoadingGfps(true);
    try {
      const res = await fetch("/api/gfps");
      const data = await res.json();
      setGfps(data.data && data.data[0] ? data.data[0] : {});
    } finally {
      setLoadingGfps(false);
    }
  }

  useEffect(() => {
    fetchGfps();
  }, []);

  useEffect(() => {
    async function fetchOfficials() {
      const res = await fetch("/api/university-officials");
      const data = await res.json();
      setOfficials((data.data && data.data[0]) || {});
    }
    fetchOfficials();
  }, []);

  const findOfficialKey = (officialId) => {
    if (!officialId) return null;
    const idStr = officialId.toString();

    for (const group of OFFICIAL_GROUPS_ORDER) {
      let items = officials[group];
      if (items && !Array.isArray(items)) items = [items];
      if (!items || items.length === 0) continue;

      const match = items.find((item) => {
        const nameId = item.name?._id?.toString(); // populated UserAuth _id
        const nameStr = item.name?.toString(); // raw ObjectId as string
        const subId = item._id?.toString();
        return nameId === idStr || nameStr === idStr || subId === idStr;
      });

      if (match) {
        const matchId = match.name?._id || match._id || match.name;
        return `${group}:${matchId}`;
      }
    }
    return null;
  };

  const handleEdit = (sectionKey) => {
    if (Object.keys(officials).length === 0) {
      alert("Officials data still loading, please try again.");
      return;
    }

    setEditingSection(sectionKey);
    setSection(sectionKey);

    if (sectionKey === "chairOrHeadOfAgency") {
      const chair = gfps[sectionKey];
      const officialId = chair?.official?._id || chair?.official;
      const key = findOfficialKey(officialId);
      setSelectedOfficials(key ? [key] : []);
      setExecRoles({});
    } else if (
      sectionKey === "executiveCommittee" ||
      sectionKey === "technicalWorkingGroup"
    ) {
      const members = gfps[sectionKey]?.members || [];
      const keys = members
        .map((m) => findOfficialKey(m.official?._id || m.official))
        .filter(Boolean);
      setSelectedOfficials(keys);

      if (sectionKey === "executiveCommittee") {
        const roles = {};
        members.forEach((m) => {
          const key = findOfficialKey(m.official?._id || m.official);
          if (key) roles[key] = m.role || "member";
        });
        setExecRoles(roles);
      } else {
        setExecRoles({});
      }
    } else if (sectionKey === "secretariat") {
      const members = Array.isArray(gfps[sectionKey]) ? gfps[sectionKey] : [];
      const keys = members
        .map((m) => findOfficialKey(m.official?._id || m.official))
        .filter(Boolean);
      setSelectedOfficials(keys);
      setExecRoles({});
    }

    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingSection(null);
    setSelectedOfficials([]);
    setExecRoles({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let payload = {};

    const getOfficialNames = (key) => {
      const [group, officialId] = key.split(":");

      let items = officials[group];
      if (items && !Array.isArray(items)) items = [items];

      const found = (items || []).find((item) => {
        const id =
          item.name?._id?.toString() ||
          item._id?.toString() ||
          item.name?.toString();

        return id === officialId;
      });

      const o = found?.name || found;

      const first_name =
        o?.first_name ||
        o?.personal_info_id?.personal?.first_name ||
        o?.personal_info_id?.first_name ||
        "";

      const last_name =
        o?.last_name ||
        o?.personal_info_id?.personal?.last_name ||
        o?.personal_info_id?.last_name ||
        "";

      return {
        officialId,
        first_name,
        last_name,
      };
    };

    try {
      console.log("SECTION:", section);
      console.log("EDITING SECTION:", editingSection);
      console.log("SELECTED OFFICIALS KEYS:", selectedOfficials);
      console.log("EXEC ROLES:", execRoles);

      const debugResolved = selectedOfficials.map((key) => {
        const data = getOfficialNames(key);

        console.log("🔍 RESOLVING:", key, data);

        return {
          key,
          ...data,
        };
      });

      console.log("FULL RESOLVED OFFICIALS:", debugResolved);

      if (section === "executiveCommittee") {
        payload[section] = {
          members: selectedOfficials.map((key) => {
            const d = debugResolved.find((x) => x.key === key);

            return {
              official: d?.officialId,
              role: execRoles[key] || "member",
              first_name: d?.first_name || "",
              last_name: d?.last_name || "",
            };
          }),
        };
      } else if (section === "technicalWorkingGroup") {
        payload[section] = {
          members: selectedOfficials.map((key) => {
            const d = debugResolved.find((x) => x.key === key);

            return {
              official: d?.officialId,
              first_name: d?.first_name || "",
              last_name: d?.last_name || "",
            };
          }),
        };
      } else if (section === "chairOrHeadOfAgency") {
        const d = debugResolved[0];

        payload[section] = {
          official: d?.officialId,
          first_name: d?.first_name || "",
          last_name: d?.last_name || "",
        };
      } else if (section === "secretariat") {
        payload[section] = selectedOfficials.map((key) => {
          const d = debugResolved.find((x) => x.key === key);

          return {
            official: d?.officialId,
            first_name: d?.first_name || "",
            last_name: d?.last_name || "",
          };
        });
      }

      console.log("FINAL PAYLOAD:", JSON.stringify(payload, null, 2));
      console.log("=======================================");

      const isEditing = !!editingSection;
      const method = isEditing ? "PUT" : "POST";
      const url = isEditing ? `/api/gfps/${gfps._id}` : "/api/gfps";

      console.log("REQUEST:", { method, url });

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      console.log("RESPONSE STATUS:", res.status);
      console.log("RESPONSE DATA:", data);

      if (!res.ok) {
        alert("Error: " + (data?.message || data?.error || res.status));
      } else {
        handleCloseModal();
        await fetchGfps();
      }
    } catch (err) {
      console.error("SUBMIT ERROR:", err);
      alert("Request failed: " + err.message);
    }
  };

  const EditButton = ({ sectionKey }) => (
    <button
      onClick={() => handleEdit(sectionKey)}
      className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
    >
      Edit
    </button>
  );

  const handlePrintGFPS = () => {
    const html = `
    <html>
      <head>
        <title>GFPS Report</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
          }

          h2 {
            text-align: center;
            margin-bottom: 10px;
          }

          .header {
            text-align: center;
            margin-bottom: 20px;
          }

          table {
            border-collapse: collapse;
            width: 100%;
            margin-top: 20px;
          }

          th, td {
            border: 1px solid #333;
            padding: 8px;
            text-align: left;
            vertical-align: top;
          }

          th {
            background: #f2f2f2;
            text-align: center;
          }

          .section {
            font-weight: bold;
            background: #fafafa;
          }

          .members {
            white-space: pre-wrap;
          }
        </style>
      </head>

      <body>
        <div class="header">
          <h2>Gender and Development Focal Point System (GFPS)</h2>
        </div>

        <table>
          <thead>
            <tr>
              <th>Section</th>
              <th>Officials</th>
            </tr>
          </thead>

          <tbody>
            ${Object.entries(SECTIONS)
              .map(([_, sec]) => {
                let members = [];

                if (
                  sec.key === "executiveCommittee" ||
                  sec.key === "technicalWorkingGroup"
                ) {
                  members = gfps[sec.key]?.members || [];
                } else if (sec.key === "secretariat") {
                  members = Array.isArray(gfps[sec.key]) ? gfps[sec.key] : [];
                } else if (sec.key === "chairOrHeadOfAgency") {
                  const chair = gfps[sec.key];
                  if (!chair) return "";

                  const o = chair.official || {};
                  const name =
                    `${o.first_name || ""} ${o.last_name || ""}`.trim();
                  const position = o.position || "";

                  return `
                    <tr>
                      <td class="section">${sec.label}</td>
                      <td>
                        <strong>${position}</strong><br/>
                        ${name}
                      </td>
                    </tr>
                  `;
                }

                if (!members.length) return "";

                const formatted = members
                  .map((m) => {
                    const o = m.official || {};
                    const name =
                      `${o.first_name || ""} ${o.last_name || ""}`.trim();
                    const position = o.position || "";
                    const extra =
                      o.branch || o.college
                        ? ` - ${o.branch || o.college}`
                        : "";

                    return `${position}${extra} (${name})`;
                  })
                  .join("<br/>");

                return `
                  <tr>
                    <td class="section">${sec.label}</td>
                    <td class="members">${formatted}</td>
                  </tr>
                `;
              })
              .join("")}
          </tbody>
        </table>
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

  return (
    <div className="p-6">
      <div className="flex justify-between">
        <h1 className="text-3xl font-bold items-center justify-center">GFPS</h1>
        <div className="flex gap-4">
          <button
            className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={handlePrintGFPS}
          >
            Print GFPS
          </button>
          {role !== "gad coordinator" && (
            <button
              onClick={() => {
                setEditingSection(null);
                setSelectedOfficials([]);
                setExecRoles({});
                setSection(SECTION_CHOICES[0].key);
                setShowModal(true);
              }}
              className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              + Add Member
            </button>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 bg-opacity-40 z-50">
          <form
            onSubmit={handleSubmit}
            className="bg-white p-6 rounded shadow-lg w-full max-w-md space-y-4"
          >
            <h2 className="text-lg font-bold">
              {editingSection ? "Edit Section" : "Add Member"}
            </h2>

            <div>
              <label className="block mb-1 font-semibold">Section</label>
              <select
                name="section"
                value={section}
                onChange={(e) => {
                  if (!editingSection) setSection(e.target.value);
                }}
                disabled={!!editingSection}
                className="w-full border rounded px-2 py-1 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                {SECTION_CHOICES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-1 font-semibold">
                Select Officials
              </label>
              <CheckboxTree
                officials={officials}
                selected={selectedOfficials}
                onChange={setSelectedOfficials}
              />

              {section === "executiveCommittee" &&
                selectedOfficials.length > 0 && (
                  <div className="mt-2 overflow-y-auto h-40 border rounded-sm px-4">
                    <label className="block mb-1 font-semibold sticky top-0 bg-white z-10 py-2">
                      Assign Role
                    </label>
                    {selectedOfficials.map((key) => {
                      const [group, id] = key.split(":");

                      let groupItems = officials[group];

                      if (groupItems && !Array.isArray(groupItems)) {
                        groupItems = [groupItems];
                      }

                      const item = groupItems?.find(
                        (o) =>
                          (o.name?._id || o._id || o.name)?.toString() === id,
                      );

                      const label =
                        item?.position ||
                        item?.college ||
                        item?.branch;

                      const subLabel = item?.college || item?.branch;

                      const firstName =
                        item?.name?.personal_info_id?.personal?.first_name ||
                        item?.first_name;

                      const lastName =
                        item?.name?.personal_info_id?.personal?.last_name ||
                        item?.last_name;

                      return (
                        <div
                          key={key}
                          className="flex justify-between items-center mb-1 space-x-2"
                        >
                          <div className="flex flex-col">
                            <p className="font-semibold">
                              {label} {subLabel}
                            </p>

                            <p>
                              ({firstName} {lastName})
                            </p>
                          </div>

                          <select
                            value={execRoles[key] || "member"}
                            onChange={(e) =>
                              setExecRoles((r) => ({
                                ...r,
                                [key]: e.target.value,
                              }))
                            }
                            className="border rounded px-2 py-1"
                          >
                            <option value="member">Member</option>
                            <option value="chair">Chair</option>
                          </select>
                        </div>
                      );
                    })}
                  </div>
                )}
            </div>

            <div className="flex justify-end space-x-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {editingSection ? "Save Changes" : "Add"}
              </button>
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-x-auto">
        {loadingGfps ? (
          <div>Loading data...</div>
        ) : ( 
          <div className="">

     
          <table className="min-w-full bg-white border-2 border-gray-200">
            <thead className="rounded-md">
              <tr className="border border-gray-200 bg-gray-200">
                <th className="px-4 py-2 border-r-2 border-gray-200">Section</th>
                <th className="px-4 py-2 border-r-2 border-gray-200">Officials</th>
                {role !== "gad coordinator" && (
                  <th className="px-4 py-2">Action</th>
                )}
              </tr>
            </thead>
            <tbody>
              {Object.entries(SECTIONS).map(([idx, sec]) => {
                let members = [];

                if (
                  sec.key === "executiveCommittee" ||
                  sec.key === "technicalWorkingGroup"
                ) {
                  members = gfps[sec.key]?.members || [];
                } else if (sec.key === "chairOrHeadOfAgency") {
                  const chair = gfps[sec.key];
                  if (!chair) return null;
                  const official = chair.official || chair.name || chair;
                  const firstName =
                    official?.first_name ||
                    official?.personal_info_id?.personal?.first_name ||
                    official?.personal_info_id?.first_name ||
                    "";
                  const lastName =
                    official?.last_name ||
                    official?.personal_info_id?.personal?.last_name ||
                    official?.personal_info_id?.last_name ||
                    "";
                  const position = official?.position || "";
                  return (
                    <tr key={sec.key}  className="border border-gray-200">
                      <td className="px-4 py-2 border-r-2 border-gray-200 font-medium">{sec.label}</td>
                      <td className="px-4 py-2 border-r-2 border-gray-200">
                        <strong>{position}</strong> ({firstName} {lastName})
                      </td>
                      {role !== "gad coordinator" && (
                        <td className="px-4 py-2">
                          <EditButton sectionKey={sec.key} />
                        </td>
                      )}
                    </tr>
                  );
                } else if (sec.key === "secretariat") {
                  members = Array.isArray(gfps[sec.key]) ? gfps[sec.key] : [];
                }

                if (!members.length) return null;

                if (sec.key === "executiveCommittee") {
                  const chairs = members.filter((m) => m.role === "chair");
                  const membersOnly = members.filter((m) => m.role !== "chair");
                  return (
                    <tr key={sec.key}  className="border border-gray-200">
                      <td className="px-4 py-2 border-r-2 border-gray-200 font-medium">{sec.label}</td>
                      <td className="px-4 py-2 border-r-2 border-gray-200">
                        <div>
                          <div>
                            <strong>Chair:</strong>{" "}
                            {chairs.length
                              ? chairs.map((m, i) => {
                                  const o = m.official || {};
                                  const extra = o.branch || o.college;
                                  return (
                                    <span key={o._id || i}>
                                      <strong>{o.position}</strong>
                                      {extra && <strong> — {extra}</strong>} (
                                      {o.first_name} {o.last_name})
                                      {i < chairs.length - 1 && ", "}
                                    </span>
                                  );
                                })
                              : "None"}
                          </div>
                          <div>
                            <strong>Members:</strong>{" "}
                            {membersOnly.length
                              ? membersOnly.map((m, i) => {
                                  const o = m.official || {};
                                  const extra = o.branch || o.college;
                                  return (
                                    <span key={o._id || i}>
                                      <strong>{o.position}</strong>
                                      {extra && <strong> - {extra}</strong>} (
                                      {o.first_name} {o.last_name})
                                      {i < membersOnly.length - 1 && ", "}
                                    </span>
                                  );
                                })
                              : "None"}
                          </div>
                        </div>
                      </td>
                      {role !== "gad coordinator" && (
                        <td className="px-4 py-2">
                          <EditButton sectionKey={sec.key} />
                        </td>
                      )}
                    </tr>
                  );
                }

                return (
                  <tr key={sec.key}  className="border border-gray-200">
                    <td className="px-4 py-2 border-r-2 border-gray-200 font-medium">{sec.label}</td>
                    <td className="px-4 py-2 border-r-2 border-gray-200 ">
                      {members
                        .map((m) => {
                          if (m.official) {
                            const position = m.official.position || "";
                            const fn = m.official.first_name || "";
                            const ln = m.official.last_name || "";
                            return (
                              <span key={m.official._id || `${fn}-${ln}`}>
                                <strong>{position}</strong>
                                <strong>
                                  {m.official.group === "campusDirectors" && (
                                    <> - {m.official.branch || "No Branch"}</>
                                  )}
                                  {m.official.group === "collegeDeans" && (
                                    <> - {m.official.college || "No College"}</>
                                  )}
                                  {m.official.group === "associateDeans" && (
                                    <> - {m.official.college || "No College"}</>
                                  )}{" "}
                                </strong>
                                ({fn} {ln})
                              </span>
                            );
                          }
                          return null;
                        })
                        .filter(Boolean)
                        .reduce((acc, curr, i) => {
                          if (i === 0) return [curr];
                          return [...acc, ", ", curr];
                        }, [])}
                    </td>
                    {role !== "gad coordinator" && (
                      <td className="px-4 py-2">
                        <EditButton sectionKey={sec.key} />
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
               </div>
        )}
      </div>
    </div>
  );
}
