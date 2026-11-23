"use client";

/*
 * Shared form pieces for the project modals (create wizard + edit form).
 *
 * Keeping them here means both modals render fields and resolve dependent
 * select options exactly the same way.
 */

export const inputClass =
  "w-full rounded-lg border border-line px-3 py-2 text-sm text-fg-2 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400";

/* List fields (objectives, outputs, …) are edited one entry per line. They
   used to be joined with ", " and split on commas, so an entry such as
   "Train faculty, staff, and students" became three entries on the next save
   — even when nobody touched the field. */
export const listToText = (value) =>
  Array.isArray(value) ? value.join("\n") : String(value ?? "");

export const textToList = (text) =>
  String(text ?? "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);

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
    <label
      className="text-xs font-medium text-fg-4"
      htmlFor={`project-field-${field.key}`}
    >
      {field.label}
      {field.required && <span className="text-rose-500"> *</span>}
    </label>

    {field.type === "select" ? (
      <select
        id={`project-field-${field.key}`}
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
    ) : field.type === "textarea" || field.type === "list" ? (
      <textarea
        id={`project-field-${field.key}`}
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={
          field.type === "list"
            ? field.placeholder || "One entry per line"
            : field.placeholder
        }
        className={inputClass}
      />
    ) : (
      <input
        id={`project-field-${field.key}`}
        type={
          field.type === "number"
            ? "number"
            : field.type === "date"
              ? "date"
              : "text"
        }
        min={field.type === "number" ? "0" : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        className={inputClass}
      />
    )}

    {field.help && <p className="text-xs text-fg-muted">{field.help}</p>}
  </div>
);
