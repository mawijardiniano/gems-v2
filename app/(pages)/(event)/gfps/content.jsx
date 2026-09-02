"use client";

import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import PrintGFPS from "../components/Print/PrintGFPS";
import EditMemberModal from "./components/EditMemberModal";
import SectionCard from "./components/SectionCard";
import { EmptyState, LoadingSkeleton } from "./components/ui";
import {
  SECTIONS,
  SECTION_BEHAVIOR,
  getSectionEditMembers,
  sectionHasData,
} from "./gfps-config";
import { findOfficialKey, getOfficialNames } from "./officials";

export default function GFPSManager() {
  const [section, setSection] = useState(SECTIONS[0].key);
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

  useEffect(() => {
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

  const resolveOfficialKey = useCallback(
    (officialId) => findOfficialKey(officials, officialId),
    [officials],
  );

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

  const openAddModal = () => {
    setEditingSection(null);
    setSelectedOfficials([]);
    setExecRoles({});
    setSection(SECTIONS[0].key);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingSection(null);
    setSelectedOfficials([]);
    setExecRoles({});
  };

  const handleEdit = (sectionKey) => {
    if (Object.keys(officials).length === 0) return;

    setEditingSection(sectionKey);
    setSection(sectionKey);

    const editMembers = getSectionEditMembers(gfps, sectionKey);
    setSelectedOfficials(
      editMembers
        .map((m) => resolveOfficialKey(m.official_ref || m.official?._id || m.official))
        .filter(Boolean),
    );

    if (SECTION_BEHAVIOR[sectionKey].supportsRoles) {
      const roles = {};
      editMembers.forEach((m) => {
        const key = resolveOfficialKey(m.official_ref || m.official?._id || m.official);
        if (key) roles[key] = m.role || "member";
      });
      setExecRoles(roles);
    } else {
      setExecRoles({});
    }

    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const resolvedOfficials = selectedOfficials.map((key) => ({
        key,
        ...getOfficialNames(officials, key),
      }));

      const behavior = SECTION_BEHAVIOR[section];
      const payload = behavior.buildPayload(resolvedOfficials, execRoles);

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

  const hasData =
    Object.keys(gfps).length > 0 &&
    SECTIONS.some((sec) => sectionHasData(gfps, sec.key));

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
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
              onClick={openAddModal}
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

      {showModal && (
        <EditMemberModal
          section={section}
          editingSection={editingSection}
          officials={officials}
          selectedOfficials={selectedOfficials}
          execRoles={execRoles}
          submitting={submitting}
          onClose={handleCloseModal}
          onSectionChange={setSection}
          onSelectedChange={setSelectedOfficials}
          onExecRolesChange={setExecRoles}
          onSubmit={handleSubmit}
        />
      )}

      {loadingGfps ? (
        <LoadingSkeleton />
      ) : !hasData ? (
        <EmptyState onAdd={role !== "gad coordinator" ? openAddModal : null} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-5 items-start">
          {SECTIONS.map((sec) => (
            <SectionCard
              key={sec.key}
              sectionKey={sec.key}
              label={sec.label}
              gfps={gfps}
              canEdit={role !== "gad coordinator"}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}
