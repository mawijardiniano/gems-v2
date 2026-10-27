"use client";

import { useEffect, useRef } from "react";
import { SECTIONS } from "../gfps-config";
import { isManualKey, nextManualKey } from "../officials";

function ModalHeader({ editingSection, onClose }) {
  return (
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
                ? `Update members in ${SECTIONS.find((s) => s.key === editingSection)?.label}`
                : "Add members to a GFPS section"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function SectionSelect({ section, editingSection, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        Section
      </label>
      <select
        name="section"
        value={section}
        onChange={(e) => {
          if (!editingSection) onChange(e.target.value);
        }}
        disabled={!!editingSection}
        className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
      >
        {SECTIONS.map((s) => (
          <option key={s.key} value={s.key}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function AssignRoles({
  selectedOfficials,
  manualTexts = {},
  execRoles,
  onExecRolesChange,
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Assign Roles
      </label>
      {/* No inner `max-h`/`overflow-y-auto`: the dialog body already scrolls, and
          a second scrollbar inside it meant the wheel over this list could not
          reach the name rows above. The list now grows with the body instead. */}
      <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
        {selectedOfficials.map((key) => {
          /* Every row is a typed name: there is no roster entry to look up, so
             what the operator entered is what they see beside the selector. */
          const label = manualTexts[key] || "Unnamed member";
          const subLabel = "Typed manually";

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
                  {label}
                </p>
              </div>
              <select
                value={execRoles[key] || "member"}
                onChange={(e) =>
                  onExecRolesChange((r) => ({
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
  );
}

/**
 * The manual-entry rows: one text field per typed name.
 *
 * GFPS is maintained by hand, so every member is entered here: a person is
 * named, and optionally given the seat they hold. Each row keeps its synthetic
 * key, which is what keeps it editable across an edit round-trip.
 *
 * Each row also carries a seat ("Position / seat"). The memorandum defines a
 * seat before anyone is appointed to it, so a row with a seat and no name is a
 * valid, meaningful entry — it is what makes a vacant position visible on the
 * chart instead of absent. A row with neither is refused on submit.
 */
function ManualEntries({
  manualKeys,
  manualTexts,
  manualPositions = {},
  lockedPositions = {},
  onManualTextsChange,
  onManualPositionsChange,
  onAdd,
  onRemove,
}) {
  /* Adding a row appends it below the fold of the scrolling dialog body, so
     pressing "Add another" appeared to do nothing until the operator scrolled
     down. Bringing the new row into view is what makes the control acknowledge
     the press. Only a growth in the row count scrolls: removing a row, or
     opening the modal, must not move the dialog under the pointer. */
  const lastRowRef = useRef(null);
  const prevCountRef = useRef(manualKeys.length);

  useEffect(() => {
    const grew = manualKeys.length > prevCountRef.current;
    prevCountRef.current = manualKeys.length;
    if (!grew) return;

    /* `nearest` scrolls the dialog body only as far as needed, and leaves the
       page itself alone when the row is already visible. */
    lastRowRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [manualKeys.length]);

  return (
    <div>
      {/* Pinned inside the scrolling body, so the control that is pressed
          repeatedly stays reachable at any row count. The negative inline
          margins span the body's `px-6` padding, so rows cannot show through
          beside the bar while it is stuck. */}
      <div className="sticky top-0 z-10 -mx-6 px-6 py-2 bg-white flex items-center justify-between mb-1.5">
        <label className="block text-sm font-medium text-gray-700">
          Type a name
        </label>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add another
        </button>
      </div>

      {manualKeys.length === 0 ? (
        <p className="text-xs text-gray-400 border border-dashed border-gray-200 rounded-xl px-3.5 py-3">
          Add the person by name.
        </p>
      ) : (
        /* Three rows stay visible, the fourth onwards scroll here rather than
           growing the dialog. `24rem` is 3 rows at the current 126px plus the
           8px gaps and a little slack; a font or padding change moves the
           breakpoint off three, so it is stated in one place. `pr-1` keeps the
           rows clear of the scrollbar. */
        <div className="space-y-2 max-h-[24rem] overflow-y-auto pr-1">
          {manualKeys.map((key) => {
            /* A seat that came from the memorandum is fixed: the chart's
               structure is defined elsewhere, so renaming it here would quietly
               desynchronise the row from the memo it was seeded from. It stays
               visible and read-only, with the reason stated. */
            const locked = Boolean(lockedPositions[key]);
            const isLast = key === manualKeys[manualKeys.length - 1];
            return (
              <div
                key={key}
                ref={isLast ? lastRowRef : null}
                className="border border-gray-200 rounded-xl p-2.5 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={manualTexts[key] || ""}
                    onChange={(e) =>
                      onManualTextsChange((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    placeholder="e.g. Dela Cruz, Juan"
                    className="flex-1 border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => onRemove(key)}
                    title="Remove"
                    className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Position / seat
                  </label>
                  <input
                    type="text"
                    value={manualPositions[key] || ""}
                    onChange={(e) =>
                      onManualPositionsChange((prev) => ({
                        ...prev,
                        [key]: e.target.value,
                      }))
                    }
                    disabled={locked}
                    placeholder="e.g. Director, Research"
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
                  />
                  {locked && (
                    <p className="mt-1 text-[11px] text-gray-400">
                      Seat fixed by the GFPS memorandum.
                    </p>
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

export default function EditMemberModal({
  section,
  editingSection,
  selectedOfficials,
  manualTexts = {},
  manualPositions = {},
  lockedPositions = {},
  execRoles,
  error,
  submitting,
  onClose,
  onSectionChange,
  onSelectedChange,
  onManualTextsChange,
  onManualPositionsChange,
  onExecRolesChange,
  onSubmit,
}) {
  /* GFPS is maintained by hand: every member is a typed name or a typed seat,
     and nothing is drawn from the officials roster. Encoding a committee is
     independent of Organizational Structure, so the chart cannot change
     because a roster term was retired or a holder was replaced. */
  const manualKeys = selectedOfficials.filter(isManualKey);

  const addManualRow = () => {
    const key = nextManualKey();
    onSelectedChange((prev) => [...prev, key]);
    onManualTextsChange((prev) => ({ ...prev, [key]: "" }));
    onManualPositionsChange((prev) => ({ ...prev, [key]: "" }));
    onExecRolesChange((prev) => ({ ...prev, [key]: "member" }));
  };

  const removeManualRow = (key) => {
    onSelectedChange((prev) => prev.filter((k) => k !== key));
    onManualTextsChange((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    onManualPositionsChange((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    onExecRolesChange((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  /* A manual row must identify something: either the person's name, or the seat
     they occupy. It cannot be neither — that would be stored as a member that
     says nothing at all — but it may be either one alone, because the
     memorandum lists seats before they are filled and an ad-hoc member may hold
     no formal seat. */
  const canSubmit =
    selectedOfficials.length > 0 &&
    !submitting &&
    manualKeys.every(
      (key) =>
        String(manualTexts[key] || "").trim() ||
        String(manualPositions[key] || "").trim(),
    );

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50 p-4">
      {/* `100dvh` is the viewport minus mobile browser chrome, so `min()` keeps
          the 90vh cap on tall screens while stopping the top edge being clipped
          off-screen on short ones. The height stays bounded either way: the body
          scrolls rather than the dialog growing with its content. */}
      <form
        onSubmit={onSubmit}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[min(90vh,calc(100dvh-2rem))] flex flex-col"
      >
        <ModalHeader editingSection={editingSection} onClose={onClose} />

        {/* Modal Body */}
        <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
          <SectionSelect
            section={section}
            editingSection={editingSection}
            onChange={onSectionChange}
          />

          <ManualEntries
            manualKeys={manualKeys}
            manualTexts={manualTexts}
            manualPositions={manualPositions}
            lockedPositions={lockedPositions}
            onManualTextsChange={onManualTextsChange}
            onManualPositionsChange={onManualPositionsChange}
            onAdd={addManualRow}
            onRemove={removeManualRow}
          />

          {section === "executiveCommittee" && manualKeys.length > 0 && (
            <AssignRoles
              selectedOfficials={manualKeys}
              manualTexts={manualTexts}
              execRoles={execRoles}
              onExecRolesChange={onExecRolesChange}
            />
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
              {error}
            </p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
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
  );
}
