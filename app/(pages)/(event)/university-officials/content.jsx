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
} from "react-icons/fa";
import {
  HEADERS,
  SEATS_BY_HEADER,
} from "@/lib/universityOfficialsConstants";
import { buildOrgChart, getOfficialPersonName } from "@/lib/universityOfficialsMerge";
import PrintUniversityOfficials from "../components/Print/PrintUniversityOfficials";

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
const headerColor = (header) =>
  HEADER_COLORS[HEADERS.indexOf(header) % HEADER_COLORS.length];

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

// ─── User Search Field ─────────────────────────────────────────────
function UserSearchField({ onChange, users, selectedUserId, autoFocus }) {
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
          autoFocus={autoFocus}
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

// ─── Assign / Reassign Modal ───────────────────────────────────────
function OfficialModal({
  open,
  mode,
  onClose,
  onSubmit,
  onFormChange,
  users,
  form,
  filledKeys,
  loading,
  error,
}) {
  if (!open) return null;

  const isEdit = mode === "edit";
  const seats = SEATS_BY_HEADER[form.header] || [];
  const selectedSeat = seats.find((seat) => seat.key === form.seatKey);

  const pickFirstOpenSeat = (header) =>
    (SEATS_BY_HEADER[header] || []).find((seat) => !filledKeys.has(seat.key)) || null;

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
                    : "Pick a position from the MarSU chart, then the person who fills it"}
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
                Position
              </label>
              <div className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
                {selectedSeat?.position || form.position || ""}
              </div>
              <p className="mt-1.5 text-xs text-gray-400">{form.header}</p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">
                  Office / Group
                </label>
                <select
                  value={form.header || ""}
                  onChange={(e) => {
                    const header = e.target.value;
                    const seat = pickFirstOpenSeat(header);
                    onFormChange("header", header);
                    onFormChange("seatKey", seat?.key || "");
                  }}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition bg-white"
                >
                  <option value="">Select office / group</option>
                  {HEADERS.map((header) => {
                    const list = SEATS_BY_HEADER[header] || [];
                    const openCount = list.filter((s) => !filledKeys.has(s.key)).length;
                    return (
                      <option key={header} value={header}>
                        {header} ({openCount}/{list.length} open)
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">
                  Position / Designation
                </label>
                <select
                  value={form.seatKey || ""}
                  onChange={(e) => onFormChange("seatKey", e.target.value)}
                  required
                  disabled={!form.header}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition bg-white disabled:bg-gray-50 disabled:text-gray-400"
                >
                  <option value="">Select position</option>
                  {seats.map((seat) => (
                    <option
                      key={seat.key}
                      value={seat.key}
                      disabled={filledKeys.has(seat.key)}
                    >
                      {seat.position}
                      {filledKeys.has(seat.key) ? " — filled" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">
              Name
            </label>
            <UserSearchField
              onChange={(userId) => onFormChange("name", userId)}
              users={users}
              selectedUserId={form.name}
              autoFocus={isEdit}
            />
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
  const filled = seats.filter((seat) => seat.official).length;
  const total = seats.length;
  const complete = filled === total;

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
              {filled} of {total} seat{total !== 1 ? "s" : ""} filled
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              complete
                ? "bg-emerald-50 text-emerald-600"
                : filled > 0
                  ? "bg-amber-50 text-amber-600"
                  : "bg-gray-50 text-gray-400"
            }`}
          >
            {complete ? "Complete" : filled > 0 ? "Partial" : "All Vacant"}
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
                  Position / Designation
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                {!isCoordinator && (
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {seats.map((seat) => {
                const person = seat.official ? getOfficialPersonName(seat.official.name) : "";
                return (
                  <tr key={seat.key} className="hover:bg-gray-50/80 transition-colors duration-150 group">
                    <td className="px-6 py-3.5">
                      <span className="text-sm text-gray-700">{seat.position}</span>
                    </td>
                    <td className="px-6 py-3.5">
                      {seat.official ? (
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 flex items-center justify-center text-xs font-bold text-blue-700 shrink-0">
                            {(person[0] || "?").toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-gray-900">{person}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          seat.official
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-gray-50 text-gray-400"
                        }`}
                      >
                        {seat.official ? "Filled" : "Vacant"}
                      </span>
                    </td>
                    {!isCoordinator && (
                      <td className="px-6 py-3.5 text-right">
                        {seat.official ? (
                          <div className="inline-flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <button
                              onClick={() => onEdit(seat)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-300 transition-all"
                            >
                              <FaEdit className="h-3 w-3" />
                              Reassign
                            </button>
                            <button
                              onClick={() => onVacate(seat)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 hover:border-red-300 transition-all"
                            >
                              <FaTrash className="h-3 w-3" />
                              Vacate
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => onAssign(seat)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-300 transition-all"
                          >
                            <FaPlus className="h-3 w-3" />
                            Assign
                          </button>
                        )}
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
  );
}

// ─── Unlisted Assignments ──────────────────────────────────────────
function UnlistedCard({ unlisted, onEdit, onVacate, isCoordinator }) {
  if (unlisted.length === 0) return null;

  return (
    <div className="rounded-2xl bg-white border border-amber-200 shadow-sm overflow-hidden mb-5">
      <div className="px-6 py-4 flex items-center gap-3 bg-amber-50/50">
        <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
          <FaExclamationTriangle className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Unlisted assignments ({unlisted.length})
          </h3>
          <p className="text-xs text-gray-500">
            These seats no longer match the designations document — reassign or vacate them.
          </p>
        </div>
      </div>
      <div className="overflow-x-auto border-t border-amber-100">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-gray-50">
            {unlisted.map((official) => (
              <tr key={official._id} className="hover:bg-gray-50/80 transition-colors group">
                <td className="px-6 py-3.5">
                  <span className="text-sm text-gray-700">{official.position}</span>
                  <p className="text-xs text-gray-400">{official.header}</p>
                </td>
                <td className="px-6 py-3.5">
                  <span className="text-sm font-medium text-gray-900">
                    {getOfficialPersonName(official.name)}
                  </span>
                </td>
                {!isCoordinator && (
                  <td className="px-6 py-3.5 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        onClick={() => onEdit(official)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-all"
                      >
                        <FaEdit className="h-3 w-3" />
                        Reassign
                      </button>
                      <button
                        onClick={() => onVacate(official)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-all"
                      >
                        <FaTrash className="h-3 w-3" />
                        Vacate
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
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

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("assign");
  const [modalForm, setModalForm] = useState({});
  const [modalError, setModalError] = useState("");
  const [modalLoading, setModalLoading] = useState(false);

  const chart = useMemo(() => buildOrgChart(assignments), [assignments]);

  const filledKeys = useMemo(
    () =>
      new Set(
        assignments.map((a) => `${a.header}::${a.title}::${a.unit || ""}`),
      ),
    [assignments],
  );

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

  const fetchOfficials = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/university-officials");
      const data = await res.json();
      setAssignments(Array.isArray(data.data) ? data.data : []);
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

  // Expand the first header on first load so the page does not look empty.
  useEffect(() => {
    if (!loading && HEADERS.length) {
      setExpanded((prev) =>
        Object.keys(prev).length ? prev : { [HEADERS[0]]: true },
      );
    }
  }, [loading]);

  const toggleHeader = (header) =>
    setExpanded((prev) => ({ ...prev, [header]: !prev[header] }));

  const changeModalForm = (field, value) =>
    setModalForm((prev) => ({ ...prev, [field]: value }));

  const openAssign = (seat) => {
    const header =
      seat?.header ||
      HEADERS.find((h) =>
        (SEATS_BY_HEADER[h] || []).some((s) => !filledKeys.has(s.key)),
      ) ||
      HEADERS[0];
    const seatKey =
      seat?.key ||
      (SEATS_BY_HEADER[header] || []).find((s) => !filledKeys.has(s.key))?.key ||
      "";

    setModalMode("assign");
    setModalForm({ header, seatKey, name: "", position: "" });
    setModalError("");
    setModalOpen(true);
  };

  const openEdit = (official) => {
    setModalMode("edit");
    setModalForm({
      header: official.header,
      seatKey:
        official.key ||
        `${official.header}::${official.title}::${official.unit || ""}`,
      position: official.position,
      name: official.name?._id || official.name || "",
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
      if (!modalForm.name) {
        setModalError("Select the person for this seat");
        return;
      }

      if (modalMode === "edit") {
        const res = await fetch(`/api/university-officials/${modalForm.editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: modalForm.name }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setModalError(data.error || "Failed to reassign seat");
          return;
        }
        setSuccess("Seat reassigned successfully!");
      } else {
        const seat = (SEATS_BY_HEADER[modalForm.header] || []).find(
          (s) => s.key === modalForm.seatKey,
        );
        if (!seat) {
          setModalError("Select a valid position");
          return;
        }
        const res = await fetch("/api/university-officials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            header: seat.header,
            title: seat.title,
            unit: seat.unit,
            name: modalForm.name,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setModalError(data.error || "Failed to assign official");
          return;
        }
        setSuccess("Official assigned successfully!");
        setExpanded((prev) => ({ ...prev, [seat.header]: true }));
      }

      closeModal();
      fetchOfficials();
    } catch {
      setModalError("Network error");
    } finally {
      setModalLoading(false);
    }
  };

  const handleVacate = async (official) => {
    if (
      !window.confirm(
        `Vacate "${official.position}"? The seat stays in the chart and can be reassigned later.`,
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
      fetchOfficials();
    } catch {
      setError("Network error");
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
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
              Manage the MarSU offices and administrative designations
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <PrintUniversityOfficials officials={assignments} />
          {!isCoordinator && (
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

      {/* ── Summary ─────────────────────────────────────────────── */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <FaUserTie className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Seats
                </p>
                <p className="text-xl font-bold text-gray-900">{chart.stats.seats}</p>
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
                  Filled
                </p>
                <p className="text-xl font-bold text-gray-900">{chart.stats.filled}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center">
                <FaBuilding className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vacant
                </p>
                <p className="text-xl font-bold text-gray-900">{chart.stats.vacant}</p>
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
              isCoordinator={isCoordinator}
            />
          ))}

          <UnlistedCard
            unlisted={chart.unlisted}
            onEdit={openEdit}
            onVacate={handleVacate}
            isCoordinator={isCoordinator}
          />
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
        filledKeys={filledKeys}
        loading={modalLoading}
        error={modalError}
      />
    </div>
  );
}





