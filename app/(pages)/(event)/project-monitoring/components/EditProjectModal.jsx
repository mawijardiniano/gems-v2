"use client";

import { useMemo, useState } from "react";
import { FaExclamationTriangle, FaSpinner, FaTimes } from "react-icons/fa";
import { FieldRenderer, resolveOptions } from "./ProjectFormFields";

/*
 * Single-form "Edit Project" modal shared by the Research & Extension and
 * Academic workspaces.
 *
 * Editable fields are the module's create fields minus `year` (reference
 * numbers are year-scoped, so the year never changes), plus the project status.
 * Fields keep their `step` numbers from the config but are rendered as labelled
 * sections on one form — no wizard.
 */

const getFieldValue = (field) => {
  if (field === null || field === undefined) return "";
  if (typeof field === "object" && !Array.isArray(field) && "value" in field) {
    return field.value ?? "";
  }
  return field;
};

const toDateInputValue = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

const isEmptyValue = (value) =>
  value === null || value === undefined || String(value).trim() === "";

/** Create fields (year excluded) + the status selector. */
const buildEditFields = (config) => {
  const base = (config.createFields || []).filter(
    (field) => field.key !== "year",
  );

  const lastStep = base.reduce(
    (max, field) =>
      Math.max(max, Number(field.step) > 0 ? Number(field.step) : 1),
    1,
  );

  return [
    ...base,
    {
      key: "project_status",
      label: "Status",
      type: "select",
      options:
        config.statuses || ["for-review", "ongoing", "completed"],
      step: lastStep,
    },
  ];
};

/** Seeds the form from the saved project, unwrapping `{ value }` fields. */
const buildProjectValues = (fields, project) =>
  fields.reduce((acc, field) => {
    let raw =
      field.key === "project_status"
        ? project?.project_status || "for-review"
        : getFieldValue(project?.[field.key]);

    if (field.type === "list") {
      raw = Array.isArray(raw) ? raw.join(", ") : (raw ?? "");
    } else if (field.type === "date") {
      raw = toDateInputValue(raw);
    } else if (raw === null || raw === undefined) {
      raw = "";
    } else {
      raw = String(raw);
    }

    acc[field.key] = raw;
    return acc;
  }, {});

export default function EditProjectModal({
  config,
  project,
  apiBase,
  userId,
  onClose,
  onSaved,
}) {
  const fields = useMemo(() => buildEditFields(config), [config]);
  const [values, setValues] = useState(() =>
    buildProjectValues(buildEditFields(config), project),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const sections = useMemo(() => {
    const groups = new Map();

    for (const field of fields) {
      const step = Number(field.step) > 0 ? Number(field.step) : 1;
      if (!groups.has(step)) groups.set(step, []);
      groups.get(step).push(field);
    }

    const titles = Array.isArray(config.createStepTitles)
      ? config.createStepTitles
      : [];

    return [...groups.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([step, stepFields]) => ({
        step,
        title: titles[step - 1] || `Section ${step}`,
        fields: stepFields,
      }));
  }, [fields, config.createStepTitles]);

  const setValue = (key, value) => {
    setValues((prev) => {
      const next = { ...prev, [key]: value };

      /* Dependent selects follow the same rule as the create wizard. */
      for (const field of fields) {
        if (!field.optionsBy || field.optionsBy.field !== key) continue;
        const allowed = field.optionsBy.map?.[value] || field.options || [];
        if (next[field.key] && !allowed.includes(next[field.key])) {
          next[field.key] = "";
        }
      }

      return next;
    });
    setError("");
  };

  const handleSave = async (e) => {
    e.preventDefault();

    const missing = fields.find(
      (field) => field.required && isEmptyValue(values[field.key]),
    );
    if (missing) {
      setError(`${missing.label} is required.`);
      return;
    }

    const payload = { userId };

    for (const field of fields) {
      const raw = values[field.key];

      if (field.key === "project_status") {
        payload.project_status = raw;
        continue;
      }

      if (field.type === "list") {
        payload[field.key] = String(raw ?? "")
          .split(/[,\n]/)
          .map((item) => item.trim())
          .filter(Boolean);
        continue;
      }

      if (field.type === "number") {
        payload[field.key] = raw === "" ? null : Number(raw);
        continue;
      }

      if (field.type === "date") {
        payload[field.key] = raw || null;
        continue;
      }

      payload[field.key] = raw ?? "";
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch(`${apiBase}/${project._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to save changes");
      }

      onSaved(data.data);
    } catch (err) {
      setError(err.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-xl">
        <div className="shrink-0 px-6 py-4 flex items-center justify-between border-b border-gray-100 rounded-t-2xl">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-gray-900">Edit Project</h3>
            <p className="text-[11px] text-gray-400 mt-0.5 truncate">
              {project?.reference_number ? `${project.reference_number} · ` : ""}
              {getFieldValue(project?.title) || "(untitled project)"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <FaTimes size={14} />
          </button>
        </div>

        <form onSubmit={handleSave} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                <FaExclamationTriangle size={14} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            {sections.map((section) => (
              <div key={section.step}>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 pb-2 border-b border-gray-100 mb-3">
                  {section.title}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {section.fields.map((field) => (
                    <FieldRenderer
                      key={field.key}
                      field={{
                        ...field,
                        options: resolveOptions(field, values),
                      }}
                      value={values[field.key]}
                      onChange={(value) => setValue(field.key, value)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </form>

        <div className="shrink-0 border-t border-gray-100 px-6 py-4 flex items-center justify-end gap-3 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-5 py-2 text-sm font-medium text-white hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving && <FaSpinner className="animate-spin" size={12} />}
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
