"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  FaCheck,
  FaChevronDown,
  FaPlus,
  FaTimes,
} from "react-icons/fa";
import { addTypedOffice, normalizeOffice } from "@/data/lib/colleges";
import Button from "@/components/ui/Button";

/* Office multi-select for the event create and edit forms. These used to be
   two different components: the create page's version looked right, while
   the edit page's version matched offices through normalizeOffice. Without
   that, a value saved under the old "&" college spelling showed unticked and
   could not be removed. This one does both. (The GPB page has its own
   OfficeMultiSelect with a different layout.) */

const labelClass =
  "block text-sm font-medium text-gray-700 mb-2 gap-2 flex items-center";

export default function EventOfficeDropdown({
  label,
  icon: Icon,
  options,
  selected = [],
  onChange,
  required,
  description,
  /* Offices may also be typed by hand, like the GPB responsible-office
     picker, so the panel gets an "add an office" row under the option list. */
  allowCustom = false,
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const ref = useRef(null);
  const listId = useId();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isSelected = (option) =>
    selected.some((s) => normalizeOffice(s) === normalizeOffice(option));

  const toggleOption = (option) => {
    onChange(
      isSelected(option)
        ? selected.filter((v) => normalizeOffice(v) !== normalizeOffice(option))
        : [...selected, option],
    );
  };

  /* A hand-typed office/unit joins the selection as a chip and can be removed
     with the same × as the options picked from the list. */
  const addDraft = () => {
    onChange(addTypedOffice(selected, draft));
    setDraft("");
  };

  return (
    <div
      className="relative"
      ref={ref}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.stopPropagation();
          setOpen(false);
        }
      }}
    >
      <p className={labelClass}>
        {Icon && (
          <Icon
            className="inline h-4 w-4 mr-1.5 text-gray-500 -mt-0.5"
            aria-hidden="true"
          />
        )}
        {label} {required && <span className="text-danger">*</span>}
      </p>
      {description && (
        <p className="text-xs text-gray-500 mb-2">{description}</p>
      )}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`${label}: ${
          selected.length ? selected.join(", ") : "none selected"
        }`}
        className={`w-full flex items-center justify-between rounded-lg border px-3.5 py-2.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-secondary-500/20 focus:border-secondary-500 ${
          open
            ? "border-secondary-500 bg-secondary-50/50"
            : "border-gray-200 bg-gray-50/50 hover:border-gray-300"
        } ${selected.length === 0 ? "text-gray-500" : "text-gray-900"}`}
      >
        <span className="flex items-center gap-2 truncate pr-2">
          {selected.length === 0 ? "Select options..." : selected.join(", ")}
        </span>
        <FaChevronDown
          aria-hidden="true"
          className={`h-3.5 w-3.5 text-gray-500 shrink-0 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selected.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1 rounded-full bg-secondary-50 border border-secondary-100 px-2.5 py-0.5 text-xs font-medium text-secondary-700"
            >
              {item}
              <button
                type="button"
                onClick={() => toggleOption(item)}
                aria-label={`Remove ${item}`}
                className="touch-target hover:text-secondary-900 transition-colors"
              >
                <FaTimes className="h-2.5 w-2.5" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}

      {open && (
        <div className="absolute z-20 mt-2 w-full rounded-xl border border-gray-100 bg-white shadow-lg shadow-gray-200/50 overflow-hidden">
          <div
            id={listId}
            role="listbox"
            aria-multiselectable="true"
            aria-label={label}
            className="max-h-60 overflow-auto py-1"
          >
            {options.map((option) => {
              const checked = isSelected(option);
              return (
                <button
                  type="button"
                  role="option"
                  aria-selected={checked}
                  key={option}
                  onClick={() => toggleOption(option)}
                  className="w-full flex items-center justify-between px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors"
                >
                  <span className="pr-2 text-left">{option}</span>
                  {checked && (
                    <FaCheck
                      className="h-3.5 w-3.5 text-secondary-600 shrink-0"
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </div>

          {allowCustom && (
            <div className="flex items-center gap-2 border-t border-gray-100 bg-gray-50/60 p-2">
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
                aria-label={`Add an office to ${label}`}
                className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition-all focus:outline-none focus:ring-2 focus:ring-secondary-500/20 focus:border-secondary-500"
              />
              <Button
                variant="primary"
                className="shrink-0"
                type="button"
                onClick={addDraft}
                disabled={!draft.trim()}
              >
                <FaPlus className="h-3 w-3" aria-hidden="true" /> Add
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
