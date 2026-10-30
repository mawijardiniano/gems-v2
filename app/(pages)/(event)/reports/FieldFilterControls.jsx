"use client";

import { useState } from "react";

/* Filter controls used inside the Gender Profile Report field picker. */

export function FlagSelect({ selected, onChange }) {
  return (
    <select
      value={selected?.[0] || ""}
      onChange={(e) => onChange(e.target.value ? [e.target.value] : [])}
      className="rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600"
    >
      <option value="">All</option>
      <option value="Yes">Yes</option>
      <option value="No">No</option>
    </select>
  );
}

export function FilterButton({ active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded border px-2.5 py-1 text-xs ${
        active
          ? "border-secondary-300 bg-secondary-50 text-secondary-700"
          : "border-gray-200 text-gray-500 hover:bg-gray-50"
      }`}
    >
      Filter…
    </button>
  );
}

/* Long lists (College / Office, Program, Department run to ~60 entries) are
   unusable as a flat checklist, so above that size the box gets a search
   filter. Checked options always stay visible, so a selection can never
   silently disappear behind the search text. */
export const SEARCHABLE_AFTER = 12;

export function FilterChecklist({ options, selected = [], onChange, onDone }) {
  const [query, setQuery] = useState("");
  const searchable = options.length > SEARCHABLE_AFTER;
  const needle = query.trim().toLowerCase();

  const visible = needle
    ? options.filter(
        (option) =>
          selected.includes(option.value) ||
          option.value.toLowerCase().includes(needle),
      )
    : options;

  const toggle = (option) =>
    onChange(
      selected.includes(option)
        ? selected.filter((v) => v !== option)
        : [...selected, option],
    );
  return (
    <div className="ml-7 mb-1 rounded border border-gray-100 bg-gray-50 p-2">
      <p className="text-[11px] text-gray-500 mb-1">Include only:</p>
      {searchable && (
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${options.length} options…`}
          aria-label="Search options"
          className="mb-1 w-full rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 focus:border-secondary-500 focus:outline-none"
        />
      )}
      <div className="max-h-56 overflow-y-auto">
        {visible.map((option) => (
          <label
            key={option.value}
            className="flex items-center gap-2 py-1 text-xs text-gray-700 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selected.includes(option.value)}
              onChange={() => toggle(option.value)}
              className="accent-secondary-600"
            />
            <span className="truncate">{option.value}</span>
            <span className="ml-auto text-[11px] text-gray-500">
              ({option.count.toLocaleString("en-US")})
            </span>
          </label>
        ))}
        {!visible.length && (
          <p className="py-1 text-xs italic text-gray-500">No matches.</p>
        )}
      </div>
      <div className="mt-1 flex gap-3 text-xs">
        <button
          type="button"
          onClick={() => onChange([])}
          className="text-gray-500 hover:underline"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={onDone}
          className="text-secondary-600 hover:underline"
        >
          Done
        </button>
      </div>
    </div>
  );
}

export function FilterChips({ chips, labelOf, flagFields, onClear }) {
  if (!chips.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {chips.map(([key, values]) => (
        <button
          key={key}
          type="button"
          onClick={() => onClear(key)}
          title="Clear this filter"
          className="rounded-full bg-secondary-50 border border-secondary-200 px-2.5 py-1 text-xs text-secondary-700 hover:bg-secondary-100"
        >
          {labelOf(key)}
          {flagFields.includes(key) ? " = " : ": "}
          {values.join(", ")} ×
        </button>
      ))}
    </div>
  );
}
