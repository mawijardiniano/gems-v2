"use client";

import { useMemo, useState } from "react";
import { useDialog } from "@/hooks/useDialog";
import Button from "@/components/ui/Button";
import {
  FaCheck,
  FaChevronLeft,
  FaChevronRight,
  FaExclamationTriangle,
  FaPen,
  FaSpinner,
  FaTimes,
} from "react-icons/fa";
import {
  FieldRenderer,
  listToText,
  resolveOptions,
  textToList,
} from "./ProjectFormFields";

/*
 * Multi-step "New Project" wizard for the office-managed project modules.
 *
 * Field definitions come from the workspace config so the Research & Extension
 * and Academic pages share one implementation:
 *
 *   { key, label, type: "text" | "textarea" | "number" | "select" | "list" | "date",
 *     options?, optionsBy?: { field, map }, placeholder?, required?, help?,
 *     colSpan?, defaultValue?, step: 1 | 2 | 3 }
 *
 * Fields are grouped into steps by their `step` number; a final read-only
 * "Review" step is generated automatically from every field. Step titles come
 * from `config.createStepTitles` (falling back to "Step N").
 */

const getStepOf = (field) =>
  Number(field.step) > 0 ? Number(field.step) : 1;

/** Groups the flat field list into ordered steps. */
const groupFieldsByStep = (fields) => {
  const map = new Map();

  for (const field of fields) {
    const step = getStepOf(field);
    if (!map.has(step)) map.set(step, []);
    map.get(step).push(field);
  }

  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([step, stepFields]) => ({ step, fields: stepFields }));
};

const buildInitialValues = (fields) =>
  fields.reduce((acc, field) => {
    acc[field.key] = field.defaultValue ?? "";
    return acc;
  }, {});

const isEmptyValue = (value) =>
  value === null || value === undefined || String(value).trim() === "";

/** Readable value for the Review step. */
const formatFieldValue = (field, value) => {
  if (field.type === "list") {
    const list = String(value ?? "")
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
    return list.length > 0 ? list.join(", ") : "—";
  }

  if (isEmptyValue(value)) return "—";

  if (field.type === "number") {
    const number = Number(value);
    return Number.isFinite(number) ? number.toLocaleString() : String(value);
  }

  return String(value);
};

/* Numbered stepper — desktop shows the full trail, mobile a compact summary. */
const StepperHeader = ({ titles, currentIndex, reachedIndex, onJump }) => (
  <div className="px-6 pt-4 pb-3 border-b border-line-subtle">
    <ol className="hidden sm:flex items-center gap-2">
      {titles.map((title, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;
        const reachable = index <= reachedIndex;

        return (
          <li key={title} className="flex items-center gap-2 flex-1 min-w-0">
            <button
              type="button"
              onClick={() => reachable && onJump(index)}
              disabled={!reachable}
              className={`flex items-center gap-2 min-w-0 ${
                reachable ? "cursor-pointer" : "cursor-default"
              }`}
              title={reachable ? `Go to ${title}` : title}
            >
              <span
                className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold border shrink-0 ${
                  done || active
                    ? "bg-secondary-600 border-secondary-600 text-white"
                    : "bg-white border-line text-fg-muted"
                }`}
              >
                {done ? <FaCheck size={9} /> : index + 1}
              </span>
              <span
                className={`text-xs font-medium truncate ${
                  active
                    ? "text-secondary-700"
                    : done
                      ? "text-fg-3"
                      : "text-fg-muted"
                }`}
              >
                {title}
              </span>
            </button>
            {index < titles.length - 1 && (
              <span
                className={`flex-1 h-px ${
                  done ? "bg-secondary-300" : "bg-emphasis"
                }`}
              />
            )}
          </li>
        );
      })}
    </ol>

    <div className="sm:hidden flex items-center justify-between gap-3">
      <p className="text-xs font-semibold text-fg-3 truncate">
        Step {currentIndex + 1} of {titles.length} — {titles[currentIndex]}
      </p>
      <div className="flex gap-1 shrink-0">
        {titles.map((title, index) => (
          <span
            key={title}
            className={`h-1.5 w-1.5 rounded-full ${
              index === currentIndex
                ? "bg-secondary-600"
                : index < currentIndex
                  ? "bg-secondary-300"
                  : "bg-emphasis"
            }`}
          />
        ))}
      </div>
    </div>
  </div>
);

const ReviewGroup = ({ title, entries, onEdit }) => (
  <div className="rounded-xl border border-line-subtle bg-subtle/50 p-3.5">
    <div className="flex items-center justify-between gap-2 mb-2">
      <p className="text-2xs font-semibold uppercase tracking-wider text-fg-muted">
        {title}
      </p>
      <button
        type="button"
        onClick={onEdit}
        className="inline-flex items-center gap-1 text-xs font-medium text-secondary-700 hover:text-secondary-800 transition-colors"
      >
        <FaPen size={9} />
        Edit
      </button>
    </div>
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
      {entries.map(({ label, value }) => (
        <div key={label} className="min-w-0">
          <dt className="text-2xs font-semibold uppercase tracking-wider text-fg-muted">
            {label}
          </dt>
          <dd className="text-sm text-fg-2 break-words">{value}</dd>
        </div>
      ))}
    </dl>
  </div>
);

export default function ProjectCreateModal({
  config,
  apiBase,
  userId,
  onClose,
  onCreated,
}) {
  const fields = useMemo(() => config.createFields || [], [config.createFields]);
  const groupedSteps = useMemo(() => groupFieldsByStep(fields), [fields]);

  /* Last step is always the generated review screen. */
  const reviewIndex = groupedSteps.length;

  const stepTitles = useMemo(() => {
    const configured = Array.isArray(config.createStepTitles)
      ? config.createStepTitles
      : [];

    return [
      ...groupedSteps.map(
        (group, index) => configured[index] || `Step ${index + 1}`,
      ),
      configured[reviewIndex] || "Review",
    ];
  }, [config.createStepTitles, groupedSteps, reviewIndex]);

  const [values, setValues] = useState(() => buildInitialValues(fields));
  const [stepIndex, setStepIndex] = useState(0);
  const [reachedIndex, setReachedIndex] = useState(0);
  const [stepErrors, setStepErrors] = useState([]);
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);

  /* Escape or the backdrop close the wizard, but never in the middle of a
     save (the request would finish with the modal gone). */
  const dialogRef = useDialog(saving ? null : onClose);

  const isReview = stepIndex === reviewIndex;
  const currentStep = isReview ? null : groupedSteps[stepIndex];

  const setValue = (key, value) => {
    setValues((prev) => {
      const next = { ...prev, [key]: value };

      /* Dependent selects: drop a value that the new parent selection no
         longer offers (e.g. an Extension category after switching to Research). */
      for (const field of fields) {
        if (!field.optionsBy || field.optionsBy.field !== key) continue;
        const allowed = field.optionsBy.map?.[value] || field.options || [];
        if (next[field.key] && !allowed.includes(next[field.key])) {
          next[field.key] = "";
        }
      }

      return next;
    });
    setStepErrors([]);
  };

  const missingRequired = (group, state) =>
    group.fields.filter(
      (field) => field.required && isEmptyValue(state[field.key]),
    );

  const validateStep = () => {
    if (!currentStep) return true;

    const missing = missingRequired(currentStep, values);
    if (missing.length > 0) {
      setStepErrors(missing.map((field) => `${field.label} is required.`));
      return false;
    }

    setStepErrors([]);
    return true;
  };

  const goNext = () => {
    if (!validateStep()) return;
    const next = Math.min(stepIndex + 1, reviewIndex);
    setStepIndex(next);
    setReachedIndex((prev) => Math.max(prev, next));
  };

  const goBack = () => {
    setStepErrors([]);
    setStepIndex((prev) => Math.max(prev - 1, 0));
  };

  const jumpToStep = (index) => {
    setSubmitError("");
    if (index === stepIndex) return;
    /* Only already-reached steps can be re-opened from the stepper. */
    if (index > reachedIndex) return;
    setStepErrors([]);
    setStepIndex(index);
  };

  const buildPayload = () => {
    const payload = {
      userId,
      ...config.createDefaults,
    };

    for (const field of fields) {
      const raw = values[field.key];

      if (field.type === "list") {
        payload[field.key] = textToList(raw);
        continue;
      }

      if (field.type === "number") {
        payload[field.key] = raw === "" ? null : Number(raw);
        continue;
      }

      payload[field.key] = raw ?? "";
    }

    return payload;
  };

  const handleCreate = async () => {
    /* Re-validate every step and jump to the first missing requirement. */
    for (let index = 0; index < groupedSteps.length; index += 1) {
      const missing = missingRequired(groupedSteps[index], values);

      if (missing.length > 0) {
        setStepIndex(index);
        setReachedIndex((prev) => Math.max(prev, index));
        setStepErrors(missing.map((field) => `${field.label} is required.`));
        return;
      }
    }

    setSaving(true);
    setSubmitError("");

    try {
      const res = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || "Failed to create project");
      }

      onCreated(data.data);
    } catch (err) {
      setSubmitError(err.message || "Failed to create project");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => !saving && onClose()}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-create-title"
      >
        <div className="shrink-0 px-6 py-4 flex items-center justify-between border-b border-line-subtle rounded-t-2xl">
          <div>
            <h3 id="project-create-title" className="text-base font-bold text-fg">
              {/* config.title is plural ("Academic Projects"); this read
                  "New Academic Projects Project". */}
              New {String(config.title || "").replace(/\s*Projects?$/i, "")}{" "}
              Project
            </h3>
            <p className="text-xs text-fg-muted mt-0.5">
              Fields marked <span className="text-danger">*</span> are required.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="touch-target h-8 w-8 rounded-lg text-fg-muted hover:bg-muted hover:text-fg-4 flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <FaTimes size={14} />
          </button>
        </div>

        <StepperHeader
          titles={stepTitles}
          currentIndex={stepIndex}
          reachedIndex={reachedIndex}
          onJump={jumpToStep}
        />

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {stepErrors.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-danger-border bg-danger-subtle px-3 py-2.5 text-sm text-danger">
              <FaExclamationTriangle size={14} className="mt-0.5 shrink-0" />
              <ul className="space-y-0.5">
                {stepErrors.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </div>
          )}

          {submitError && stepErrors.length === 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-danger-border bg-danger-subtle px-3 py-2.5 text-sm text-danger">
              <FaExclamationTriangle size={14} className="mt-0.5 shrink-0" />
              {submitError}
            </div>
          )}

          {isReview ? (
            <div className="space-y-3">
              {groupedSteps.map((group, index) => (
                <ReviewGroup
                  key={stepTitles[index]}
                  title={stepTitles[index]}
                  onEdit={() => jumpToStep(index)}
                  entries={group.fields.map((field) => ({
                    label: field.label,
                    value: formatFieldValue(field, values[field.key]),
                  }))}
                />
              ))}
            </div>
          ) : (
            <form onSubmit={(e) => e.preventDefault()}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {currentStep.fields.map((field) => (
                  <FieldRenderer
                    key={field.key}
                    field={{ ...field, options: resolveOptions(field, values) }}
                    value={values[field.key]}
                    onChange={(value) => setValue(field.key, value)}
                  />
                ))}
              </div>
            </form>
          )}
        </div>

        <div className="shrink-0 border-t border-line-subtle px-6 py-4 flex items-center justify-between gap-3 rounded-b-2xl">
          <Button
            variant="secondary"
            onClick={onClose}
            className="rounded-lg"
          >
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <Button
                variant="secondary"
                onClick={goBack}
                className="gap-1.5 rounded-lg"
              >
                <FaChevronLeft size={10} />
                Back
              </Button>
            )}

            {isReview ? (
              <Button
                variant="primary"
                onClick={handleCreate}
                disabled={saving}
                className="rounded-lg"
              >
                {saving ? (
                  <FaSpinner className="animate-spin" size={12} />
                ) : (
                  <FaCheck size={11} />
                )}
                {saving ? "Creating…" : "Create Project"}
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={goNext}
                className="rounded-lg"
              >
                Next
                <FaChevronRight size={10} />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
