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
  const [officials, setOfficials] = useState([]);
  const [execRoles, setExecRoles] = useState({});
  const [editingSection, setEditingSection] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [academicYear, setAcademicYear] = useState("");
  const [yearOptions, setYearOptions] = useState([]);
  const [activeYear, setActiveYear] = useState("");
  const [copying, setCopying] = useState(false);
  const [notice, setNotice] = useState("");
  const [isLegacy, setIsLegacy] = useState(false);
  const role = useSelector((state) => state.auth.role);

  const isArchived = Boolean(activeYear && academicYear && academicYear !== activeYear);
  const canEdit = role !== "gad coordinator" && !isArchived;

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
    (async () => {
      try {
        const res = await fetch("/api/university-officials/years");
        const data = await res.json();
        const years = Array.isArray(data.data) ? data.data : [];
        if (data.active_year) setActiveYear(data.active_year);
        const params = new URLSearchParams(window.location.search);
        const requested = params.get("ay");
        const initial =
          (requested && years.includes(requested) && requested) ||
          data.active_year ||
          years[0] ||
          "";
        setYearOptions(years.length ? years : initial ? [initial] : []);
        if (initial) setAcademicYear(initial);
        else setLoadingGfps(false);
      } catch {
        setLoadingGfps(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!academicYear) return;
    async function fetchGfps() {
      setLoadingGfps(true);
      try {
        const res = await fetch(
          `/api/gfps?academic_year=${encodeURIComponent(academicYear)}`,
        );
        const data = await res.json();
        setGfps(data.data && data.data[0] ? data.data[0] : {});
        setIsLegacy(Boolean(data.legacy));
        if (Array.isArray(data.years) && data.years.length) {
          setYearOptions((prev) => [...new Set([...prev, ...data.years])].sort((a, b) => b.localeCompare(a)));
        }
        if (data.active_year) setActiveYear(data.active_year);
      } finally {
        setLoadingGfps(false);
      }
    }
    fetchGfps();
  }, [academicYear]);

  useEffect(() => {
    if (!academicYear) return;
    async function fetchOfficials() {
      const res = await fetch(
        `/api/university-officials?academic_year=${encodeURIComponent(academicYear)}`,
      );
      const data = await res.json();
      setOfficials(Array.isArray(data.data) ? data.data : []);
    }
    fetchOfficials();
  }, [academicYear]);

  const resolveOfficialKey = useCallback(
    (officialId) => findOfficialKey(officials, officialId),
    [officials],
  );

  async function fetchGfps(year) {
    const target = year || academicYear;
    if (!target) return;
    setLoadingGfps(true);
    try {
      const res = await fetch(
        `/api/gfps?academic_year=${encodeURIComponent(target)}`,
      );
      const data = await res.json();
      setGfps(data.data && data.data[0] ? data.data[0] : {});
      setIsLegacy(Boolean(data.legacy));
    } finally {
      setLoadingGfps(false);
    }
  }

  // One-click rescue for pre-migration records: tag the legacy roster + GFPS
  // to the selected year in place; nothing is deleted.
  const handleAssignLegacy = async () => {
    if (!academicYear || copying) return;
    if (
      !window.confirm(
        `Assign the untagged legacy records to AY ${academicYear}? This tags them in place; nothing is deleted.`,
      )
    ) {
      return;
    }
    setCopying(true);
    setNotice("");
    try {
      const res = await fetch("/api/university-officials/assign-legacy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: academicYear }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setNotice(data.error || "Failed to assign legacy records");
        return;
      }
      setNotice(
        `Assigned legacy records to AY ${academicYear} (${data.data?.officials ?? 0} official(s), ${data.data?.gfps ?? 0} GFPS).`,
      );
      setIsLegacy(false);
      await fetchGfps(academicYear);
      const off = await fetch(
        `/api/university-officials?academic_year=${encodeURIComponent(academicYear)}`,
      )
        .then((r) => r.json())
        .catch(() => ({}));
      if (Array.isArray(off?.data)) setOfficials(off.data);
    } catch {
      setNotice("Network error");
    } finally {
      setCopying(false);
    }
  };

  const handleCopyForward = async () => {
    if (!academicYear || copying) return;
    const sorted = [...yearOptions].sort((a, b) => b.localeCompare(a));
    const source = sorted.find((y) => y < academicYear) || sorted[0];
    if (!source || source === academicYear) {
      setNotice("No previous year to copy from");
      return;
    }
    if (
      !window.confirm(
        `Copy the GFPS committee from AY ${source} to AY ${academicYear}? Copy the officials roster first if you have not.`,
      )
    ) {
      return;
    }
    setCopying(true);
    setNotice("");
    try {
      const res = await fetch("/api/gfps/copy-forward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: source, to: academicYear }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setNotice(data.error || "Failed to copy GFPS");
        return;
      }
      const unmapped = Array.isArray(data.data?.unmapped) ? data.data.unmapped : [];
      setNotice(
        unmapped.length
          ? `Copied from AY ${source}. ${unmapped.length} member(s) need re-picking (seat changed).`
          : `Copied GFPS from AY ${source}!`,
      );
      await fetchGfps(academicYear);
    } catch {
      setNotice("Network error");
    } finally {
      setCopying(false);
    }
  };

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
    if (!officials.length) return;

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
      const payload = {
        ...behavior.buildPayload(resolvedOfficials, execRoles),
        academic_year: academicYear,
      };

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
        await fetchGfps(academicYear);
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
    <div className="p-6 max-w-8xl mx-auto space-y-8">
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
                Gender and Development Focal Point System — manage committee members and their roles per academic year
              </p>
              {academicYear && (
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <label
                    htmlFor="gfps-year"
                    className="text-xs font-medium text-gray-500"
                  >
                    Academic Year
                  </label>
                  <select
                    id="gfps-year"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>
                        AY {y}
                        {y === activeYear ? " (Active)" : ""}
                      </option>
                    ))}
                  </select>
                  {isArchived ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                      Archived
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Active
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <PrintGFPS className="justify-center items-center flex" SECTIONS={SECTIONS} gfps={gfps} />
          {canEdit && !hasData && !loadingGfps && (
            <button
              onClick={handleCopyForward}
              disabled={copying}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition-all font-medium text-sm disabled:opacity-50"
            >
              {copying ? "Copying..." : "Copy from previous year"}
            </button>
          )}
          {canEdit && (
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

      {isArchived && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-sm">
          <span>
            Viewing archived AY {academicYear} — read-only. Switch to AY {activeYear} to make changes.
          </span>
        </div>
      )}

      {notice && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-sm">
          <span>{notice}</span>
        </div>
      )}

      {isLegacy && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-sm">
          <span>
            Showing untagged records from before the academic-year migration. Assign them to AY {academicYear} to keep them.
          </span>
          <button
            onClick={handleAssignLegacy}
            disabled={copying}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-xl hover:bg-amber-700 transition-all disabled:opacity-50 shrink-0"
          >
            {copying ? "Assigning..." : `Assign to AY ${academicYear}`}
          </button>
        </div>
      )}

      {!loadingGfps && canEdit && !hasData && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-800 text-sm">
          <span>
            No GFPS for AY {academicYear} yet. Copy last year&apos;s committee or add members manually.
          </span>
          <button
            onClick={handleCopyForward}
            disabled={copying}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 shrink-0"
          >
            {copying ? "Copying..." : "Copy from previous year"}
          </button>
        </div>
      )}

      {showModal && (
        <EditMemberModal
          section={section}
          editingSection={editingSection}
          officials={officials}
          selectedOfficials={selectedOfficials}
          execRoles={execRoles}
          submitting={submitting}
          academicYear={academicYear}
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
        <EmptyState onAdd={canEdit ? openAddModal : null} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-5 items-start">
          {SECTIONS.map((sec) => (
            <SectionCard
              key={sec.key}
              sectionKey={sec.key}
              label={sec.label}
              gfps={gfps}
              canEdit={canEdit}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}
