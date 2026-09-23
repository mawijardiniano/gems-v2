"use client";

/*
 * Shared form pieces for the project modals (create wizard + edit form).
 *
 * Keeping them here means both modals render fields and resolve dependent
 * select options exactly the same way.
 */

export const inputClass =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400";

/** Options for a select — resolved from the parent field when `optionsBy` is set. */
export const resolveOptions = (field, values) => {
  if (!field.optionsBy) return field.options || [];
  const parentValue = values[field.optionsBy.field];
  const mapped = field.optionsBy.map?.[parentValue];
  return Array.isArray(mapped) && mapped.length > 0
    ? mapped
    : field.options || [];
};

export const FieldRenderer = ({ field, value, onChange }) => (
  <div
    className={`space-y-1.5 ${
      field.colSpan === 2 || field.type === "textarea" || field.type === "list"
        ? "sm:col-span-2"
        : ""
    }`}
  >
    <label className="text-xs font-medium text-gray-600">
      {field.label}
      {field.required && <span className="text-rose-500"> *</span>}
    </label>

    {field.type === "select" ? (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      >
        <option value="">{field.placeholder || "Select…"}</option>
        {(field.options || []).map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    ) : field.type === "textarea" ? (
      <textarea
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        className={inputClass}
      />
    ) : (
      <input
        type={
          field.type === "number"
            ? "number"
            : field.type === "date"
              ? "date"
              : "text"
        }
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={
          field.type === "list"
            ? field.placeholder || "Separate entries with commas"
            : field.placeholder
        }
        className={inputClass}
      />
    )}

    {field.help && <p className="text-[11px] text-gray-400">{field.help}</p>}
  </div>
);
