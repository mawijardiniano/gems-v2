"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FaChevronDown, FaPlus, FaTimes } from "react-icons/fa";
import {
  normalizeOffice,
  officeOptionList,
  toOfficeArray,
} from "@/lib/colleges";

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
  const options = useMemo(
    () => officeOptionList(selected),
    [value],
  );
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
    const office = draft.trim();
    if (!office) return;
    if (!isChecked(office)) {
      onChange([...selected, office]);
    }
    setDraft("");
  };

  const Chip = ({ office, small }) => (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 ${
        small ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs"
      }`}
    >
      <span className={small ? "max-w-[9rem] truncate" : "max-w-[16rem] truncate"}>
        {office}
      </span>
      {!disabled && (
        <button
          type="button"
          onClick={() => remove(office)}
          aria-label={`Remove ${office}`}
          className="text-rose-400 hover:text-rose-700"
        >
          <FaTimes className={small ? "h-2 w-2" : "h-2.5 w-2.5"} />
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
          className="flex w-48 items-center justify-between gap-2 border rounded px-2 py-1 text-xs text-left text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
        >
          <span className="truncate">
            {selected.length === 0
              ? "Select office(s)"
              : selected.length === 1
                ? selected[0]
                : `${selected.length} offices selected`}
          </span>
          <FaChevronDown className="h-2.5 w-2.5 shrink-0 text-gray-400" />
        </button>

        {open && (
          <div className="absolute z-30 mt-1 w-64 max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg p-2">
            {options.map((office) => (
              <label
                key={office}
                className="flex items-start gap-2 rounded px-1.5 py-1 text-xs text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={isChecked(office)}
                  onChange={() => toggle(office)}
                  disabled={disabled}
                  className="mt-0.5 accent-rose-600"
                />
                <span>{office}</span>
              </label>
            ))}

            {!disabled && (
              <div className="mt-2 flex items-center gap-1 border-t border-gray-100 pt-2">
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
                  className="min-w-0 flex-1 rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:border-rose-400"
                />
                <button
                  type="button"
                  onClick={addDraft}
                  disabled={!draft.trim()}
                  className="flex shrink-0 items-center gap-1 rounded border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                >
                  <FaPlus className="h-2.5 w-2.5" /> Add
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-1 w-full rounded bg-gray-100 px-2 py-1 text-xs text-gray-600 hover:bg-gray-200"
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
        className={`border border-gray-300 rounded-xl p-3 max-h-44 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 ${
          disabled ? "bg-gray-50" : "bg-white"
        }`}
      >
        {options.map((office) => (
          <label
            key={office}
            className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={isChecked(office)}
              onChange={() => toggle(office)}
              disabled={disabled}
              className="mt-0.5 accent-rose-600"
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
            className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-rose-400"
          />
          <button
            type="button"
            onClick={addDraft}
            disabled={!draft.trim()}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-50"
          >
            <FaPlus className="h-3 w-3" /> Add
          </button>
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
          <p className="text-xs text-gray-400 italic">
            No office selected yet
          </p>
        )}
        {selected.length > 0 && !disabled && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="mt-1 text-xs text-gray-500 underline hover:text-gray-700"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}
