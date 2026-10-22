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
  FaUserPlus,
  FaBan,
  FaCog,
  FaHistory,
  FaSitemap,
} from "react-icons/fa";
import Link from "next/link";
import { HEADERS } from "@/lib/universityOfficialsConstants";
import { buildOrgChart, getOfficialPersonName } from "@/lib/universityOfficialsMerge";
import { normalizeOfficeName, selectableOffices } from "@/lib/universityOffices";
import useUniversityOffices from "@/lib/useUniversityOffices";
import PrintUniversityOfficials from "../components/Print/PrintUniversityOfficials";
import SeatHistoryPanel from "../components/SeatHistoryPanel";

/** Sentinel option value for the "+ Add new office…" entry in the picker. */
const ADD_NEW_OFFICE_VALUE = "__add_new_office__";

/**
 * Badge for a term's `status`, as the roster's Status column shows it.
 *
 * The palette mirrors SeatHistoryPanel (amber for the temporary designations,
 * emerald for the regular holder) so a person reads the same in the roster row
 * and in their seat's timeline.
 *
 * `interim` is in the schema enum but has no rows and no logic anywhere, so it
 * is styled alongside `acting` rather than given a meaning of its own. An
 * absent or unrecognised status falls back to `substantive`: the roster row is
 * built from data that always carries a status, and defaulting to the ordinary
 * case is the honest reading for anything that somehow does not.
 */
const STATUS_BADGE = {
  substantive: { label: "Assigned", cls: "bg-emerald-50 text-emerald-600" },
  acting: { label: "Acting", cls: "bg-amber-50 text-amber-700" },
  interim: { label: "Interim", cls: "bg-amber-50 text-amber-700" },
  concurrent: { label: "Concurrent", cls: "bg-blue-50 text-blue-700" },
};

// ─── Header presentation ───────────────────────────────────────────
const HEADER_ICONS = {
  "EXECUTIVE OFFICIALS": FaUserTie,
  "PROGRAM CHAIRPERSONS": FaGraduationCap,
  "MARSU TORRIJOS BRANCH": FaMapMarkerAlt,
  "MARSU SANTA CRUZ BRANCH": FaMapMarkerAlt,
  "MARSU GASAN BRANCH": FaMapMarkerAlt,
};

const HEADER_COLORS = [
  "amber",
  "blue",
  "green",
  "violet",
  "indigo",
  "emerald",
  "rose",
  "sky",
  "orange",
  "teal",
];

const colorMap = {
  amber: "bg-amber-50 text-amber-600",
  blue: "bg-blue-50 text-blue-600",
  green: "bg-emerald-50 text-emerald-600",
  violet: "bg-violet-50 text-violet-600",
  indigo: "bg-indigo-50 text-indigo-600",
  emerald: "bg-emerald-50 text-emerald-600",
  rose: "bg-rose-50 text-rose-600",
  sky: "bg-sky-50 text-sky-600",
  orange: "bg-orange-50 text-orange-600",
  teal: "bg-teal-50 text-teal-600",
};

const headerIcon = (header) => HEADER_ICONS[header] || FaBuilding;
/**
 * Colour for an office card. Offices are added at runtime now, so an unknown
 * one falls back to a stable slot derived from its name instead of -1.
 */
const headerColor = (header) => {
  const index = HEADERS.indexOf(header);
  const slot =
    index >= 0
      ? index
      : String(header)
          .split("")
          .reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return HEADER_COLORS[slot % HEADER_COLORS.length];
};

// ─── Helpers ───────────────────────────────────────────────────────
function getUserFullName(user) {
  if (!user) return "";
  if (user.personal_info_id?.personal) {
    const p = user.personal_info_id.personal;
    if (p.first_name || p.last_name)
      return `${p.first_name || ""} ${p.last_name || ""}`.trim();
  }
  if (user.first_name || user.last_name)
    return `${user.first_name || ""} ${user.last_name || ""}`.trim();
  return user.username || user._id || "";
}

// ─── User Search Field + typed-name fallback ─────────────────────────
function UserSearchField({ onChange, users, selectedUserId, selectedNameText, autoFocus }) {
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const filteredUsers = useMemo(() => {
    let filtered = users;
    if (search) {
      const s = search.toLowerCase();
      filtered = users.filter(
        (u) =>
          u.username?.toLowerCase().includes(s) ||
          u.personal_info_id?.personal?.first_name?.toLowerCase().includes(s) ||
          u.personal_info_id?.personal?.last_name?.toLowerCase().includes(s),
      );
    }
    return filtered.slice(0, 30);
  }, [search, users]);

  const selectedName = useMemo(() => {
    if (selectedNameText) return selectedNameText;
    if (!selectedUserId) return "";
    const u = users.find((u) => u._id === selectedUserId);
    if (!u) return "";
    return getUserFullName(u);
  }, [selectedUserId, selectedNameText, users]);

  return (
    <div className="relative">
      <div className="relative">
        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
        <input
          type="text"
          className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition"
          placeholder="Search user, or type a name..."
          value={search || selectedName}
          onChange={(e) => {
            setSearch(e.target.value);
            setShowDropdown(true);
            onChange({ userId: "", nameText: e.target.value });
          }}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          autoComplete="off"
          autoFocus={autoFocus}
        />
      </div>
      {showDropdown && (
        <div className="absolute z-20 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
          {search.trim() && (
            <button
              type="button"
              className="w-full text-left px-3 py-2 text-sm text-blue-700 hover:bg-blue-50 transition"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange({ userId: "", nameText: search.trim() });
                setSearch("");
                setShowDropdown(false);
              }}
            >
              Use &quot;{search.trim()}&quot;
            </button>
          )}
          {filteredUsers.length === 0 && !search.trim() ? (
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
                  onChange({ userId: u._id, nameText: "" });
                  setSearch("");
                  setShowDropdown(false);
                }}
              >
                <div className="h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600 shrink-0">
                  {(u.personal_info_id?.personal?.first_name?.[0] || u.username?.[0] || "?").toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">{getUserFullName(u)}</p>
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

// ─── Office / Group picker ──────────────────────────────────────────
/**
 * Picks one office from the shared list.
 *
 * The list itself is edited on the Settings page ("Offices & Groups —" card),
 * so this stays a plain picker plus an inline "add a name that is not there
 * yet" row — the one write the modal still needs, because assigning somebody to
 * a brand-new office should not require leaving the modal. Deactivating lives
 * in Settings only, so the two surfaces cannot disagree about it.
 */
function OfficeSelect({
  offices,
  value,
  onChange,
  includeInactive,
  onToggleInactive,
  onAddOffice,
  canAddOffice = false,
  busy,
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  const options = useMemo(
    () =>
      selectableOffices(offices, includeInactive).filter(
        (o) => o.is_active !== false || o.header === value,
      ),
    [offices, includeInactive, value],
  );

  const submitNewOffice = async () => {
    const name = normalizeOfficeName(draft);
    if (!name) return;
    const created = await onAddOffice(name);
    setDraft("");
    setAdding(false);
    if (created) onChange(created.header);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <select
          value={adding ? "" : value || ""}
          onChange={(e) => {
            if (e.target.value === ADD_NEW_OFFICE_VALUE) {
              setAdding(true);
              return;
            }
            onChange(e.target.value);
          }}
          className="flex-1 min-w-0 px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition bg-white"
        >
          <option value="">Select office / group</option>
          {options.map((office) => (
            <option key={office._id || office.header} value={office.header}>
              {office.header}
              {office.is_active === false ? " (inactive)" : ""}
            </option>
          ))}
          {canAddOffice && (
            <option value={ADD_NEW_OFFICE_VALUE}>+ Add new office…</option>
          )}
        </select>
      </div>

      {adding && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submitNewOffice();
              }
              if (e.key === "Escape") {
                setAdding(false);
                setDraft("");
              }
            }}
            placeholder="e.g. OFFICE OF THE REGISTRAR"
            className="flex-1 min-w-0 px-3 py-2 text-sm border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition bg-white"
          />
          <button
            type="button"
            onClick={submitNewOffice}
            disabled={busy || !normalizeOfficeName(draft)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 shrink-0"
          >
            <FaPlus className="h-3 w-3" />
            Save
          </button>
          <button
            type="button"
            onClick={() => {
              setAdding(false);
              setDraft("");
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition shrink-0"
          >
            Cancel
          </button>
        </div>
      )}

      <label className="inline-flex items-center gap-2 text-xs text-gray-500 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={includeInactive}
          onChange={(e) => onToggleInactive(e.target.checked)}
          className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-100"
        />
        Show inactive offices
      </label>
    </div>
  );
}

// ─── Assign / Reassign Modal ───────────────────────────────────────
function OfficialModal({
  open,
  mode,
  onClose,
  onSubmit,
  onFormChange,
  users,
  form,
  positionSuggestions,
  loading,
  error,
  offices,
  includeInactiveOffices,
  onToggleInactiveOffices,
  canAddOffice = false,
  onAddOffice,
  assignedCounts,
  officeBusy,
}) {
  if (!open) return null;

  const isEdit = mode === "edit";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden animate-scale-in">
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                {isEdit ? (
                  <FaEdit className="h-4 w-4 text-white" />
                ) : (
                  <FaUserPlus className="h-4 w-4 text-white" />
                )}
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  {isEdit ? "Reassign Seat" : "Assign Official"}
                </h2>
                <p className="text-xs text-gray-500">
                  {isEdit
                    ? "Assign a different person to this seat"
                    : "Pick a seat from the MarSU chart, then the person who fills it"}
                </p>
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

        <form onSubmit={onSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2.5 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              <FaExclamationTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isEdit ? (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">
                Seat
              </label>
              <div className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
                {form.name || ""}
              </div>
              <p className="mt-1.5 text-xs text-gray-400">{form.header}</p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">
                  Office / Group
                </label>
                <OfficeSelect
                  offices={offices || []}
                  value={form.header}
                  onChange={(header) => onFormChange("header", header)}
                  includeInactive={includeInactiveOffices}
                  onToggleInactive={onToggleInactiveOffices}
                  onAddOffice={onAddOffice}
                  canAddOffice={canAddOffice}
                  busy={officeBusy}
                />
                {assignedCounts && form.header ? (
                  <p className="mt-1.5 text-xs text-gray-400">
                    {assignedCounts.map[form.header] || 0} assigned official
                    {(assignedCounts.map[form.header] || 0) === 1 ? "" : "s"}{" "}
                    already in this office.
                  </p>
                ) : null}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">
                  Seat (type manually)
                </label>
                <input
                  type="text"
                  list="official-seat-suggestions"
                  value={form.name || ""}
                  onChange={(e) => onFormChange("name", e.target.value)}
                  required
                  disabled={!form.header}
                  placeholder="e.g. Secretary of the University and of the Board of Regents"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition bg-white disabled:bg-gray-50 disabled:text-gray-400"
                />
                <datalist id="official-seat-suggestions">
                  {(positionSuggestions || []).map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">
              Official (pick a user or type a name)
            </label>
            <UserSearchField
              onChange={({ userId, nameText }) => {
                onFormChange("official", userId);
                onFormChange("official_text", nameText);
              }}
              users={users}
              selectedUserId={form.official}
              selectedNameText={form.official_text}
              autoFocus={isEdit}
            />
          </div>

          {/* How the seat is held, not who holds it. Only the three statuses
              that carry data are offered: `interim` is in the schema enum but
              has no rows and nothing in the app reads it, so offering it would
              invent vocabulary the data does not have. Whether an acting or
              concurrent designation can be filed on a seat that already has a
              substantive holder is enforced server-side, not here. */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">
              Status
            </label>
            <select
              value={form.status || "substantive"}
              onChange={(e) => onFormChange("status", e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition bg-white"
            >
              <option value="substantive">Substantive — regular holder</option>
              <option value="acting">Acting — temporary designation</option>
              <option value="concurrent">Concurrent — holds a second seat</option>
            </select>
          </div>

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
              {loading ? "Saving..." : isEdit ? "Save Changes" : "Assign Official"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Header Card ───────────────────────────────────────────────────
function HeaderCard({
  header,
  seats,
  expanded,
  onToggle,
  onAssign,
  onEdit,
  onVacate,
  isCoordinator,
}) {
  const Icon = headerIcon(header);
  const color = headerColor(header);
  const filled = seats.length;
  const total = seats.length;

  /* Which seat rows have their tenure trail open. Keyed by seat name (unique
     within one office), held here rather than in the parent so collapsing the
     office also discards it — reopening a card starts from the roster again. */
  const [historyFor, setHistoryFor] = useState({});

  const toggleHistory = (seatName) =>
    setHistoryFor((prev) => ({ ...prev, [seatName]: !prev[seatName] }));

  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden mb-5 transition-all duration-200 hover:shadow-md">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition"
      >
        <div className="flex items-center gap-3">
          <div className={`h-9 w-9 rounded-lg ${colorMap[color] || colorMap.blue} flex items-center justify-center`}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-gray-900">{header}</h3>
            <p className="text-xs text-gray-500">
              {filled} assigned official{total !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
            Assigned only
          </span>
          {expanded ? (
            <FaChevronDown className="h-3.5 w-3.5 text-gray-400" />
          ) : (
            <FaChevronRight className="h-3.5 w-3.5 text-gray-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-50 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Seat
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                {/* Always present now: the History button lives in this column
                    and is offered to every role. */}
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {seats.map((seat) => {
                const official = seat.official;
                const person = official
                  ? getOfficialPersonName(official.official_text || official.official)
                  : "";
                const historyOpen = !!historyFor[seat.name];
                /* Vacant seats take the row without an `official`, so the badge
                   is resolved from what is actually there rather than assumed. */
                const badge = official
                  ? STATUS_BADGE[official.status] || STATUS_BADGE.substantive
                  : null;
                return (
                  <React.Fragment key={seat.key}>
                    <tr className="hover:bg-gray-50/80 transition-colors duration-150 group">
                      <td className="px-6 py-3.5">
                        <span className="text-sm text-gray-700">{seat.name}</span>
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 flex items-center justify-center text-xs font-bold text-blue-700 shrink-0">
                            {(person[0] || "?").toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-gray-900">{person}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5">
                        {badge ? (
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.cls}`}
                          >
                            {badge.label}
                          </span>
                        ) : (
                          /* The seat exists but nobody holds it. Previously every
                             row printed "Assigned", vacancy included. */
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                            Vacant
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <div className="inline-flex items-center gap-2">
                          {/* History is read-only, so it is offered to every role —
                              coordinators included — and stays visible on hover
                              rather than hiding with the edit actions. */}
                          <button
                            onClick={() => toggleHistory(seat.name)}
                            aria-expanded={historyOpen}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-lg transition-all ${
                              historyOpen
                                ? "text-gray-700 bg-gray-100 border-gray-300"
                                : "text-gray-600 bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                            }`}
                          >
                            <FaHistory className="h-3 w-3" />
                            {historyOpen ? "Hide" : "History"}
                          </button>
                          {!isCoordinator && (
                            <div className="inline-flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                              <button
                                onClick={() => onEdit(official)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-300 transition-all"
                              >
                                <FaEdit className="h-3 w-3" />
                                Reassign
                              </button>
                              <button
                                onClick={() => onVacate(official)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 hover:border-red-300 transition-all"
                              >
                                <FaTrash className="h-3 w-3" />
                                Remove
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                    {historyOpen && (
                      <tr>
                        {/* Mounting this is what triggers the fetch, so the trail
                            is only ever requested for a seat actually opened. */}
                        <td colSpan={4} className="p-0">
                          <SeatHistoryPanel header={header} name={seat.name} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Unlisted Assignments (unused in assigned-only mode) ─────────────
function UnlistedCard() {
  return null;
}

// ─── Main Component ────────────────────────────────────────────────
export default function UniversityOfficialsContent() {
  const role = useSelector((state) => state.auth.role);
  const isCoordinator = role === "gad coordinator";

  const [assignments, setAssignments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  /* Academic-year snapshot state. Every roster is year-scoped; past years
     stay viewable + printable, only the active year is editable. Declared
     before the office hook because the office counts are scoped to it. */
  const [academicYear, setAcademicYear] = useState("");
  const [yearOptions, setYearOptions] = useState([]);
  const [activeYear, setActiveYear] = useState("");
  const [copying, setCopying] = useState(false);

  /* ── Offices & Groups ────────────────────────────────────────────────
     The office list is global and shared with the Settings > Offices & Groups
     card through lib/useUniversityOffices.js, so both surfaces show the same
     rows and the same assigned-official counts. Adding/deactivating is done
     from Settings; the modal's picker can still create a new name inline. */
  const {
    offices,
    setOffices,
    busy: officeBusy,
    includeInactive: includeInactiveOffices,
    setIncludeInactive: setIncludeInactiveOffices,
    activeHeaders,
    counts: officeCounts,
    addOffice: handleAddOffice,
  } = useUniversityOffices({
    includeCounts: true,
    academicYear,
    onError: setError,
    onSuccess: setSuccess,
  });

  // Org-chart filters (applied on top of the selected year).
  const [search, setSearch] = useState("");
  const [headerFilter, setHeaderFilter] = useState("all");

  const isArchived = Boolean(activeYear && academicYear && academicYear !== activeYear);
  const canEdit = !isCoordinator && !isArchived;

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("assign");
  const [modalForm, setModalForm] = useState({});
  const [modalError, setModalError] = useState("");
  const [modalLoading, setModalLoading] = useState(false);

  const filteredChart = useMemo(() => {
    const base = buildOrgChart(assignments);
    const q = search.trim().toLowerCase();
    const matchesSeat = (row) => {
      if (headerFilter !== "all" && row.header !== headerFilter) return false;
      if (!q) return true;
      const person = getOfficialPersonName(
        row.official?.official_text || row.official?.official,
      ).toLowerCase();
      return person.includes(q) || (row.name || "").toLowerCase().includes(q);
    };
    const rows = base.rows.filter(matchesSeat);
    const byHeader = base.byHeader
      .map((group) => {
        const seats = group.seats.filter(matchesSeat);
        return {
          ...group,
          seats,
          filled: seats.length,
          total: seats.length,
        };
      })
      .filter((group) => group.seats.length > 0);
    return { ...base, rows, byHeader };
  }, [assignments, search, headerFilter]);

  const chart = filteredChart;

  const positionSuggestions = useMemo(() => {
    const header = modalForm.header;
    if (!header) return [];
    return [
      ...new Set(
        assignments
          .filter((a) => a.header === header)
          .map((a) => a.name)
          .filter(Boolean),
      ),
    ];
  }, [assignments, modalForm.header]);

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(""), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(""), 4000);
      return () => clearTimeout(t);
    }
  }, [error]);

  const fetchOfficials = useCallback(
    async (year) => {
      const target = year || academicYear;
      if (!target) return;
      setLoading(true);
      try {
        const res = await fetch(
          `/api/university-officials?academic_year=${encodeURIComponent(target)}&include_inactive=true`,
        );
        const data = await res.json();
        setAssignments(Array.isArray(data.data) ? data.data : []);
        if (Array.isArray(data.offices)) setOffices(data.offices);
        if (Array.isArray(data.years) && data.years.length) {
          setYearOptions(data.years);
        }
        if (data.active_year) setActiveYear(data.active_year);
        if (data.academic_year && data.academic_year !== target) {
          setAcademicYear(data.academic_year);
        }
      } catch {
        setError("Failed to load officials");
      } finally {
        setLoading(false);
      }
    },
    [academicYear],
  );

  const handleCopyForward = useCallback(async () => {
    if (!academicYear || copying) return;
    const sorted = [...yearOptions].sort((a, b) => b.localeCompare(a));
    const source = sorted.find((y) => y < academicYear) || sorted[0];
    if (!source || source === academicYear) {
      setError("No previous year to copy from");
      return;
    }
    if (
      !window.confirm(
        `Copy ${assignments.length || "the"} assignment(s) from AY ${source} to AY ${academicYear}? Past years stay unchanged.`,
      )
    ) {
      return;
    }
    setCopying(true);
    try {
      const res = await fetch("/api/university-officials/copy-forward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: source, to: academicYear }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to copy roster");
        return;
      }
      setSuccess(`Copied ${data.data.copied} assignment(s) from AY ${source}!`);
      fetchOfficials(academicYear);
    } catch {
      setError("Network error");
    } finally {
      setCopying(false);
    }
  }, [academicYear, copying, yearOptions, assignments.length, fetchOfficials]);

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
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const requested = params.get("ay");
        const res = await fetch("/api/university-officials/years");
        const data = await res.json();
        const years = Array.isArray(data.data) ? data.data : [];
        if (data.active_year) setActiveYear(data.active_year);
        const initial =
          (requested && years.includes(requested) && requested) ||
          data.active_year ||
          years[0] ||
          "";
        setYearOptions(years.length ? years : initial ? [initial] : []);
        if (initial) setAcademicYear(initial);
        else setLoading(false);
      } catch {
        setLoading(false);
      }
    })();
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (academicYear) fetchOfficials(academicYear);
  }, [academicYear]);

  // Expand the first office on first load so the page does not look empty.
  useEffect(() => {
    if (!loading && activeHeaders.length) {
      setExpanded((prev) =>
        Object.keys(prev).length ? prev : { [activeHeaders[0]]: true },
      );
    }
  }, [loading, activeHeaders]);

  const toggleHeader = (header) =>
    setExpanded((prev) => ({ ...prev, [header]: !prev[header] }));

  const changeModalForm = (field, value) =>
    setModalForm((prev) => ({ ...prev, [field]: value }));

  const openAssign = (seat) => {
    const header = seat?.header || activeHeaders[0] || "";

    setModalMode("assign");
    setModalForm({
      header,
      name: "",
      official: "",
      official_text: "",
      /* Substantive is the ordinary case, so the picker opens on it and an
         operator who ignores the field gets the same term as before. */
      status: "substantive",
    });
    setModalError("");
    setModalOpen(true);
  };

  const openEdit = (official) => {
    setModalMode("edit");
    setModalForm({
      header: official.header,
      name: official.name,
      official:
        typeof official.official === "object"
          ? official.official?._id || ""
          : "",
      official_text:
        official.official_text ||
        (typeof official.official === "string" ? official.official : ""),
      /* Seeded from the row so the picker reflects the term that is actually
         there rather than silently resetting it to substantive. */
      status: official.status || "substantive",
      editingId: official._id,
    });
    setModalError("");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalForm({});
    setModalError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalError("");
    setModalLoading(true);

    try {
      const personName = String(modalForm.official_text || "").trim();
      if (!modalForm.header) {
        setModalError("Select an office");
        return;
      }
      if (!personName && !modalForm.official) {
        setModalError("Pick a user or type a name");
        return;
      }

      if (modalMode === "edit") {
        const res = await fetch(`/api/university-officials/${modalForm.editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            official: modalForm.official || null,
            official_text: modalForm.official ? "" : personName,
            academic_year: academicYear,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setModalError(data.error || "Failed to reassign official");
          return;
        }
        setSuccess("Official reassigned successfully!");
      } else {
        const seatName = String(modalForm.name || "").trim();
        if (!seatName) {
          setModalError("Type the seat");
          return;
        }
        const res = await fetch("/api/university-officials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            header: modalForm.header,
            name: seatName,
            official: modalForm.official || null,
            official_text: modalForm.official ? "" : personName,
            academic_year: academicYear,
            status: modalForm.status || "substantive",
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setModalError(data.error || "Failed to assign official");
          return;
        }
        setSuccess("Official assigned successfully!");
        setExpanded((prev) => ({ ...prev, [modalForm.header]: true }));
      }

      closeModal();
      fetchOfficials(academicYear);
    } catch {
      setModalError("Network error");
    } finally {
      setModalLoading(false);
    }
  };

  const handleVacate = async (official) => {
    if (
      !window.confirm(
        `Vacate "${official.name}"? The seat stays in the chart and can be reassigned later.`,
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/university-officials/${official._id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to vacate seat");
        return;
      }
      setSuccess("Seat vacated — it now shows as vacant.");
      fetchOfficials(academicYear);
    } catch {
      setError("Network error");
    }
  };

  return (
    <div className="p-6 max-w-8xl mx-auto space-y-6">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-200">
            <FaUniversity className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              University Officials
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Manage the MarSU offices and administrative designations per academic year
            </p>
            {/* The Office / Group picker and the Seat picker in the assign modal
                are both fed by the lists edited under Settings. These link there
                and the target card flashes so the operator sees where they are.
                Offices and Positions are separate cards because they are separate
                things: Offices are the columns, Positions are the seats in them. */}
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <Link
                href="/gad-settings#offices"
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800"
              >
                <FaCog className="h-3 w-3" />
                Manage Offices
              </Link>
              <Link
                href="/gad-settings#positions"
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800"
              >
                <FaSitemap className="h-3 w-3" />
                Manage Positions
              </Link>
            </div>
            {academicYear && (
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <label
                  htmlFor="officials-year"
                  className="text-xs font-medium text-gray-500"
                >
                  Academic Year
                </label>
                <select
                  id="officials-year"
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
        <div className="flex items-center gap-3">
          <PrintUniversityOfficials officials={assignments} academicYear={academicYear} />
          {canEdit && assignments.length === 0 && !loading && (
            <button
              onClick={handleCopyForward}
              disabled={copying}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition-all duration-200 disabled:opacity-50"
            >
              {copying ? "Copying..." : "Copy from previous year"}
            </button>
          )}
          {canEdit && (
            <button
              onClick={() => openAssign(null)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-sm shadow-blue-200"
            >
              <FaPlus className="h-3.5 w-3.5" />
              Assign Official
            </button>
          )}
        </div>
      </div>

      {isArchived && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-sm">
          <FaExclamationTriangle className="h-5 w-5 shrink-0" />
          <span>
            Viewing archived AY {academicYear} — read-only. Switch to AY {activeYear} to make changes.
          </span>
        </div>
      )}

      {!loading && canEdit && assignments.length === 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-800 text-sm">
          <span>
            No roster for AY {academicYear} yet. Copy last year&apos;s assignments or assign seats manually.
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

      {/* ── Success / Error Banners ─────────────────────────────── */}
      {success && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm">
          <FaCheckCircle className="h-5 w-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">
          <FaExclamationTriangle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Filters ─────────────────────────────────────────────── */}
      {!loading && assignments.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or seat..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none bg-white"
            />
          </div>
          <select
            value={headerFilter}
            onChange={(e) => setHeaderFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
          >
            <option value="all">All offices</option>
            {activeHeaders.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* ── Summary ─────────────────────────────────────────────── */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <FaUserTie className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned Officials
                </p>
                <p className="text-xl font-bold text-gray-900">{chart.stats.filled}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                <FaCheckCircle className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Offices Shown
                </p>
                <p className="text-xl font-bold text-gray-900">{chart.byHeader.length}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Org chart ───────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-16 rounded-2xl bg-white border border-gray-100 shadow-sm animate-pulse"
            />
          ))}
        </div>
      ) : (
        <>
          {chart.byHeader.map(({ header, seats }) => (
            <HeaderCard
              key={header}
              header={header}
              seats={seats}
              expanded={!!expanded[header]}
              onToggle={() => toggleHeader(header)}
              onAssign={openAssign}
              onEdit={openEdit}
              onVacate={handleVacate}
              isCoordinator={isCoordinator || isArchived}
            />
          ))}

          <UnlistedCard />
        </>
      )}

      <OfficialModal
        open={modalOpen}
        mode={modalMode}
        onClose={closeModal}
        onSubmit={handleSubmit}
        onFormChange={changeModalForm}
        users={users}
        form={modalForm}
        positionSuggestions={positionSuggestions}
        loading={modalLoading}
        error={modalError}
        offices={offices}
        includeInactiveOffices={includeInactiveOffices}
        onToggleInactiveOffices={setIncludeInactiveOffices}
        canAddOffice={canEdit}
        onAddOffice={handleAddOffice}
        assignedCounts={officeCounts}
        officeBusy={officeBusy}
      />
    </div>
  );
}





