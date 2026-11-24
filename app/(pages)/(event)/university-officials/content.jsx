"use client";

import React, { useEffect, useState, useMemo, useCallback, useId } from "react";
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
  FaUsers,
  FaLink,
} from "react-icons/fa";
import { useDialog } from "@/hooks/useDialog";
import { useConfirm } from "@/components/ui/useConfirm";
import Link from "next/link";
import { HEADERS } from "@/data/lib/universityOfficialsConstants";
import {
  buildOrgChart,
  countOfficialsBySex,
  getOfficialPersonName,
  normalizeOfficialSex,
  OFFICIAL_SEX_LABELS,
  OFFICIAL_SEX_VALUES,
} from "@/data/lib/universityOfficialsMerge";
import {
  normalizeOfficeName,
  selectableOffices,
} from "@/data/lib/universityOffices";
import useUniversityOffices from "@/data/lib/useUniversityOffices";
import PrintUniversityOfficials from "../components/Print/PrintUniversityOfficials";
import SeatHistoryPanel from "../components/SeatHistoryPanel";
import Button from "@/components/ui/Button";

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
  substantive: { label: "Assigned", cls: "bg-success-subtle text-success" },
  acting: { label: "Acting", cls: "bg-secondary-50 text-secondary-700" },
  interim: { label: "Interim", cls: "bg-secondary-50 text-secondary-700" },
  concurrent: {
    label: "Concurrent",
    cls: "bg-secondary-50 text-secondary-700",
  },
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
  amber: "bg-secondary-50 text-secondary-600",
  blue: "bg-secondary-50 text-secondary-600",
  green: "bg-success-subtle text-success",
  violet: "bg-secondary-50 text-secondary-600",
  indigo: "bg-secondary-50 text-secondary-600",
  emerald: "bg-success-subtle text-success",
  rose: "bg-rose-50 text-rose-600",
  sky: "bg-primary-50 text-primary-600",
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

// ─── Person search + typed-name fallback ─────────────────────────────
/**
 * The official's name field. Typing sets the name directly (a manual entry);
 * after a short pause the text is also sent to the server-side person search,
 * and picking a result fills in that employee's real name.
 *
 * The search runs on the server (/api/university-officials/person-search):
 * editors only, employees only, at most 10 rows, name/office/sex only. Names
 * are matched through an encrypted index of whole words, so the hint asks for
 * a full first or last name — "maria" finds Maria, "mar" does not.
 */
const PERSON_SEARCH_DELAY_MS = 300;

function PersonSearchField({ value, onChange, onPick, autoFocus }) {
  const [query, setQuery] = useState(value || "");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  /* The dropdown opens only once the editor has typed in this field. Edit
     opens with the field focused and pre-filled, and opening on that focus
     covered the link line and the Sex choice before anything was asked for. */
  const [typed, setTyped] = useState(false);

  const term = query.trim();
  const searchable =
    term.length > 0 && term.split(/\s+/).every((word) => word.length >= 2);

  useEffect(() => {
    if (!showDropdown || !searchable) {
      setResults([]);
      setSearching(false);
      return undefined;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      setSearchError("");
      try {
        const res = await fetch(
          `/api/university-officials/person-search?q=${encodeURIComponent(term)}`,
          { signal: controller.signal },
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) {
          setResults([]);
          setSearchError(data.error || "Search failed");
          return;
        }
        setResults(Array.isArray(data.data) ? data.data : []);
      } catch (err) {
        if (err?.name !== "AbortError") setSearchError("Network error");
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, PERSON_SEARCH_DELAY_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [term, searchable, showDropdown]);

  const pick = (name) => {
    setQuery(name);
    onChange(name);
    setShowDropdown(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-fg-muted" />
        <input
          type="text"
          className="w-full pl-9 pr-3 py-2.5 text-sm border border-line rounded-lg focus:ring-2 focus:ring-secondary-100 focus:border-secondary-500 outline-none transition"
          placeholder="Search an employee, or type a name..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(e.target.value);
            setTyped(true);
            setShowDropdown(true);
          }}
          onFocus={() => typed && setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          autoComplete="off"
          autoFocus={autoFocus}
        />
      </div>
      {showDropdown && term && (
        <div className="absolute z-20 w-full bg-white border border-line rounded-lg shadow-lg mt-1 max-h-56 overflow-y-auto">
          {searching && (
            <div className="px-3 py-2 text-sm text-fg-muted">Searching...</div>
          )}
          {!searching && searchError && (
            <div className="px-3 py-2 text-sm text-danger">{searchError}</div>
          )}
          {!searching &&
            results.map((r) => (
              <button
                key={r.gemsPublicId || r.name}
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-secondary-50 transition flex items-center gap-2 text-fg-3"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  pick(r.name);
                  onPick?.(r);
                }}
              >
                <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-fg-4 shrink-0">
                  {(r.name[0] || "?").toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">{r.name}</p>
                  {r.office && (
                    <p className="text-xs text-fg-muted truncate">{r.office}</p>
                  )}
                </div>
              </button>
            ))}
          {!searching && !searchError && !results.length && (
            <div className="px-3 py-2 text-xs text-fg-muted">
              {searchable
                ? "No employee found. Type a full first or last name, e.g. maria or santos."
                : "Type a full first or last name to search employees."}
            </div>
          )}
          <button
            type="button"
            className="w-full text-left px-3 py-2 text-sm text-secondary-700 hover:bg-secondary-50 transition border-t border-line-subtle"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => pick(term)}
          >
            Use &quot;{term}&quot; as typed
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Profile link line (form) ───────────────────────────────────────
/**
 * Shows whether the person in the form is linked to an employee profile.
 *
 * `form.profileRef` is only present once the editor acts: a picked search
 * result sets it to the profile token, Unlink sets it to null. Absent, the
 * saved link (`form.linked`) is kept as it is. The token itself is never
 * shown — "Linked to profile" is enough to tell a picked person from a typed
 * one, and the roster other roles read never carries it.
 */
function LinkLine({ form, onUnlink }) {
  const pending = typeof form.profileRef === "string" && form.profileRef;
  const unlinked = form.profileRef === null;
  const linked = pending || (form.linked && !unlinked);

  if (!linked) {
    return (
      <p className="mt-1.5 text-xs text-fg-muted">
        {unlinked && form.linked
          ? "Will be unlinked from the profile when you save."
          : "Not linked to a profile (typed name)."}
      </p>
    );
  }
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
      <span className="inline-flex items-center gap-1.5 text-secondary-700">
        <FaLink className="h-3 w-3" />
        {pending ? "Will link to this employee's profile" : "Linked to profile"}
      </span>
      {!pending && form.linkStatus === "differs" && (
        <span className="px-2 py-0.5 rounded-full bg-warning-subtle text-warning">
          Profile differs
        </span>
      )}
      {!pending && form.linkStatus === "broken" && (
        <span className="px-2 py-0.5 rounded-full bg-danger-subtle text-danger">
          Link broken
        </span>
      )}
      <button
        type="button"
        onClick={onUnlink}
        className="touch-target px-2 py-1 rounded-md border border-line text-fg-4 hover:bg-subtle transition"
      >
        Unlink
      </button>
    </div>
  );
}

// ─── Profile link badge (chart row) ─────────────────────────────────
/**
 * Small marker beside a linked official's name. "ok" is just the link icon;
 * "differs" adds an Update button for editors; "broken" says the profile is
 * gone. The profile's values are never shown here: the update runs on the
 * server.
 */
function LinkBadge({ status, canUpdate, onUpdate }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <FaLink
        className="h-3 w-3 text-secondary-600"
        aria-label="Linked to profile"
        title="Linked to profile"
      />
      {status === "differs" && (
        <>
          <span className="text-xs px-2 py-0.5 rounded-full bg-warning-subtle text-warning">
            Profile differs
          </span>
          {canUpdate && (
            <button
              type="button"
              onClick={onUpdate}
              className="touch-target text-xs px-2 py-0.5 rounded-md border border-line text-fg-4 hover:bg-subtle transition"
            >
              Update
            </button>
          )}
        </>
      )}
      {status === "broken" && (
        <span className="text-xs px-2 py-0.5 rounded-full bg-danger-subtle text-danger">
          Link broken
        </span>
      )}
    </span>
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
          className="flex-1 min-w-0 px-3 py-2.5 text-sm border border-line rounded-lg focus:ring-2 focus:ring-secondary-100 focus:border-secondary-500 outline-none transition bg-white"
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
                // Cancel only the inline add; keep the surrounding dialog open.
                e.stopPropagation();
                setAdding(false);
                setDraft("");
              }
            }}
            placeholder="e.g. OFFICE OF THE REGISTRAR"
            className="flex-1 min-w-0 px-3 py-2 text-sm border border-secondary-200 rounded-lg focus:ring-2 focus:ring-secondary-100 focus:border-secondary-500 outline-none transition bg-white"
          />
          <Button
            variant="primary"
            className="shrink-0"
            type="button"
            onClick={submitNewOffice}
            disabled={busy || !normalizeOfficeName(draft)}
          >
            <FaPlus className="h-3 w-3" />
            Save
          </Button>
          <Button
            variant="secondary"
            className="shrink-0"
            type="button"
            onClick={() => {
              setAdding(false);
              setDraft("");
            }}
          >
            Cancel
          </Button>
        </div>
      )}

      <label className="inline-flex items-center gap-2 text-xs text-fg-muted cursor-pointer select-none">
        <input
          type="checkbox"
          checked={includeInactive}
          onChange={(e) => onToggleInactive(e.target.checked)}
          className="h-3.5 w-3.5 rounded border-line-strong text-secondary-600 focus:ring-secondary-100"
        />
        Show inactive offices
      </label>
    </div>
  );
}

// ─── Assign / Edit Modal ───────────────────────────────────────
function OfficialModal({
  open,
  mode,
  onClose,
  onSubmit,
  onFormChange,
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
  const titleId = useId();
  const dialogRef = useDialog(onClose);

  if (!open) return null;

  const isEdit = mode === "edit";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden animate-scale-in"
      >
        <div className="px-6 py-5 border-b border-line-subtle">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-secondary-500 to-secondary-600 flex items-center justify-center shadow-sm">
                {isEdit ? (
                  <FaEdit className="h-4 w-4 text-white" />
                ) : (
                  <FaUserPlus className="h-4 w-4 text-white" />
                )}
              </div>
              <div>
                <h2 id={titleId} className="text-base font-semibold text-fg">
                  {isEdit ? "Edit Official" : "Assign Official"}
                </h2>
                <p className="text-xs text-fg-muted">
                  {isEdit
                    ? "Correct the name or status. For a new holder, vacate the seat, then assign."
                    : "Pick a seat from the MarSU chart, then the person who fills it"}
                </p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="touch-target h-8 w-8 rounded-lg flex items-center justify-center text-fg-muted hover:text-fg-4 hover:bg-muted transition"
            >
              <FaTimes className="h-4 w-4" />
            </button>
          </div>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2.5 rounded-xl bg-danger-subtle border border-danger-border px-4 py-3 text-sm text-danger">
              <FaExclamationTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isEdit ? (
            <div>
              <label className="block text-xs font-semibold text-fg-4 mb-1.5 uppercase tracking-wider">
                Seat
              </label>
              <div className="w-full px-3 py-2.5 text-sm border border-line rounded-lg bg-subtle text-fg-3">
                {form.name || ""}
              </div>
              <p className="mt-1.5 text-xs text-fg-muted">{form.header}</p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold text-fg-4 mb-1.5 uppercase tracking-wider">
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
                  <p className="mt-1.5 text-xs text-fg-muted">
                    {assignedCounts.map[form.header] || 0} assigned official
                    {(assignedCounts.map[form.header] || 0) === 1
                      ? ""
                      : "s"}{" "}
                    already in this office.
                  </p>
                ) : null}
              </div>

              <div>
                <label className="block text-xs font-semibold text-fg-4 mb-1.5 uppercase tracking-wider">
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
                  className="w-full px-3 py-2.5 text-sm border border-line rounded-lg focus:ring-2 focus:ring-secondary-100 focus:border-secondary-500 outline-none transition bg-white disabled:bg-subtle disabled:text-fg-disabled"
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
            <label className="block text-xs font-semibold text-fg-4 mb-1.5 uppercase tracking-wider">
              Official (search an employee or type a name)
            </label>
            <PersonSearchField
              value={form.official_text}
              onChange={(name) => onFormChange("official_text", name)}
              onPick={(person) => {
                onFormChange("sex", normalizeOfficialSex(person?.sex));
                /* Picking a search result links the person to that profile;
                   typing a name never does. */
                if (person?.gemsPublicId) {
                  onFormChange("profileRef", person.gemsPublicId);
                }
              }}
              autoFocus={isEdit}
            />
            <LinkLine form={form} onUnlink={() => onFormChange("profileRef", null)} />
          </div>

          {/* Stored on the person, so changing it here changes it on every
              seat they hold. Pre-filled when an employee is picked from the
              search; always editable for typed names. */}
          <fieldset>
            <legend className="block text-xs font-semibold text-fg-4 mb-1.5 uppercase tracking-wider">
              Sex
            </legend>
            <div className="flex flex-wrap gap-2">
              {OFFICIAL_SEX_VALUES.map((value) => {
                const checked = (form.sex || "unspecified") === value;
                return (
                  <label
                    key={value}
                    className={`touch-target inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg border cursor-pointer transition ${
                      checked
                        ? "border-secondary-500 bg-secondary-50 text-secondary-700"
                        : "border-line text-fg-3 hover:bg-subtle"
                    }`}
                  >
                    <input
                      type="radio"
                      name="official-sex"
                      value={value}
                      checked={checked}
                      onChange={() => onFormChange("sex", value)}
                      className="accent-secondary-600"
                    />
                    {OFFICIAL_SEX_LABELS[value]}
                  </label>
                );
              })}
            </div>
          </fieldset>

          {/* How the seat is held, not who holds it. Only the three statuses
              that carry data are offered: `interim` is in the schema enum but
              has no rows and nothing in the app reads it, so offering it would
              invent vocabulary the data does not have. Whether an acting or
              concurrent designation can be filed on a seat that already has a
              substantive holder is enforced server-side, not here. */}
          <div>
            <label className="block text-xs font-semibold text-fg-4 mb-1.5 uppercase tracking-wider">
              Status
            </label>
            <select
              value={form.status || "substantive"}
              onChange={(e) => onFormChange("status", e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-line rounded-lg focus:ring-2 focus:ring-secondary-100 focus:border-secondary-500 outline-none transition bg-white"
            >
              <option value="substantive">Substantive — regular holder</option>
              <option value="acting">Acting — temporary designation</option>
              <option value="concurrent">
                Concurrent — holds a second seat
              </option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-line-subtle">
            <Button
              variant="secondary"
              type="button"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Saving..."
                : isEdit
                  ? "Save Changes"
                  : "Assign Official"}
            </Button>
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
  onSync,
  isCoordinator,
}) {
  const Icon = headerIcon(header);
  const color = headerColor(header);
  const filled = seats.length;
  const total = seats.length;
  const sexCounts = countOfficialsBySex(seats);

  /* Which seat rows have their tenure trail open. Keyed by seat name (unique
     within one office), held here rather than in the parent so collapsing the
     office also discards it — reopening a card starts from the roster again. */
  const [historyFor, setHistoryFor] = useState({});

  const toggleHistory = (seatName) =>
    setHistoryFor((prev) => ({ ...prev, [seatName]: !prev[seatName] }));

  return (
    <div className="rounded-2xl bg-white border border-line-subtle shadow-sm overflow-hidden mb-5 transition duration-200 hover:shadow-md">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-subtle/50 transition"
      >
        <div className="flex items-center gap-3">
          <div
            className={`h-9 w-9 rounded-lg ${colorMap[color] || colorMap.blue} flex items-center justify-center`}
          >
            <Icon className="h-4 w-4" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-fg">{header}</h3>
            <p className="text-xs text-fg-muted">
              {filled} assigned official{total !== 1 ? "s" : ""}
              {" · "}
              <span className="tabular-nums">
                {sexCounts.female} F · {sexCounts.male} M
                {sexCounts.unspecified > 0 &&
                  ` · ${sexCounts.unspecified} not set`}
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-success-subtle text-success">
            Assigned only
          </span>
          {expanded ? (
            <FaChevronDown className="h-3.5 w-3.5 text-fg-muted" />
          ) : (
            <FaChevronRight className="h-3.5 w-3.5 text-fg-muted" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-line-faint overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-subtle/50 border-b border-line-subtle">
                <th className="px-6 py-3 text-left text-xs font-semibold text-fg-muted uppercase tracking-wider">
                  Seat
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-fg-muted uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-fg-muted uppercase tracking-wider">
                  Sex
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-fg-muted uppercase tracking-wider">
                  Status
                </th>
                {/* Always present now: the History button lives in this column
                    and is offered to every role. */}
                <th className="px-6 py-3 text-right text-xs font-semibold text-fg-muted uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-faint">
              {seats.map((seat) => {
                const official = seat.official;
                const person = official
                  ? getOfficialPersonName(
                      official.official_text || official.official,
                    )
                  : "";
                const historyOpen = !!historyFor[seat.name];
                /* Vacant seats take the row without an `official`, so the badge
                   is resolved from what is actually there rather than assumed. */
                const badge = official
                  ? STATUS_BADGE[official.status] || STATUS_BADGE.substantive
                  : null;
                return (
                  <React.Fragment key={seat.key}>
                    <tr className="hover:bg-subtle/80 transition-colors duration-150 group">
                      <td className="px-6 py-3.5">
                        <span className="text-sm text-fg-3">
                          {seat.name}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-secondary-50 to-secondary-100 border border-secondary-200 flex items-center justify-center text-xs font-bold text-secondary-700 shrink-0">
                            {(person[0] || "?").toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-fg">
                            {person}
                          </span>
                          {official?.linked && (
                            <LinkBadge
                              status={official.linkStatus}
                              canUpdate={!isCoordinator}
                              onUpdate={() => onSync(official)}
                            />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3.5">
                        {official &&
                          (normalizeOfficialSex(official.sex) ===
                          "unspecified" ? (
                            <span className="text-xs text-fg-muted italic whitespace-nowrap">
                              Not set
                            </span>
                          ) : (
                            <span className="text-sm text-fg-3">
                              {OFFICIAL_SEX_LABELS[normalizeOfficialSex(official.sex)]}
                            </span>
                          ))}
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
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-fg-muted">
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
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-lg transition ${
                              historyOpen
                                ? "text-fg-3 bg-muted border-line-strong"
                                : "text-fg-4 bg-white border-line hover:bg-subtle hover:border-line-strong"
                            }`}
                          >
                            <FaHistory className="h-3 w-3" />
                            {historyOpen ? "Hide" : "History"}
                          </button>
                          {!isCoordinator && (
                            <div className="inline-flex items-center gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition">
                              <button
                                onClick={() => onEdit(official)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-secondary-700 bg-secondary-50 border border-secondary-200 rounded-lg hover:bg-secondary-100 hover:border-secondary-300 transition"
                              >
                                <FaEdit className="h-3 w-3" />
                                Edit
                              </button>
                              <button
                                onClick={() => onVacate(official)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-danger bg-danger-subtle border border-danger-border rounded-lg hover:bg-red-100 hover:border-red-300 transition"
                              >
                                <FaTrash className="h-3 w-3" />
                                Vacate
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
                        <td colSpan={5} className="p-0">
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
  const { confirm, confirmDialog } = useConfirm();

  const [assignments, setAssignments] = useState([]);
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

  const isArchived = Boolean(
    activeYear && academicYear && academicYear !== activeYear,
  );
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
  const yearSex = useMemo(() => countOfficialsBySex(assignments), [assignments]);

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
  }, []);

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
      official_text: "",
      /* Substantive is the ordinary case, so the picker opens on it and an
         operator who ignores the field gets the same term as before. */
      sex: "unspecified",
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
      official_text:
        official.official_text ||
        (typeof official.official === "string" ? official.official : ""),
      /* Seeded from the row so the picker reflects the term that is actually
         there rather than silently resetting it to substantive. */
      sex: normalizeOfficialSex(official.sex),
      linked: Boolean(official.linked),
      linkStatus: official.linkStatus || null,
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
      if (!personName) {
        setModalError("Search an employee or type a name");
        return;
      }

      if (modalMode === "edit") {
        const res = await fetch(
          `/api/university-officials/${modalForm.editingId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              official_text: personName,
            sex: modalForm.sex || "unspecified",
            ...(modalForm.profileRef !== undefined
              ? { profileRef: modalForm.profileRef }
              : {}),
              status: modalForm.status || "substantive",
            }),
          },
        );
        const data = await res.json();
        if (!res.ok || !data.success) {
          setModalError(data.error || "Failed to update official");
          return;
        }
        setSuccess("Official updated.");
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
            official_text: personName,
            sex: modalForm.sex || "unspecified",
            ...(modalForm.profileRef !== undefined
              ? { profileRef: modalForm.profileRef }
              : {}),
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

  /* "Update from profile": refreshes the copied name/sex from the linked
     employee profile. Offered only when the roster reports "differs". */
  const handleSync = async (official) => {
    try {
      const res = await fetch(
        `/api/university-officials/${official._id}/sync`,
        { method: "POST" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to update from profile");
        return;
      }
      setSuccess(
        data.data?.changed?.length
          ? `Updated ${data.data.changed.join(" and ")} from the profile.`
          : "Already matches the profile.",
      );
      fetchOfficials(academicYear);
    } catch {
      setError("Network error");
    }
  };

  const handleVacate = async (official) => {
    if (
      !(await confirm({
        title: `Vacate "${official.name}"?`,
        message: "The seat stays in the chart and can be reassigned later.",
        confirmLabel: "Vacate",
        tone: "danger",
      }))
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
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-secondary-500 to-secondary-600 flex items-center justify-center shadow-lg shadow-secondary-200">
            <FaUniversity className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-fg">
              University Officials
            </h1>
            <p className="text-sm text-fg-muted mt-0.5">
              Manage the MarSU offices and administrative designations per
              academic year
            </p>
            {/* The Office / Group picker and the Seat picker in the assign modal
                are both fed by the lists edited under Settings. These link there
                and the target card flashes so the operator sees where they are.
                Offices and Positions are separate cards because they are separate
                things: Offices are the columns, Positions are the seats in them. */}
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <Link
                href="/gad-settings#offices"
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-medium text-fg-4 transition hover:border-line-strong hover:bg-subtle hover:text-fg-2"
              >
                <FaCog className="h-3 w-3" />
                Manage Offices
              </Link>
              <Link
                href="/gad-settings#positions"
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-medium text-fg-4 transition hover:border-line-strong hover:bg-subtle hover:text-fg-2"
              >
                <FaSitemap className="h-3 w-3" />
                Manage Positions
              </Link>
            </div>
            {academicYear && (
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <label
                  htmlFor="officials-year"
                  className="text-xs font-medium text-fg-muted"
                >
                  Academic Year
                </label>
                <select
                  id="officials-year"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm text-fg-3 focus:outline-none focus:ring-2 focus:ring-secondary-500/20 focus:border-secondary-500"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      AY {y}
                      {y === activeYear ? " (Active)" : ""}
                    </option>
                  ))}
                </select>
                {isArchived ? (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-secondary-50 text-secondary-700 border border-secondary-200">
                    Archived
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-success-subtle text-success border border-success-border">
                    Active
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <PrintUniversityOfficials
            officials={assignments}
            academicYear={academicYear}
          />
          {canEdit && (
            <Button
              variant="primary"
              onClick={() => openAssign(null)}
            >
              <FaPlus className="h-3.5 w-3.5" />
              Assign Official
            </Button>
          )}
        </div>
      </div>

      {isArchived && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-secondary-200 bg-secondary-50 text-secondary-700 text-sm">
          <FaExclamationTriangle className="h-5 w-5 shrink-0" />
          <span>
            Viewing archived AY {academicYear} — read-only. Switch to AY{" "}
            {activeYear} to make changes.
          </span>
        </div>
      )}

      {!loading && canEdit && assignments.length === 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-secondary-200 bg-secondary-50 text-secondary-800 text-sm">
          <span>
            No officials on the chart for AY {academicYear} yet. Officials stay
            on the chart every year until their seat is vacated.
          </span>
          <Button
            variant="primary"
            className="shrink-0"
            onClick={() => openAssign(null)}
          >
            <FaPlus className="h-3.5 w-3.5" />
            Assign Official
          </Button>
        </div>
      )}

      {/* ── Success / Error Banners ─────────────────────────────── */}
      {success && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-success-border bg-success-subtle text-success text-sm">
          <FaCheckCircle className="h-5 w-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-danger-border bg-danger-subtle text-danger text-sm">
          <FaExclamationTriangle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Filters ─────────────────────────────────────────────── */}
      {!loading && assignments.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-fg-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or seat..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-line rounded-xl focus:ring-2 focus:ring-secondary-100 focus:border-secondary-500 outline-none bg-white"
            />
          </div>
          <select
            value={headerFilter}
            onChange={(e) => setHeaderFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-line rounded-xl bg-white focus:ring-2 focus:ring-secondary-100 focus:border-secondary-500 outline-none"
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-white border border-line-subtle shadow-sm p-5">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-secondary-50 flex items-center justify-center">
                <FaUserTie className="h-6 w-6 text-secondary-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-fg-muted uppercase tracking-wider">
                  Assigned Officials
                </p>
                <p className="text-xl font-bold text-fg">
                  {chart.stats.filled}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-white border border-line-subtle shadow-sm p-5">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-success-subtle flex items-center justify-center">
                <FaCheckCircle className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-xs font-medium text-fg-muted uppercase tracking-wider">
                  Offices Shown
                </p>
                <p className="text-xl font-bold text-fg">
                  {chart.byHeader.length}
                </p>
              </div>
            </div>
          </div>
          {/* Seats by the holder's sex for the whole year (not the filtered
              view). The share of women is taken over seats whose holder's sex
              is recorded, so "not set" rows do not drag it down silently. */}
          <div className="rounded-2xl bg-white border border-line-subtle shadow-sm p-5">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-secondary-50 flex items-center justify-center">
                <FaUsers className="h-6 w-6 text-secondary-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-fg-muted uppercase tracking-wider">
                  Female / Male
                </p>
                <p className="text-xl font-bold text-fg tabular-nums">
                  {yearSex.female} / {yearSex.male}
                </p>
                <p className="text-xs text-fg-muted tabular-nums">
                  {yearSex.female + yearSex.male > 0
                    ? `${Math.round(
                        (yearSex.female / (yearSex.female + yearSex.male)) * 100,
                      )}% women`
                    : "No sex recorded yet"}
                  {yearSex.unspecified > 0 &&
                    ` · ${yearSex.unspecified} not set`}
                </p>
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
              className="h-16 rounded-2xl bg-white border border-line-subtle shadow-sm animate-pulse"
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
              onSync={handleSync}
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
      {confirmDialog}
    </div>
  );
}
