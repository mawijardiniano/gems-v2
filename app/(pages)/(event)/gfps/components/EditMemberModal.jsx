"use client";

import { useEffect, useId, useRef } from "react";
import { SECTIONS } from "../gfps-config";
import { isManualKey, nextManualKey } from "../officials";
import { useDialog } from "@/hooks/useDialog";
import Button from "@/components/ui/Button";
import {
  normalizeOfficialSex,
  OFFICIAL_SEX_LABELS,
  OFFICIAL_SEX_VALUES,
} from "@/data/lib/universityOfficialsMerge";
import PersonSearchField from "../../components/PersonSearchField";

function ModalHeader({ editingSection, onClose, titleId }) {
  return (
    <div className="px-6 py-5 border-b border-line-subtle">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-secondary-50 text-secondary-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={editingSection ? "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" : "M12 4v16m8-8H4"} />
            </svg>
          </div>
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-fg">
              {editingSection ? "Edit Section" : "Add Member"}
            </h2>
            <p className="text-sm text-fg-muted">
              {editingSection
                ? `Update members in ${SECTIONS.find((s) => s.key === editingSection)?.label}`
                : "Add members to a GFPS section"}
            </p>
          </div>
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="touch-target p-1.5 rounded-lg hover:bg-muted text-fg-muted hover:text-fg-4 transition-colors"
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
      <label className="block text-sm font-medium text-fg-3 mb-1.5">
        Section
      </label>
      <select
        name="section"
        value={section}
        onChange={(e) => {
          if (!editingSection) onChange(e.target.value);
        }}
        disabled={!!editingSection}
        className="w-full border border-line-strong rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 outline-none transition disabled:bg-subtle disabled:text-fg-disabled disabled:cursor-not-allowed"
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
      <label className="block text-sm font-medium text-fg-3 mb-2">
        Assign Roles
      </label>
      {/* No inner `max-h`/`overflow-y-auto`: the dialog body already scrolls, and
          a second scrollbar inside it meant the wheel over this list could not
          reach the name rows above. The list now grows with the body instead. */}
      <div className="border border-line rounded-xl overflow-hidden divide-y divide-line-subtle">
        {selectedOfficials.map((key) => {
          /* Every row is a typed name: there is no roster entry to look up, so
             what the operator entered is what they see beside the selector. */
          const label = manualTexts[key] || "Unnamed member";
          const subLabel = "Typed manually";

          return (
            <div
              key={key}
              className="flex items-center justify-between px-4 py-3 hover:bg-subtle transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-fg truncate">
                  {label}
                  {subLabel && (
                    <span className="text-fg-muted font-normal">
                      {" "}
                      — {subLabel}
                    </span>
                  )}
                </p>
                <p className="text-xs text-fg-muted">
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
                className="ml-3 border border-line-strong rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 outline-none"
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
  manualSexes = {},
  lockedPositions = {},
  onManualTextsChange,
  onManualPositionsChange,
  onManualSexesChange,
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
        <label className="block text-sm font-medium text-fg-3">
          Search or type a name
        </label>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1 text-xs font-medium text-secondary-600 hover:text-secondary-700"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add another
        </button>
      </div>

      {manualKeys.length === 0 ? (
        <p className="text-xs text-fg-muted border border-dashed border-line rounded-xl px-3.5 py-3">
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
                className="border border-line rounded-xl p-2.5 space-y-2"
              >
                <div className="flex items-center gap-2">
                  {/* Search fills in the name and sex from an employee
                      profile; the row still stores plain text only — no link
                      is kept, so a GFPS member never depends on a profile. */}
                  <div className="flex-1 min-w-0">
                    <PersonSearchField
                      value={manualTexts[key] || ""}
                      onChange={(name) =>
                        onManualTextsChange((prev) => ({ ...prev, [key]: name }))
                      }
                      onPick={(person) =>
                        onManualSexesChange((prev) => ({
                          ...prev,
                          [key]: normalizeOfficialSex(person?.sex),
                        }))
                      }
                      placeholder="Search an employee, or type a name"
                      inputClassName="w-full border border-line-strong rounded-xl pl-9 pr-3.5 py-2.5 text-sm focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 outline-none transition"
                      inline
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(key)}
                    title="Remove"
                    className="touch-target p-2 rounded-lg text-fg-muted hover:text-danger hover:bg-danger-subtle transition-colors"
                  >
                    <svg className="w-4 h-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div>
                  <label className="block text-xs font-medium text-fg-muted mb-1">
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
                    className="w-full border border-line-strong rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 outline-none transition disabled:bg-subtle disabled:text-fg-muted disabled:cursor-not-allowed"
                  />
                  {locked && (
                    <p className="mt-1 text-xs text-fg-muted">
                      Seat fixed by the GFPS memorandum.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-fg-muted mb-1">
                    Sex
                  </label>
                  <select
                    value={manualSexes[key] || "unspecified"}
                    onChange={(e) =>
                      onManualSexesChange((prev) => ({
                        ...prev,
                        [key]: e.target.value,
                      }))
                    }
                    className="w-full border border-line-strong rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 outline-none transition bg-white"
                  >
                    {OFFICIAL_SEX_VALUES.map((value) => (
                      <option key={value} value={value}>
                        {OFFICIAL_SEX_LABELS[value]}
                      </option>
                    ))}
                  </select>
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
  manualSexes = {},
  lockedPositions = {},
  execRoles,
  error,
  submitting,
  onClose,
  onSectionChange,
  onSelectedChange,
  onManualTextsChange,
  onManualPositionsChange,
  onManualSexesChange = () => {},
  onExecRolesChange,
  onSubmit,
}) {
  /* GFPS is maintained by hand: every member is a typed name or a typed seat,
     and nothing is drawn from the officials roster. Encoding a committee is
     independent of Organizational Structure, so the chart cannot change
     because a roster term was retired or a holder was replaced. */
  const manualKeys = selectedOfficials.filter(isManualKey);
  const titleId = useId();
  const dialogRef = useDialog(onClose);

  const addManualRow = () => {
    const key = nextManualKey();
    onSelectedChange((prev) => [...prev, key]);
    onManualTextsChange((prev) => ({ ...prev, [key]: "" }));
    onManualPositionsChange((prev) => ({ ...prev, [key]: "" }));
    onManualSexesChange((prev) => ({ ...prev, [key]: "unspecified" }));
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
    onManualSexesChange((prev) => {
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
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onSubmit={onSubmit}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[min(90vh,calc(100dvh-2rem))] flex flex-col"
      >
        <ModalHeader editingSection={editingSection} onClose={onClose} titleId={titleId} />

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
            manualSexes={manualSexes}
            lockedPositions={lockedPositions}
            onManualTextsChange={onManualTextsChange}
            onManualPositionsChange={onManualPositionsChange}
            onManualSexesChange={onManualSexesChange}
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
            <p className="text-sm text-danger bg-danger-subtle border border-danger-border rounded-xl px-3.5 py-2.5">
              {error}
            </p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-line-subtle bg-subtle flex justify-end gap-3 shrink-0">
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
            disabled={!canSubmit}
          >
            {submitting && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            {submitting ? "Saving..." : editingSection ? "Save Changes" : "Add Members"}
          </Button>
        </div>
      </form>
    </div>
  );
}
