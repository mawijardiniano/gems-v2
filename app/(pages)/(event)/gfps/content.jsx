"use client";

import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import PrintGFPS from "../components/Print/PrintGFPS";

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

// Each checkbox is keyed by the position entry (subdocument _id) so a person
// holding multiple positions (e.g., VP and Dean) can be selected once per
// position. Falls back to the person id for entries without a subdocument id.
const officialItemKey = (section, item) =>
  `${section}:${item._id || item.name?._id || item.name}`;

// Find the official entry matching a selection key id. Matches the position
// entry (subdocument _id) first — which is what keys are built from — then
// falls back to the person id for legacy keys.
const findOfficialItem = (items, id) =>
  (items || []).find((item) => {
    const subId = item._id?.toString();
    const nameId = item.name?._id?.toString() || item.name?.toString();
    return subId === id || nameId === id;
  });

const SECTION_STYLES = {
  chairOrHeadOfAgency: {
    border: "border-purple-200",
    bg: "bg-purple-50",
    headerBg: "bg-purple-100/50",
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
    badge: "bg-purple-100 text-purple-700",
    avatarBg: "bg-purple-100",
    avatarText: "text-purple-600",
  },
  executiveCommittee: {
    border: "border-blue-200",
    bg: "bg-blue-50",
    headerBg: "bg-blue-100/50",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    badge: "bg-blue-100 text-blue-700",
    avatarBg: "bg-blue-100",
    avatarText: "text-blue-600",
  },
  technicalWorkingGroup: {
    border: "border-emerald-200",
    bg: "bg-emerald-50",
    headerBg: "bg-emerald-100/50",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    badge: "bg-emerald-100 text-emerald-700",
    avatarBg: "bg-emerald-100",
    avatarText: "text-emerald-600",
  },
  secretariat: {
    border: "border-amber-200",
    bg: "bg-amber-50",
    headerBg: "bg-amber-100/50",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    badge: "bg-amber-100 text-amber-700",
    avatarBg: "bg-amber-100",
    avatarText: "text-amber-600",
  },
};

const SECTION_ICONS = {
  chairOrHeadOfAgency: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  executiveCommittee: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  technicalWorkingGroup: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  secretariat: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
};

function CheckboxTree({ officials, selected, onChange }) {
  const [expanded, setExpanded] = React.useState({});

  const handleSectionToggle = (section) => {
    setExpanded((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const selectedSet = React.useMemo(() => new Set(selected || []), [selected]);

  const handleSectionCheck = (section, checked) => {
    const items = Array.isArray(officials[section]) ? officials[section] : [];
    const allKeys = items.map((item) => officialItemKey(section, item));
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
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white divide-y divide-gray-100 max-h-64 overflow-y-auto">
      {OFFICIAL_GROUPS_ORDER.map((section) => {
        let items = officials[section];
        if (items && !Array.isArray(items)) items = [items];
        if (!items || items.length === 0) return null;
        const sectionChecked =
          Array.isArray(items) &&
          items.length > 0 &&
          items.every((item) => selectedSet.has(officialItemKey(section, item)));
        const sectionSomeChecked =
          Array.isArray(items) &&
          items.some((item) => selectedSet.has(officialItemKey(section, item)));
        return (
          <div key={section} className="hover:bg-gray-50 transition-colors">
            <div className="flex items-center px-3 py-2.5">
              <button
                type="button"
                className="mr-2 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                onClick={() => handleSectionToggle(section)}
              >
                <svg
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded[section] ? "rotate-90" : ""}`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  checked={sectionChecked}
                  ref={(el) => {
                    if (el) el.indeterminate = sectionSomeChecked && !sectionChecked;
                  }}
                  onChange={(e) => handleSectionCheck(section, e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                />
              </div>
              <span
                className="ml-2.5 text-sm font-medium text-gray-700 cursor-pointer select-none"
                onClick={() => handleSectionToggle(section)}
              >
                {section
                  .replace(/_/g, " ")
                  .replace(/([A-Z])/g, " $1")
                  .replace(/^./, (str) => str.toUpperCase())}
              </span>
              <span className="ml-auto text-xs text-gray-400">
                {items.length}
              </span>
            </div>
            {expanded[section] && Array.isArray(items) && (
              <div className="ml-7 pb-1.5 space-y-0.5 border-l-2 border-gray-100 ml-4 pl-4">
                {items.map((item) => {
                  const id = item._id || item.name?._id || item.name;
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
                    <label
                      key={key}
                      className="flex items-center py-1.5 px-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer group"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSet.has(key)}
                        onChange={(e) =>
                          handleItemCheck(section, id, e.target.checked)
                        }
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="ml-2.5 text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                        {label}
                      </span>
                    </label>
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

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-1 gap-5">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-200 overflow-hidden animate-pulse">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded-lg" />
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-gray-200 rounded w-32" />
              <div className="h-3 bg-gray-100 rounded w-20" />
            </div>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-100 rounded-full" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3.5 bg-gray-100 rounded w-3/4" />
                <div className="h-3 bg-gray-50 rounded w-1/2" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-100 rounded-full" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3.5 bg-gray-100 rounded w-2/3" />
                <div className="h-3 bg-gray-50 rounded w-1/3" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onAdd }) {
  return (
    <div className="text-center py-16">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">No GFPS Members Yet</h3>
      <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
        Get started by adding members to the Gender and Development Focal Point System.
      </p>
      {onAdd && (
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium text-sm shadow-lg shadow-blue-200"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Member
        </button>
      )}
    </div>
  );
}

function OfficialRow({ official, avatarBg, avatarText }) {
  const o = official || {};
  const initials = `${(o.first_name?.[0] || "").toUpperCase()}${(o.last_name?.[0] || "").toUpperCase()}`;
  const extra = o.branch || o.college;
  return (
    <div className="flex items-center gap-3">
      <div className={`flex-shrink-0 w-8 h-8 rounded-full ${avatarBg} flex items-center justify-center`}>
        <span className={`text-xs font-semibold ${avatarText}`}>
          {initials || "?"}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-gray-700 truncate">
          {o.position}
          {extra && (
            <span className="text-gray-400 font-normal"> — {extra}</span>
          )}
        </p>
        <p className="text-xs text-gray-400 truncate">
          {o.first_name} {o.last_name}
        </p>
      </div>
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
  const [submitting, setSubmitting] = useState(false);
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

      // Exact match on the position entry (official_ref) — distinguishes
      // multiple positions held by the same person.
      const subMatch = items.find((item) => item._id?.toString() === idStr);
      if (subMatch) {
        return `${group}:${subMatch._id.toString()}`;
      }

      // Fallback: match by person id (legacy members saved without
      // official_ref resolve to the first matching position entry).
      const match = items.find((item) => {
        const nameId = item.name?._id?.toString();
        const nameStr = item.name?.toString();
        return nameId === idStr || nameStr === idStr;
      });

      if (match) {
        const matchId = match._id || match.name?._id || match.name;
        return `${group}:${matchId}`;
      }
    }
    return null;
  };

  const handleEdit = (sectionKey) => {
    if (Object.keys(officials).length === 0) {
      return;
    }

    setEditingSection(sectionKey);
    setSection(sectionKey);

    if (sectionKey === "chairOrHeadOfAgency") {
      const chair = gfps[sectionKey];
      const officialId =
        chair?.official_ref || chair?.official?._id || chair?.official;
      const key = findOfficialKey(officialId);
      setSelectedOfficials(key ? [key] : []);
      setExecRoles({});
    } else if (
      sectionKey === "executiveCommittee" ||
      sectionKey === "technicalWorkingGroup"
    ) {
      const members = gfps?.[sectionKey]?.members || [];
      const keys = members
        .map((m) =>
          findOfficialKey(m.official_ref || m.official?._id || m.official),
        )
        .filter(Boolean);
      setSelectedOfficials(keys);

      if (sectionKey === "executiveCommittee") {
        const roles = {};
        members.forEach((m) => {
          const key = findOfficialKey(
            m.official_ref || m.official?._id || m.official,
          );
          if (key) roles[key] = m.role || "member";
        });
        setExecRoles(roles);
      } else {
        setExecRoles({});
      }
    } else if (sectionKey === "secretariat") {
      const members = Array.isArray(gfps[sectionKey]) ? gfps[sectionKey] : [];
      const keys = members
        .map((m) =>
          findOfficialKey(m.official_ref || m.official?._id || m.official),
        )
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
    setSubmitting(true);
    let payload = {};

    const getOfficialNames = (key) => {
      const [group, id] = key.split(":");

      let items = officials[group];
      if (items && !Array.isArray(items)) items = [items];

      const found = findOfficialItem(items, id);

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
        officialId:
          found?.name?._id?.toString() ||
          found?.name?.toString() ||
          found?._id?.toString() ||
          id,
        officialRef: found?._id?.toString() || null,
        officialGroup: group,
        first_name,
        last_name,
      };
    };

    try {
      const debugResolved = selectedOfficials.map((key) => {
        const data = getOfficialNames(key);
        return { key, ...data };
      });

      if (section === "executiveCommittee") {
        payload[section] = {
          members: selectedOfficials.map((key) => {
            const d = debugResolved.find((x) => x.key === key);
            return {
              official: d?.officialId,
              official_ref: d?.officialRef || undefined,
              official_group: d?.officialGroup || undefined,
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
              official_ref: d?.officialRef || undefined,
              official_group: d?.officialGroup || undefined,
              first_name: d?.first_name || "",
              last_name: d?.last_name || "",
            };
          }),
        };
      } else if (section === "chairOrHeadOfAgency") {
        const d = debugResolved[0];
        payload[section] = {
          official: d?.officialId,
          official_ref: d?.officialRef || undefined,
          official_group: d?.officialGroup || undefined,
          first_name: d?.first_name || "",
          last_name: d?.last_name || "",
        };
      } else if (section === "secretariat") {
        payload[section] = selectedOfficials.map((key) => {
          const d = debugResolved.find((x) => x.key === key);
          return {
            official: d?.officialId,
            official_ref: d?.officialRef || undefined,
            official_group: d?.officialGroup || undefined,
            first_name: d?.first_name || "",
            last_name: d?.last_name || "",
          };
        });
      }

      const isEditing = !!editingSection;
      const method = isEditing ? "PUT" : "POST";
      const url = isEditing ? `/api/gfps/${gfps._id}` : "/api/gfps";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data?.message || "Failed to save GFPS");
      } else {
        handleCloseModal();
        await fetchGfps();
      }
    } catch (err) {
      console.error("SUBMIT ERROR:", err);
      alert("An error occurred while saving");
    } finally {
      setSubmitting(false);
    }
  };

  const EditButton = ({ sectionKey }) => (
    <button
      onClick={() => handleEdit(sectionKey)}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
      Edit
    </button>
  );

  const hasData = Object.keys(gfps).length > 0 && SECTIONS.some((sec) => {
    if (sec.key === "chairOrHeadOfAgency") return !!gfps[sec.key];
    if (sec.key === "executiveCommittee" || sec.key === "technicalWorkingGroup") return gfps[sec.key]?.members?.length > 0;
    if (sec.key === "secretariat") return Array.isArray(gfps[sec.key]) && gfps[sec.key].length > 0;
    return false;
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-200">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                GFPS
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Gender and Development Focal Point System — manage committee members and their roles
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <PrintGFPS className="justify-center items-center flex" SECTIONS={SECTIONS} gfps={gfps} />
          {role !== "gad coordinator" && (
            <button
              onClick={() => {
                setEditingSection(null);
                setSelectedOfficials([]);
                setExecRoles({});
                setSection(SECTION_CHOICES[0].key);
                setShowModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-medium text-sm shadow-lg shadow-blue-200 hover:shadow-blue-300"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Member
            </button>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50 p-4">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
          >
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={editingSection ? "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" : "M12 4v16m8-8H4"} />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {editingSection ? "Edit Section" : "Add Member"}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {editingSection
                        ? `Update members in ${SECTION_CHOICES.find((s) => s.key === editingSection)?.label}`
                        : "Assign officials to a GFPS section"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Section
                </label>
                <select
                  name="section"
                  value={section}
                  onChange={(e) => {
                    if (!editingSection) setSection(e.target.value);
                  }}
                  disabled={!!editingSection}
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  {SECTION_CHOICES.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Select Officials
                </label>
                <CheckboxTree
                  officials={officials}
                  selected={selectedOfficials}
                  onChange={setSelectedOfficials}
                />
              </div>

              {section === "executiveCommittee" && selectedOfficials.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign Roles
                  </label>
                  <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100 max-h-48 overflow-y-auto">
                    {selectedOfficials.map((key) => {
                      const [group, id] = key.split(":");
                      let groupItems = officials[group];
                      if (groupItems && !Array.isArray(groupItems)) {
                        groupItems = [groupItems];
                      }
                      const item = findOfficialItem(groupItems, id);
                      const label = item?.position || item?.college || item?.branch;
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
                          className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {label}
                              {subLabel && (
                                <span className="text-gray-500 font-normal">
                                  {" "}
                                  — {subLabel}
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-gray-500">
                              {firstName} {lastName}
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
                            className="ml-3 border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                          >
                            <option value="member">Member</option>
                            <option value="chair">Chair</option>
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={selectedOfficials.length === 0 || submitting}
                className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {submitting && (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {submitting ? "Saving..." : editingSection ? "Save Changes" : "Add Members"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Content - Cards Grid */}
      {loadingGfps ? (
        <LoadingSkeleton />
      ) : !hasData ? (
        <EmptyState
          onAdd={
            role !== "gad coordinator"
              ? () => {
                  setEditingSection(null);
                  setSelectedOfficials([]);
                  setExecRoles({});
                  setSection(SECTION_CHOICES[0].key);
                  setShowModal(true);
                }
              : null
          }
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-5 items-start">
          {Object.entries(SECTIONS).map(([idx, sec]) => {
            let members = [];
            let chairData = null;

            if (
              sec.key === "executiveCommittee" ||
              sec.key === "technicalWorkingGroup"
            ) {
              members = gfps[sec.key]?.members || [];
            } else if (sec.key === "chairOrHeadOfAgency") {
              const chair = gfps?.[sec.key];
              if (!chair) return null;
              chairData = chair;
            } else if (sec.key === "secretariat") {
              members = Array.isArray(gfps[sec.key]) ? gfps[sec.key] : [];
            }

            if (!chairData && !members.length) return null;

            const style = SECTION_STYLES[sec.key] || SECTION_STYLES.executiveCommittee;

            return (
              <div
                key={sec.key}
                className={`rounded-2xl border ${style.border} ${style.bg} overflow-hidden transition-all duration-200 hover:shadow-lg`}
              >
                {/* Card Header */}
                <div className={`px-5 py-4 border-b border-white/50 ${style.headerBg} flex items-center justify-between`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-lg ${style.iconBg} ${style.iconColor} flex-shrink-0`}>
                      {SECTION_ICONS[sec.key]}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{sec.label}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${style.badge} inline-block mt-0.5`}>
                        {chairData
                          ? "1 Member"
                          : `${members.length} Member${members.length !== 1 ? "s" : ""}`
                        }
                        {sec.key === "executiveCommittee" && (
                          <> · {members.filter((m) => m.role === "chair").length} Chair{members.filter((m) => m.role === "chair").length !== 1 ? "s" : ""}</>
                        )}
                      </span>
                    </div>
                  </div>
                  {role !== "gad coordinator" && (
                    <EditButton sectionKey={sec.key} />
                  )}
                </div>

                {/* Card Body */}
                <div className="px-5 py-4 min-h-[100px]">
                  {chairData ? (
                    <OfficialRow
                      official={chairData.official || chairData}
                      avatarBg={style.avatarBg}
                      avatarText={style.avatarText}
                    />
                  ) : sec.key === "executiveCommittee" ? (
                    <div className="space-y-4">
                      {(() => {
                        const chairs = members.filter((m) => m.role === "chair");
                        const regulars = members.filter((m) => m.role !== "chair");
                        return (
                          <>
                            {chairs.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">
                                  Chair
                                </p>
                                <div className="space-y-2.5">
                                  {chairs.map((m, i) => (
                                    <OfficialRow
                                      key={m.official_ref || m.official?._id || i}
                                      official={m.official}
                                      avatarBg={style.avatarBg}
                                      avatarText={style.avatarText}
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                            {regulars.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">
                                  Members
                                </p>
                                <div className="space-y-2.5">
                                  {regulars.map((m, i) => (
                                    <OfficialRow
                                      key={m.official_ref || m.official?._id || i}
                                      official={m.official}
                                      avatarBg="bg-white"
                                      avatarText="text-gray-600"
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {members.map((m, i) => (
                        <OfficialRow
                          key={m.official_ref || m.official?._id || i}
                          official={m.official}
                          avatarBg="bg-white"
                          avatarText="text-gray-600"
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}