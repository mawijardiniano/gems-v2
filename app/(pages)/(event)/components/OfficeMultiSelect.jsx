"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FaChevronDown, FaPlus, FaTimes } from "react-icons/fa";
import {
  addTypedOffice,
  normalizeOffice,
  officeOptionList,
  toOfficeArray,
} from "@/data/lib/colleges";
import Button from "@/components/ui/Button";

function useOutsideClose(onClose) {
  const ref = useRef(null);
  useEffect(() => {
    const handle = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [onClose]);
  return ref;
}

export default function OfficeMultiSelect({
  value,
  onChange,
  variant = "panel",
  disabled = false,
}) {
  const selected = toOfficeArray(value);
  const options = useMemo(() => officeOptionList(selected), [value]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const boxRef = useOutsideClose(() => setOpen(false));

  const isChecked = (office) =>
    selected.some((s) => normalizeOffice(s) === normalizeOffice(office));

  const toggle = (office) => {
    const next = isChecked(office)
      ? selected.filter((s) => normalizeOffice(s) !== normalizeOffice(office))
      : [...selected, office];
    onChange(next);
  };

  const remove = (office) => {
    onChange(
      selected.filter((s) => normalizeOffice(s) !== normalizeOffice(office)),
    );
  };

  /* Free-typed office: trimmed, skipped when it duplicates an existing
     selection (compared through normalizeOffice), then kept as a chip. */
  const addDraft = () => {
    onChange(addTypedOffice(selected, draft));
    setDraft("");
  };

  const Chip = ({ office, small }) => (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-secondary-50 border border-secondary-200 text-secondary-700 ${
        small ? "px-1.5 py-0.5 text-xs" : "px-2 py-0.5 text-xs"
      }`}
    >
      <span
        className={small ? "max-w-[9rem] truncate" : "max-w-[16rem] truncate"}
      >
        {office}
      </span>
      {!disabled && (
        <button
          type="button"
          onClick={() => remove(office)}
          aria-label={`Remove ${office}`}
          className="touch-target text-secondary-400 hover:text-secondary-700"
        >
          <FaTimes
            className={small ? "h-2 w-2" : "h-2.5 w-2.5"}
            aria-hidden="true"
          />
        </button>
      )}
    </span>
  );

  if (variant === "popover") {
    return (
      <div className="relative" ref={boxRef}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((prev) => !prev)}
          className="flex w-48 items-center justify-between gap-2 border rounded px-2 py-1 text-xs text-left text-fg-3 bg-white hover:bg-subtle disabled:opacity-50"
        >
          <span className="truncate">
            {selected.length === 0
              ? "Select office(s)"
              : selected.length === 1
                ? selected[0]
                : `${selected.length} offices selected`}
          </span>
          <FaChevronDown className="h-2.5 w-2.5 shrink-0 text-fg-muted" />
        </button>

        {open && (
          <div className="absolute z-30 mt-1 w-64 max-h-56 overflow-y-auto rounded-lg border border-line bg-white shadow-lg p-2">
            {options.map((office) => (
              <label
                key={office}
                className="flex items-start gap-2 rounded px-1.5 py-1 text-xs text-fg-3 hover:bg-subtle cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={isChecked(office)}
                  onChange={() => toggle(office)}
                  disabled={disabled}
                  className="mt-0.5 accent-secondary-600"
                />
                <span>{office}</span>
              </label>
            ))}

            {!disabled && (
              <div className="mt-2 flex items-center gap-1 border-t border-line-subtle pt-2">
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addDraft();
                    }
                  }}
                  placeholder="Type an office not listed..."
                  className="min-w-0 flex-1 rounded border border-line px-2 py-1 text-xs focus:outline-none focus:border-secondary-400"
                />
                <Button
                  variant="primary"
                  onClick={addDraft}
                  disabled={!draft.trim()}
                  className="shrink-0 gap-1 rounded px-2 py-1 text-xs"
                >
                  <FaPlus className="h-2.5 w-2.5" /> Add
                </Button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-1 w-full rounded bg-muted px-2 py-1 text-xs text-fg-4 hover:bg-emphasis"
            >
              Done
            </button>
          </div>
        )}

        {selected.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {selected.map((office) => (
              <Chip key={office} office={office} small />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div
        className={`border border-line-strong rounded-xl p-3 max-h-44 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 ${
          disabled ? "bg-subtle" : "bg-white"
        }`}
      >
        {options.map((office) => (
          <label
            key={office}
            className="flex items-start gap-2 text-sm text-fg-3 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={isChecked(office)}
              onChange={() => toggle(office)}
              disabled={disabled}
              className="mt-0.5 accent-secondary-600"
            />
            <span>{office}</span>
          </label>
        ))}
      </div>

      {!disabled && (
        <div className="mt-2 flex items-center gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addDraft();
              }
            }}
            placeholder="Type an office not listed..."
            className="min-w-0 flex-1 rounded-lg border border-line-strong px-3 py-1.5 text-sm focus:outline-none focus:border-secondary-400"
          />
          <Button
            variant="primary"
            onClick={addDraft}
            disabled={!draft.trim()}
            className="shrink-0 gap-1.5 rounded-lg px-3 py-1.5 text-xs"
          >
            <FaPlus className="h-3 w-3" /> Add
          </Button>
        </div>
      )}

      <div className="mt-2">
        {selected.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {selected.map((office) => (
              <Chip key={office} office={office} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-fg-muted italic">No office selected yet</p>
        )}
        {selected.length > 0 && !disabled && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="mt-1 text-xs text-fg-muted underline hover:text-fg-3"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}
