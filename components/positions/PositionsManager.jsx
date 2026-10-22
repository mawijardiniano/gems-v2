"use client";

import React, { useMemo, useState } from "react";
import {
  FaBan,
  FaCheckCircle,
  FaChevronDown,
  FaChevronRight,
  FaLayerGroup,
  FaLock,
  FaPen,
  FaPlus,
  FaRedo,
  FaTimes,
} from "react-icons/fa";
import {
  assignedLabel,
  filterPositionsByTab,
  hasAmbiguousName,
  seatCountLabel,
  sortPositions,
} from "@/lib/universityPositionsUi";

/**
 * The one place the university seat list ("positions") is edited.
 *
 * An office is a *column* of the org chart ("EXECUTIVE OFFICIALS"); a position
 * is a *seat* inside one ("University President"). Offices & Groups edits the
 * columns — this edits the seats, which is why the rows are grouped by office
 * header and why the header is printed on every row: "Head, Student Affairs
 * and Services" exists in all three MARSU branches, so a bare name is
 * ambiguous.
 *
 * Following the OfficesManager contract exactly:
 *   - All rows (inactive included) are loaded; the tabs filter client-side.
 *   - Editing is one rename + move + order form per row, opened inline.
 *   - Deactivating is refused by the API while terms reference the seat, so the
 *     handler runs the two-step confirm; the client never deletes.
 *   - Omit the handlers to render the read-only variant for other roles.
 *
 * Presentation: the seats are an *accordion* of office columns, closed by
 * default. A real roster runs to 150+ seats across ~10 columns, so the card
 * opens as an index of columns (each with its seat count) and the seats are the
 * detail. Expanding is purely local state — nothing about the list, the
 * filters or the write paths changes.
 *
 * Props
 *   - `positions` rows from `/api/positions` (may carry `assigned_count`).
 *   - `offices` office rows, used for the "move to office" picker.
 *   - `onAdd(header, name)`, `onUpdate(position, patch)`,
 *     `onDeactivate(position)`, `onReactivate(position)`.
 *   - `academicYear` labels the term counts.
 */

const TABS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "inactive", label: "Inactive" },
];

/**
 * Office headers are human text ("EXECUTIVE OFFICIALS", "HEAD, STUDENT
 * AFFAIRS") and cannot go into an `id` as-is. The accordion needs a stable,
 * DOM-safe id per group so the toggle button's `aria-controls` can point at the
 * panel it opens. Kept module-scope and pure so both the button and the panel
 * derive the same string from the same header — a mismatch here is exactly the
 * kind of silent breakage that produced the `All ()` empty-bracket bug.
 */
const groupPanelId = (header) =>
  `positions-group-${String(header || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")}`;

function SeatPill({ active }) {
  return active ? (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium text-gray-500">
      <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
      Inactive
    </span>
  );
}

/**
 * Inline edit form for one seat: rename, move between office columns, set the
 * order. Only rendered while the row is being edited, so the list stays
 * scannable.
 */
function SeatEditForm({ seat, offices, busy, onCancel, onSave }) {
  const [name, setName] = useState(seat.name || "");
  const [header, setHeader] = useState(seat.header || "");
  const [order, setOrder] = useState(
    Number.isFinite(Number(seat.sort_order)) ? String(seat.sort_order) : "",
  );

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;

    const patch = {};
    const nextName = name.trim();
    if (nextName && nextName !== seat.name) patch.name = nextName;
    if (header && header !== seat.header) patch.header = header;
    if (order !== "" && Number(order) !== Number(seat.sort_order)) {
      patch.sort_order = Number(order);
    }

    /* A rename re-reads past tenures under the new wording — terms point at the
       seat by id — so say so before it happens rather than after. */
    if (
      patch.name &&
      typeof window !== "undefined" &&
      !window.confirm(
        `Rename "${seat.name}" to "${nextName}"? Every term in this seat's history — past and present — will read under the new name.`,
      )
    ) {
      return;
    }

    if (!Object.keys(patch).length) {
      onCancel();
      return;
    }

    const saved = await onSave(seat, patch);
    if (saved) onCancel();
  };

  return (
    <form onSubmit={submit} className="mt-2 flex flex-col gap-2 lg:flex-row">
      <div className="grid flex-1 gap-2 sm:grid-cols-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Position name"
          placeholder="e.g. Head, Student Affairs and Services"
          className="min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
        <select
          value={header}
          onChange={(e) => setHeader(e.target.value)}
          aria-label="Office / group"
          className="min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
        >
          {/*
            The seat's own header comes first: it can be missing from `offices`
            on an older install, and a select with no matching option silently
            resets the value to the first column.
          */}
          {!offices.some((o) => o.header === seat.header) && (
            <option value={seat.header}>{seat.header}</option>
          )}
          {offices.map((o) => (
            <option key={o._id || o.header} value={o.header}>
              {o.header}
              {o.is_active === false ? " (inactive)" : ""}
            </option>
          ))}
        </select>
        <input
          type="number"
          value={order}
          onChange={(e) => setOrder(e.target.value)}
          aria-label="Sort order"
          placeholder="Order in column"
          className="min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
      </div>
      <div className="flex shrink-0 items-start gap-2">
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          <FaCheckCircle className="h-3 w-3" />
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
        >
          <FaTimes className="h-3 w-3" />
          Cancel
        </button>
      </div>
    </form>
  );
}

/**
 * One seat. The full office header is always printed — "Head, Student Affairs
 * and Services" exists in three branches, so the name alone does not identify
 * the seat. `showHeader` is false inside a grouped column where the header is
 * already the group heading.
 */
function SeatRow({
  seat,
  offices,
  canEdit,
  busy,
  showHeader,
  ambiguous,
  onUpdate,
  onDeactivate,
  onReactivate,
}) {
  const [editing, setEditing] = useState(false);
  const active = seat.is_active !== false;
  const assigned = Number(seat.assigned_count || 0);

  return (
    <li
      className={`px-4 py-3 ${active ? "" : "bg-gray-50/60"}`}
      data-position-id={seat._id}
      data-position-active={active ? "true" : "false"}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className={`min-w-0 flex-1 ${active ? "" : "opacity-60"}`}>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`text-sm font-medium ${
                active ? "text-gray-900" : "text-gray-500"
              }`}
            >
              {seat.name}
            </span>
            <SeatPill active={active} />
            {ambiguous && (
              <span
                title="Another office column has a seat with this same name"
                className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700"
              >
                shared name
              </span>
            )}
          </div>

          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-gray-400">
            {showHeader && (
              <>
                <span className="font-medium text-gray-500">{seat.header}</span>
                <span aria-hidden="true">Â·</span>
              </>
            )}
            <span className={assigned ? "text-gray-500" : "text-gray-400"}>
              {assignedLabel(seat)}
            </span>
            <span aria-hidden="true">Â·</span>
            <span>order {Number.isFinite(Number(seat.sort_order)) ? seat.sort_order : "—"}</span>
          </p>
        </div>

        {canEdit && !editing && (
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              title="Rename, move or reorder this seat"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
            >
              <FaPen className="h-3 w-3" />
              Edit
            </button>

            {active ? (
              <button
                type="button"
                onClick={() => onDeactivate(seat)}
                disabled={busy}
                title="Deactivate this seat (no longer offered for new assignments)"
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 transition hover:bg-amber-100 hover:border-amber-300 disabled:opacity-50"
              >
                <FaBan className="h-3 w-3" />
                Deactivate
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onReactivate(seat)}
                disabled={busy}
                title="Reactivate this seat"
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 hover:border-emerald-300 disabled:opacity-50"
              >
                <FaRedo className="h-3 w-3" />
                Reactivate
              </button>
            )}
          </div>
        )}
      </div>

      {canEdit && editing && (
        <SeatEditForm
          seat={seat}
          offices={offices}
          busy={busy}
          onCancel={() => setEditing(false)}
          onSave={onUpdate}
        />
      )}
    </li>
  );
}

export default function PositionsManager({
  positions = [],
  offices = [],
  academicYear = "",
  busy = false,
  onAdd,
  onUpdate,
  onDeactivate,
  onReactivate,
}) {
  const [tab, setTab] = useState("all");
  /**
   * Rows are all loaded (inactive included); this decides how the "All" tab
   * presents them. On the Active/Inactive tabs the selection is implied — the
   * tab *is* the filter — so the checkbox only applies to "All".
   */
  const [showInactive, setShowInactive] = useState(true);
  const [addHeader, setAddHeader] = useState("");
  const [addName, setAddName] = useState("");
  /**
   * Accordion state: the office columns whose seats are *open*.
   *
   * Stored as the set of OPEN headers rather than collapsed ones so the default
   * (an empty set) is "everything closed" with no seeding effect and no first-
   * paint flash. 156 seats across 10 columns is a long scroll; collapsed by
   * default turns the card into a 10-row index of columns, which is the
   * question the card actually answers ("which office has which seats").
   *
   * Keyed by `header` (not index) so the open/closed choice survives tab
   * switches, filtering and re-sorts.
   */
  const [openGroups, setOpenGroups] = useState(() => new Set());

  const toggleGroup = (header) =>
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(header)) next.delete(header);
      else next.add(header);
      return next;
    });

  const canEdit = Boolean(onAdd || onUpdate || onDeactivate || onReactivate);

  const activeTab = tab === "inactive" ? true : tab === "all" ? showInactive : false;
  const rows = filterPositionsByTab(positions, tab).filter(
    (p) => activeTab || p.is_active !== false,
  );

  /**
   * Tab numbers. `all` is read by the tabs as `summary[t.key]` with
   * `t.key === "all"`; without the key that tab rendered `All ()` — empty
   * brackets — while `total` drove the card's own seat badge instead.
   *
   * The sorted list is a local (`sorted`, not `all`) so the `all` count key
   * below is not shadowed by it.
   */
  const summary = useMemo(() => {
    const sorted = sortPositions(positions);
    return {
      total: sorted.length,
      all: sorted.length,
      active: sorted.filter((p) => p.is_active !== false).length,
      inactive: sorted.filter((p) => p.is_active === false).length,
      vacant: sorted.filter(
        (p) => p.is_active !== false && !Number(p.assigned_count || 0),
      ).length,
    };
  }, [positions]);

  /* Active columns only for the picker: adding a seat to a deactivated office
     would be refused by the API anyway (409), so it is not offered.

     Named `activeOfficeOptions`, not `selectableOffices`: that name is taken by
     the shared helper in lib/universityOffices.js (imported by this chunk's
     siblings), and a module-scope `const` shadowing it produced
     "ReferenceError: selectableOffices is not defined" in
     university-officials/content.jsx at runtime. */
  const activeOfficeOptions = useMemo(
    () => offices.filter((o) => o.is_active !== false),
    [offices],
  );

  const submitAdd = async (event) => {
    event.preventDefault();
    if (!onAdd || busy) return;
    if (!addHeader || !addName.trim()) return;
    const created = await onAdd(addHeader, addName.trim());
    if (created) {
      setAddName("");
      /* The new seat lands in a column that may be collapsed. Opening it is the
         difference between "it worked" and "it silently did nothing". */
      setOpenGroups((prev) => new Set(prev).add(addHeader));
    }
  };

  /**
   * The visible rows grouped by office column, in office order.
   *
   * Grouping (rather than a flat list) is the whole point: the office header is
   * the disambiguator, so a seat is only identified by its column *and* its
   * name. Columns whose seats are all filtered out by the tab are dropped.
   */
  const groups = useMemo(() => {
    const order = offices.map((o) => o.header);
    const buckets = new Map();
    for (const seat of rows) {
      if (!buckets.has(seat.header)) buckets.set(seat.header, []);
      buckets.get(seat.header).push(seat);
    }
    return [...buckets.entries()]
      .map(([header, seats]) => ({ header, seats }))
      .sort((a, b) => {
        const ai = order.indexOf(a.header);
        const bi = order.indexOf(b.header);
        if (ai === -1 && bi === -1) return a.header.localeCompare(b.header);
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      });
  }, [rows, offices]);

  /**
   * Every rendered column open? Drives the Expand/Collapse-all control, and is
   * derived from `groups` rather than a flag so it stays truthful after
   * filtering removes columns or the seats move between tabs.
   */
  const allGroupsOpen =
    groups.length > 0 && groups.every((g) => openGroups.has(g.header));

  const toggleAllGroups = () =>
    setOpenGroups((prev) => {
      const openNow = groups.length > 0 && groups.every((g) => prev.has(g.header));
      if (openNow) {
        // Close only the rendered columns, so a group hidden by the tab keeps
        // whichever state the operator left it in.
        const next = new Set(prev);
        for (const g of groups) next.delete(g.header);
        return next;
      }
      const next = new Set(prev);
      for (const g of groups) next.add(g.header);
      return next;
    });

  const renderGroup = (group) => {
    const office = offices.find((o) => o.header === group.header);
    const officeInactive = office ? office.is_active === false : false;
    const open = openGroups.has(group.header);
    const panelId = groupPanelId(group.header);

    return (
      <section key={group.header} data-position-group={group.header}>
        <div className="flex flex-wrap items-center gap-2 px-1">
          {/* The header *is* the toggle. A real <button> (not a clickable div)
              so it is keyboard-reachable and announces its state; the chevron is
              decorative and hidden from the accessibility tree. */}
          <button
            type="button"
            onClick={() => toggleGroup(group.header)}
            aria-expanded={open}
            aria-controls={panelId}
            className="flex flex-wrap items-center gap-2 rounded-lg px-1 py-0.5 text-left transition hover:bg-gray-50"
          >
            <FaChevronRight
              aria-hidden="true"
              className={`h-2.5 w-2.5 shrink-0 text-gray-400 transition-transform ${
                open ? "rotate-90" : ""
              }`}
            />
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {group.header}
            </h4>
            <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-500">
              {seatCountLabel(group.seats.length)}
            </span>
          </button>
          {/* Outside the button: keeping it in would join the toggle's accessible
              name and it must stay readable while the column is collapsed. */}
          {officeInactive && (
            <span
              title="This office column is deactivated — its seats can be viewed but not added to"
              className="rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500"
            >
              office inactive
            </span>
          )}
        </div>

        {/* Unmounted rather than height-animated: 156 rows of layout thrash for a
            disclosure is not worth it. */}
        {open && (
          <ul
            id={panelId}
            className="mt-2 divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-100"
          >
            {group.seats.map((seat) => (
              <SeatRow
                key={seat._id || `${seat.header}|${seat.name}`}
                seat={seat}
                offices={offices}
                canEdit={canEdit}
                busy={busy}
                showHeader={false}
                ambiguous={hasAmbiguousName(positions, seat)}
                onUpdate={onUpdate}
                onDeactivate={onDeactivate}
                onReactivate={onReactivate}
              />
            ))}
          </ul>
        )}
      </section>
    );
  };

  return (
    <div
      id="positions"
      data-positions-manager
      className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <FaLayerGroup />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              Positions — Seats per Office
            </h3>
            <p className="mt-0.5 max-w-2xl text-xs text-gray-500">
              An office is a column of the org chart; a position is one seat
              inside it — for example{" "}
              <span className="font-medium text-gray-600">University President</span>{" "}
              under{" "}
              <span className="font-medium text-gray-600">EXECUTIVE OFFICIALS</span>.
              Renaming a seat rewrites how every term in its history reads.
              Deactivating retires a seat from new assignments without touching
              the officials who held it.
              {academicYear ? (
                <>
                  {" "}
                  Counts below are the{" "}
                  <span className="font-medium text-gray-600">
                    {academicYear}
                  </span>{" "}
                  roster.
                </>
              ) : null}
            </p>
          </div>
        </div>
        <span className="shrink-0 self-start rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-[11px] font-medium text-gray-600">
          {seatCountLabel(summary.total)}
        </span>
      </div>

      {canEdit ? (
        <form
          onSubmit={submitAdd}
          className="mt-4 flex flex-col gap-2 lg:flex-row"
        >
          <select
            value={addHeader}
            onChange={(e) => setAddHeader(e.target.value)}
            aria-label="Office / group for the new seat"
            className="min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 lg:w-64"
          >
            <option value="">Select office / group…</option>
            {activeOfficeOptions.map((o) => (
              <option key={o._id || o.header} value={o.header}>
                {o.header}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            placeholder="e.g. Head, Student Affairs and Services"
            aria-label="New position name"
            className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
          <button
            type="submit"
            disabled={busy || !addHeader || !addName.trim()}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            <FaPlus className="h-3 w-3" />
            {busy ? "Working..." : "Add Position"}
          </button>
        </form>
      ) : (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-600">
          <FaLock className="mt-0.5 shrink-0 text-gray-400" />
          <span>
            Read-only: only the GAD focal person can add, rename or deactivate
            positions.
          </span>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {TABS.map((t) => {
          const isActiveTab = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                isActiveTab
                  ? "border-blue-200 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {t.label} ({t.key === "all" && !showInactive ? summary.active : summary[t.key]})
            </button>
          );
        })}

        <button
          type="button"
          onClick={toggleAllGroups}
          disabled={groups.length === 0}
          className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
        >
          <FaChevronDown
            aria-hidden="true"
            className={`h-2.5 w-2.5 text-gray-400 transition-transform ${
              allGroupsOpen ? "rotate-180" : ""
            }`}
          />
          {allGroupsOpen ? "Collapse all" : "Expand all"}
        </button>

        <label className="ml-auto inline-flex cursor-pointer select-none items-center gap-2 text-xs text-gray-500">
          <input
            type="checkbox"
            checked={showInactive || tab === "inactive"}
            disabled={tab === "inactive"}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-100 disabled:opacity-50"
          />
          Show inactive seats
        </label>
      </div>

      {summary.inactive > 0 && !showInactive && tab !== "inactive" && (
        <p className="mt-2 text-[11px] text-gray-400">
          {summary.inactive} inactive seat(s) hidden. A name refused as a
          duplicate may be one of them — tick “Show inactive seats” or open the
          Inactive tab to reactivate it.
        </p>
      )}

      {rows.length === 0 ? (
        <div className="mt-3 rounded-xl border border-gray-100 px-4 py-6 text-center text-sm text-gray-500">
          No positions in this view.
        </div>
      ) : (
        <div className="mt-3 space-y-4">{groups.map((group) => renderGroup(group))}</div>
      )}

      <p className="mt-3 text-[11px] text-gray-400">
        Positions are never deleted — term history and previously printed charts
        keep referencing them. Deactivate a seat you no longer use instead.
      </p>
    </div>
  );
}
