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
import { resolveSaveRequest } from "@/lib/gfpsSaveRequest";
import { isManualKey, manualMemberNames, nextManualKey } from "./officials";

/* Where the page-header "Add Member" button opens. The chair/head of agency is
   a single slot rather than a row list, so a dialog opened there could offer no
   way to add a row; the first section that holds a list is the safe landing
   point. This only chooses the selector's initial value — the operator is free
   to switch, and the list always starts empty. */
const DEFAULT_ADD_SECTION =
  SECTIONS.find((s) => !SECTION_BEHAVIOR[s.key]?.isSingle)?.key ?? SECTIONS[0].key;

export default function GFPSManager() {
  const [section, setSection] = useState(SECTIONS[0].key);
  const [showModal, setShowModal] = useState(false);
  const [selectedOfficials, setSelectedOfficials] = useState([]);
  /* Typed names for manual member rows, keyed by their synthetic selection key.
     Kept beside the selection so a manual entry is edited in place rather than
     being flattened into a roster pick when the modal reopens. */
  const [manualTexts, setManualTexts] = useState({});
  /* Seats typed alongside manual names, plus the subset that came from the
     memorandum and therefore cannot be renamed (see EditMemberModal). */
  const [manualPositions, setManualPositions] = useState({});
  const [lockedPositions, setLockedPositions] = useState({});
  const [modalError, setModalError] = useState("");
  const [gfps, setGfps] = useState({});
  const [loadingGfps, setLoadingGfps] = useState(true);
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

  /* Resolves one selection key to the member row the API stores.
   *
   * Every key is a typed name the operator entered, so it carries no roster
   * link at all. Rows seeded from the memorandum take the same route: they are
   * manual rows with a seat, which is what makes a vacant position renderable
   * without inventing a person for it. */
  const resolveSelectedMember = useCallback(
    (key, manualText = "", manualPosition = "") =>
      manualMemberNames(manualText, manualPosition),
    [],
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
      const carried = Array.isArray(data.data?.carried) ? data.data.carried : [];
      const copied = Number(data.data?.copied) || 0;

      /* Report what actually landed. A copy that carried rows but resolved no
         names would otherwise read as a success while the chart stayed blank,
         which is how a bad copy went unnoticed. */
      if (!copied) {
        setNotice(
          `Nothing could be copied from AY ${source} — none of its rows resolved to a name or a seat. Add members manually.`,
        );
      } else {
        setNotice(
          `Copied ${copied} member(s) from AY ${source}.` +
            (carried.length
              ? ` ${carried.length} row(s) were skipped because they identified neither a person nor a seat.`
              : ""),
        );
      }
      await fetchGfps(academicYear);
    } catch {
      setNotice("Network error");
    } finally {
      setCopying(false);
    }
  };

  /* Re-seats a section's stored members as typed-name rows in the modal's
   * selection state.
   *
   * Both opening the editor and opening "Add Member" need this. Add starts from
   * the section as it stands rather than from an empty list: the modal is the
   * only place the chart's rows can be revised, so opening it blank on a section
   * that already has members would hide them and the save would look like it
   * deleted them. It also means a typed row has to be entered once — an edit
   * round-trip carries the existing names back into the form.
   *
   * Returns the seat state so the caller can add its own blank row or apply
   * roles without recomputing any of it.
   */
  const seatSectionMembers = (sectionKey) => {
    const sectionMembers = getSectionEditMembers(gfps, sectionKey);
    const keys = [];
    const texts = {};
    const positions = {};
    const locked = {};

    /* GFPS is maintained by hand, so every stored member is re-seated as a
       typed-name row carrying its own `official_text` and `position_title`.
       Nothing is re-resolved back into a roster pick: the modal has no roster
       route, and re-seating a row under a roster key would make it invisible
       there and drop it on the next save. */
    sectionMembers.forEach((m) => {
      const text = String(m.official_text || "").trim();
      const seat = String(m.position_title || "").trim();

      /* A memo-seeded seat has a position but no name yet, so testing the name
         alone would drop every vacant seat from the editor. The row exists if
         either half does. */
      if (!text && !seat) return;

      const manualKey = nextManualKey();
      keys.push(manualKey);
      texts[manualKey] = text;
      positions[manualKey] = seat;

      /* Seats that arrived from the memorandum keep their title: the seeded
         rows are the chart's structure, so they are shown read-only rather than
         silently renameable. Rows the operator typed from scratch stay free. */
      const fromMemo = seat && !text;
      if (fromMemo) locked[manualKey] = true;
    });

    return { sectionMembers, keys, texts, positions, locked };
  };

  const openAddModal = () => {
    /* "Add Member" is a single button in the page header, not one per section,
       so it carries no section context of its own: the operator picks the
       section with the modal's own selector, which is enabled while adding.

       It therefore opens EMPTY. It used to seed Executive Committee — the
       first section that can hold a list — and that meant the dialog showed
       that section's existing members before anything had been chosen, and kept
       showing them after the selector was switched, so saving wrote them into
       the newly chosen section. Seeding a section the operator has not picked
       is how a member of one committee ended up in another. */
    const sectionKey = DEFAULT_ADD_SECTION;

    /* No rows are seeded and no blank row is appended. Submit requires every
       row to name a person or a seat (`canSubmit` in the modal, and the
       `blankRow` guard in handleSubmit), so seeding an always-empty draft would
       leave the form permanently unsubmittable and the save would silently
       never happen. The modal's own "Add another" button mints a row when the
       operator wants one, and it invites them to do so when the list is empty. */
    setEditingSection(null);
    setSection(sectionKey);
    setSelectedOfficials([]);
    setManualTexts({});
    setManualPositions({});
    setLockedPositions({});
    setExecRoles({});

    setModalError("");
    setShowModal(true);
  };

  /* Switching section while adding starts that section from scratch.
   *
   * The selector only changed the heading before, leaving the previous
   * section's rows in the form, so saving wrote one committee's members into
   * another. Re-seating is deliberately not used here: "Add Member" is for
   * adding, and loading the target section's existing rows would turn it into
   * an edit of a section the operator only meant to append to. Editing an
   * existing section's rows is what the section card's own edit action is for.
   */
  const handleAddSectionChange = (sectionKey) => {
    setSection(sectionKey);
    setSelectedOfficials([]);
    setManualTexts({});
    setManualPositions({});
    setLockedPositions({});
    setExecRoles({});
    setModalError("");
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingSection(null);
    setSelectedOfficials([]);
    setManualTexts({});
    setManualPositions({});
    setLockedPositions({});
    setExecRoles({});
    setModalError("");
  };

  const handleEdit = (sectionKey) => {
    setEditingSection(sectionKey);
    setSection(sectionKey);
    setModalError("");

    const { sectionMembers, keys, texts, positions, locked } =
      seatSectionMembers(sectionKey);

    setSelectedOfficials(keys);
    setManualTexts(texts);
    setManualPositions(positions);
    setLockedPositions(locked);

    if (SECTION_BEHAVIOR[sectionKey].supportsRoles) {
      const roles = {};
      sectionMembers.forEach((m) => {
        const text = String(m.official_text || "").trim();
        const key = keys.find((k) => texts[k] === text && text);
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
      /* Every key in the selection becomes one member row, whether it came off
         the roster or was typed by hand. Manual text is read from the same
         `manualTexts` map the modal keeps, so a name only has to be entered
         once and survives an edit round-trip. */
      const resolvedOfficials = selectedOfficials
        .map((key) => {
          const member = resolveSelectedMember(
            key,
            manualTexts[key] || "",
            manualPositions[key] || "",
          );
          return { key, ...member };
        })
        .filter((member) => isManualKey(member.key) || member.officialTerm);

      /* A manual row that names neither a person nor a seat would store an
         empty member, so it is refused here rather than written as a blank row.
         A seat on its own is fine — that is a position the memo defines and
         nobody fills yet. */
      const blankRow = resolvedOfficials.some(
        (m) =>
          isManualKey(m.key) &&
          !m.official_text &&
          !String(m.position_title || "").trim(),
      );
      if (blankRow) {
        setModalError(
          "Enter a name or a position for each member, or remove the row",
        );
        return;
      }

      const behavior = SECTION_BEHAVIOR[section];
      const payload = {
        ...behavior.buildPayload(resolvedOfficials, execRoles),
        academic_year: academicYear,
      };

      /* The save target is decided by `resolveSaveRequest`, which refuses to
         build a PUT without a real document id. Interpolating `gfps._id` here
         unconditionally is what sent a first save to `/api/gfps/undefined`,
         a path with no POST handler, so the write was answered 405 and lost. */
      const { method, url } = resolveSaveRequest({
        editingSection,
        gfpsId: gfps?._id,
        academicYear,
      });

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        /* 405 means the chosen path has no handler for this method — the
           signature of a bad save target rather than a rejected payload, so it
           is named instead of surfacing as an anonymous failure. */
        setModalError(
          res.status === 405
            ? "Could not save: the save route rejected this request. Reload the page and try again."
            : data?.error || data?.message || "Failed to save GFPS",
        );
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

  /* A year with no document at all loads as `{}`, so there is genuinely nothing
     to draw. But a document that exists and happens to hold no rows is a
     different state: it is a real (if empty) committee, and collapsing the page
     to `EmptyState` hid every section card — which made an empty chart read as
     "members are not being recorded" and left no surface for a per-section
     error. A document id is therefore enough to render the sections. */
  const hasData =
    Boolean(gfps?._id) ||
    (Object.keys(gfps).length > 0 &&
      SECTIONS.some((sec) => sectionHasData(gfps, sec.key)));

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
          selectedOfficials={selectedOfficials}
          manualTexts={manualTexts}
          manualPositions={manualPositions}
          lockedPositions={lockedPositions}
          execRoles={execRoles}
          error={modalError}
          submitting={submitting}
          onClose={handleCloseModal}
          onSectionChange={handleAddSectionChange}
          onSelectedChange={setSelectedOfficials}
          onManualTextsChange={setManualTexts}
          onManualPositionsChange={setManualPositions}
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
