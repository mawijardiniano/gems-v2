"use client";

import { useEffect, useRef, useState } from "react";
import {
  FilterButton,
  FilterChecklist,
  FilterChips,
  FlagSelect,
} from "./FieldFilterControls";

/* Popover checkbox list for the Gender Profile Report fields, each with an
   optional filter (flag select or value checklist). Fields the chosen
   population cannot supply stay visible but disabled. */
export default function FieldMultiSelect({
  fields,
  value,
  onChange,
  filterOptions = {},
  filters = {},
  flagFields = [],
  onFiltersChange = () => {},
}) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState("");
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
        setExpanded("");
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const available = fields.filter((f) => f.available);
  const selected = available.filter((f) => value.includes(f.value));
  const chips = Object.entries(filters).filter(([, v]) => v?.length);
  const labelOf = (key) => fields.find((f) => f.value === key)?.label || key;

  const toggle = (field) =>
    onChange(
      value.includes(field.value)
        ? value.filter((v) => v !== field.value)
        : [...value, field.value],
    );

  const setFilter = (key, values) => {
    const next = { ...filters };
    if (values.length) next[key] = values;
    else delete next[key];
    onFiltersChange(next);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
      >
        <span className="truncate text-left">
          {selected.length
            ? selected.map((f) => f.label).join(", ")
            : "Select fields"}
        </span>
        <span className="shrink-0 text-[10px] text-gray-400">
          {selected.length} of {available.length} ▾
        </span>
      </button>

      <FilterChips
        chips={chips}
        labelOf={labelOf}
        flagFields={flagFields}
        onClear={(key) => setFilter(key, [])}
      />

      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white p-2 shadow-lg max-h-96 overflow-y-auto">
          {fields.map((field) => {
            const options = field.available ? filterOptions[field.value] : null;
            const isFlag = flagFields.includes(field.value);
            const isExpanded = expanded === field.value;
            return (
              <div key={field.value}>
                <div
                  className={`flex items-center gap-2 rounded px-2 py-1 text-xs ${
                    field.available
                      ? "text-gray-700 hover:bg-violet-50"
                      : "text-gray-300"
                  }`}
                >
                  <label
                    className={`flex flex-1 items-center gap-2 min-w-0 ${
                      field.available ? "cursor-pointer" : "cursor-not-allowed"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={field.available && value.includes(field.value)}
                      disabled={!field.available}
                      onChange={() => toggle(field)}
                      className="accent-violet-600"
                    />
                    <span className="truncate">{field.label}</span>
                    {field.note && (
                      <span className="text-[10px] text-gray-300">
                        {field.note}
                      </span>
                    )}
                    {field.available && field.listOnly && (
                      <span className="text-[10px] text-gray-400">
                        list only
                      </span>
                    )}
                  </label>
                  {options && isFlag && (
                    <FlagSelect
                      selected={filters[field.value]}
                      onChange={(v) => setFilter(field.value, v)}
                    />
                  )}
                  {options && !isFlag && (
                    <FilterButton
                      active={Boolean(filters[field.value]?.length)}
                      onClick={() => setExpanded(isExpanded ? "" : field.value)}
                    />
                  )}
                </div>
                {options && !isFlag && isExpanded && (
                  <FilterChecklist
                    options={options}
                    selected={filters[field.value]}
                    onChange={(v) => setFilter(field.value, v)}
                    onDone={() => setExpanded("")}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
