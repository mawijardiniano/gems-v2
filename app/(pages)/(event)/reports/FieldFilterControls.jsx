"use client";

/* Filter controls used inside the Gender Profile Report field picker. */

export function FlagSelect({ selected, onChange }) {
  return (
    <select
      value={selected?.[0] || ""}
      onChange={(e) => onChange(e.target.value ? [e.target.value] : [])}
      className="rounded border border-gray-200 bg-white px-1 py-0.5 text-[11px] text-gray-600"
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
      className={`rounded border px-1.5 py-0.5 text-[10px] ${
        active
          ? "border-violet-300 bg-violet-50 text-violet-700"
          : "border-gray-200 text-gray-500 hover:bg-gray-50"
      }`}
    >
      Filter…
    </button>
  );
}

export function FilterChecklist({ options, selected = [], onChange, onDone }) {
  const toggle = (option) =>
    onChange(
      selected.includes(option)
        ? selected.filter((v) => v !== option)
        : [...selected, option],
    );
  return (
    <div className="ml-7 mb-1 rounded border border-gray-100 bg-gray-50 p-2">
      <p className="text-[10px] text-gray-400 mb-1">Include only:</p>
      {options.map((option) => (
        <label
          key={option.value}
          className="flex items-center gap-2 py-0.5 text-[11px] text-gray-700 cursor-pointer"
        >
          <input
            type="checkbox"
            checked={selected.includes(option.value)}
            onChange={() => toggle(option.value)}
            className="accent-violet-600"
          />
          <span className="truncate">{option.value}</span>
          <span className="ml-auto text-[10px] text-gray-400">
            ({option.count.toLocaleString("en-US")})
          </span>
        </label>
      ))}
      <div className="mt-1 flex gap-3 text-[10px]">
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
          className="text-violet-600 hover:underline"
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
          className="rounded-full bg-violet-50 border border-violet-200 px-2 py-0.5 text-[10px] text-violet-700 hover:bg-violet-100"
        >
          {labelOf(key)}
          {flagFields.includes(key) ? " = " : ": "}
          {values.join(", ")} ×
        </button>
      ))}
    </div>
  );
}
