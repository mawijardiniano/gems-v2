"use client";

import React, { useState } from "react";
import {
  FaBan,
  FaBuilding,
  FaCheckCircle,
  FaLock,
  FaPlus,
  FaRedo,
} from "react-icons/fa";
import {
  filterOfficesByTab,
  officeCountsWithAssigned,
} from "@/data/lib/universityOffices";
import Button from "@/components/ui/Button";

/**
 * The one place the university office list is edited.
 *
 * Rendered inside the Settings page ("Offices & Groups") and reused read-only
 * where a picker needs the same presentation. The copy always names the surface
 * that consumes the list — the "Office / Group" picker on the University
 * Officials page — and says out loud that the event offices (Organizing Office,
 * Responsible Unit) are a separate, hard-coded list, because both are called
 * "office" in this system.
 *
 * Props
 *   - `offices` rows from `/api/university-offices` (may carry `assigned_count`).
 *   - `onAdd(name)`, `onDeactivate(office)`, `onReactivate(office)` — omit all
 *     three to render the read-only variant used by roles that may not write.
 *   - `counts` optional pre-computed counts (defaults to counting `offices`).
 *   - `academicYear` labels the assigned-official counts.
 */

const TABS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "inactive", label: "Inactive" },
];

const TITLE = "Offices & Groups — University Officials";

function OfficePill({ active }) {
  return active ? (
    <span className="inline-flex items-center gap-1 rounded-full border border-success-border bg-success-subtle px-2.5 py-0.5 text-xs font-medium text-success">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full border border-line bg-muted px-2.5 py-0.5 text-xs font-medium text-fg-muted">
      <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
      Inactive
    </span>
  );
}

function OfficeRow({ office, canEdit, busy, onDeactivate, onReactivate }) {
  const active = office.is_active !== false;
  const assigned = Number(office.assigned_count || 0);

  return (
    <li
      className={`flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
        active ? "" : "bg-subtle/60"
      }`}
    >
      <div className={`min-w-0 ${active ? "" : "opacity-60"}`}>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`truncate text-sm font-medium ${
              active ? "text-fg" : "text-fg-muted"
            }`}
          >
            {office.header}
          </span>
          <OfficePill active={active} />
        </div>
        <p className="mt-0.5 text-xs text-fg-muted">
          {active
            ? `${assigned} assigned`
            : `Hidden from the Office / Group picker on the University Officials page — past years keep their assignments.`}
        </p>
      </div>

      {canEdit && (
        <div className="shrink-0">
          {active ? (
            <button
              type="button"
              onClick={() => onDeactivate(office)}
              disabled={busy}
              title="Deactivate this office (hidden from new assignments)"
              className="inline-flex items-center gap-1.5 rounded-lg border border-secondary-200 bg-secondary-50 px-3 py-1.5 text-xs font-medium text-secondary-700 transition hover:bg-secondary-100 hover:border-secondary-300 disabled:opacity-50"
            >
              <FaBan className="h-3 w-3" />
              Deactivate
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onReactivate(office)}
              disabled={busy}
              title="Reactivate this office"
              className="inline-flex items-center gap-1.5 rounded-lg border border-success-border bg-success-subtle px-3 py-1.5 text-xs font-medium text-success transition hover:bg-emerald-100 hover:border-emerald-300 disabled:opacity-50"
            >
              <FaRedo className="h-3 w-3" />
              Reactivate
            </button>
          )}
        </div>
      )}
    </li>
  );
}

export default function OfficesManager({
  offices = [],
  counts,
  academicYear = "",
  busy = false,
  onAdd,
  onDeactivate,
  onReactivate,
}) {
  const [draft, setDraft] = useState("");
  const [tab, setTab] = useState("all");
  /**
   * The rows are all loaded (inactive included); this decides how the "All" tab
   * presents them. On the Active/Inactive tabs the selection is implied — the
   * tab is the filter — so the checkbox only applies to "All".
   */
  const [showInactive, setShowInactive] = useState(true);

  const canEdit = Boolean(onAdd || onDeactivate || onReactivate);
  const summary = counts || officeCountsWithAssigned(offices);
  const activeTab =
    tab === "inactive" ? true : tab === "all" ? showInactive : false;
  const rows = filterOfficesByTab(offices, tab, { includeInactive: activeTab });

  const submit = async (event) => {
    event.preventDefault();
    if (!onAdd || busy) return;
    const created = await onAdd(draft);
    if (created) setDraft("");
  };

  return (
    <div
      data-offices-manager
      className="rounded-2xl border border-line-subtle bg-white p-5 shadow-sm"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary-50 text-secondary-600">
            <FaBuilding />
          </div>
          <div>
            <h3 className="text-base font-semibold text-fg">{TITLE}</h3>
            <p className="mt-0.5 max-w-2xl text-xs text-fg-muted">
              These offices appear in the{" "}
              <span className="font-medium text-fg-4">Office / Group</span>{" "}
              picker on the University Officials page. They do not affect event
              offices (Organizing Office, Responsible Unit). Deactivating hides
              an office from new assignments but keeps past years intact.
            </p>
          </div>
        </div>
        <span className="shrink-0 self-start rounded-full border border-line bg-subtle px-2.5 py-0.5 text-xs font-medium text-fg-4">
          {summary.total} total
        </span>
      </div>

      {canEdit ? (
        <form
          onSubmit={submit}
          className="mt-4 flex flex-col gap-2 sm:flex-row"
        >
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="e.g. OFFICE OF THE REGISTRAR"
            aria-label="New office name"
            className="flex-1 min-w-0 rounded-lg border border-line bg-white px-3 py-2 text-sm focus:border-secondary-500 focus:outline-none focus:ring-2 focus:ring-secondary-100"
          />
          <Button
            variant="primary"
            className="shrink-0"
            type="submit"
            disabled={busy || !draft.trim()}
          >
            <FaPlus className="h-3 w-3" />
            {busy ? "Working..." : "Add Office"}
          </Button>
        </form>
      ) : (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-line-subtle bg-subtle px-3 py-2 text-xs text-fg-4">
          <FaLock className="mt-0.5 shrink-0 text-fg-muted" />
          <span>
            Read-only: only the GAD focal person can add or deactivate offices.
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
                  ? "border-secondary-200 bg-secondary-50 text-secondary-700"
                  : "border-line bg-white text-fg-4 hover:bg-subtle"
              }`}
            >
              {t.label} (
              {t.key === "all" && !showInactive
                ? summary.active
                : summary[t.key]}
              )
            </button>
          );
        })}

        <label className="ml-auto inline-flex cursor-pointer select-none items-center gap-2 text-xs text-fg-muted">
          <input
            type="checkbox"
            checked={showInactive || tab === "inactive"}
            disabled={tab === "inactive"}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-line-strong text-secondary-600 focus:ring-secondary-100 disabled:opacity-50"
          />
          Show inactive offices
        </label>
      </div>

      {summary.inactive > 0 && !showInactive && tab !== "inactive" && (
        <p className="mt-2 text-xs text-fg-muted">
          {summary.inactive} inactive office(s) hidden. A name that is refused
          as a duplicate may be one of them — tick “Show inactive offices” or
          open the Inactive tab to reactivate it.
        </p>
      )}

      <ul className="mt-3 divide-y divide-line-subtle overflow-hidden rounded-xl border border-line-subtle">
        {rows.length === 0 ? (
          <li className="px-4 py-6 text-center text-sm text-fg-muted">
            No offices in this view.
          </li>
        ) : (
          rows.map((office) => (
            <OfficeRow
              key={office._id || office.header}
              office={office}
              canEdit={canEdit}
              busy={busy}
              onDeactivate={onDeactivate}
              onReactivate={onReactivate}
            />
          ))
        )}
      </ul>

      <p className="mt-3 text-xs text-fg-muted">
        Offices are never deleted — past academic years, prints and reports keep
        referencing them.
      </p>
    </div>
  );
}
