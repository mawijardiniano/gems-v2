"use client";

import { useState, useEffect, useRef } from "react";
import { addTypedOffice, normalizeOffice } from "@/lib/colleges";

export default function CheckboxDropdown({
  label,
  options,
  selected,
  onChange,
  required,
  /* Offices may also be typed by hand, the same way the GPB responsible-office
     picker and the create-event form allow it. */
  allowCustom = false,
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const ref = useRef();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* Offices are compared through normalizeOffice so a value saved before the
     colleges were renamed (the "&" spelling) counts as its canonical option:
     it shows ticked and can be unticked instead of lingering on the record as
     an entry the list cannot reach. */
  const isSelected = (option) =>
    selected.some((s) => normalizeOffice(s) === normalizeOffice(option));

  const toggleOption = (option) => {
    if (isSelected(option)) {
      onChange(
        selected.filter((v) => normalizeOffice(v) !== normalizeOffice(option)),
      );
    } else {
      onChange([...selected, option]);
    }
  };

  /* A hand-typed office/unit joins the selection and can be unticked (or
     removed from the list) like any other row. */
  const addDraft = () => {
    onChange(addTypedOffice(selected, draft));
    setDraft("");
  };

  return (
    <div className="relative" ref={ref}>
      <label className="block text-sm font-medium mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <button
        type="button"
        className="w-full border border-gray-300 rounded px-3 py-2 text-left bg-white"
        onClick={() => setOpen((prev) => !prev)}
      >
        {selected.length === 0 ? "Select..." : selected.join(", ")}
        <span className="float-right">▼</span>
      </button>
      {open && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded shadow overflow-hidden">
          <div className="max-h-60 overflow-auto">
            {options.map((option) => (
              <label
                key={option}
                className="flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={isSelected(option)}
                  onChange={() => toggleOption(option)}
                  className="mr-2"
                />
                {option}
              </label>
            ))}
          </div>

          {allowCustom && (
            <div className="flex items-center gap-2 border-t border-gray-200 bg-gray-50 p-2">
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
                className="min-w-0 flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-gray-400"
              />
              <button
                type="button"
                onClick={addDraft}
                disabled={!draft.trim()}
                className="shrink-0 rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                + Add
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}