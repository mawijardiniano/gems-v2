"use client";

import React from "react";
import { alignActivityDescriptions, isAttributedProgram, isStep1Valid, isStep2Valid, isStep3Valid, serializeIndicators } from "../lib/projectForm";
import PerformanceIndicatorInput from "./PerformanceIndicatorInput";
import OfficeMultiSelect from "../../../components/OfficeMultiSelect";
import { toOfficeArray } from "@/data/lib/colleges";
import { useDialog } from "@/hooks/useDialog";
import Button from "@/components/ui/Button";

/* Extracted from the GPB year page (gpb/[year]/content.jsx). The page owns
   the state and handlers and passes them in. */
export default function AddProjectWizard({
  addError,
  addLoading,
  addWarning,
  budgetSummary,
  duplicateWarnings,
  handleActivityDescriptionChange,
  handleActivityTitleChange,
  handleAddActivityRow,
  handleAddArrayField,
  handleArrayFieldChange,
  handleNewProjectChange,
  handleRemoveActivityRow,
  handleRemoveArrayField,
  handleWizardSubmit,
  newProject,
  nextRefPreview,
  setShowWizard,
  setWizardStep,
  wizardStep,
  year,
}) {
  const dialogRef = useDialog(addLoading ? null : () => setShowWizard(false));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        ref={dialogRef}
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 relative max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-label="Add project"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-fg-2">
            Add Project — Year {year}
          </h2>
          {/* Closing (and the step reset) is closeWizard's job, which waits
              while a save is running; resetting the step here sent a saving
              wizard back to step 1. */}
          <button
            type="button"
            aria-label="Close"
            onClick={() => setShowWizard(false)}
            className="touch-target text-fg-muted hover:text-fg-3 text-3xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="flex items-center gap-2 mb-6">
          {[
            "Gender Issue",
            "Objectives & Data",
            "Activity & Budget",
            "Review",
          ].map((label, i) => (
            <React.Fragment key={i}>
              <div
                className={`flex items-center gap-1.5 ${
                  wizardStep === i + 1
                    ? "text-secondary-600"
                    : wizardStep > i + 1
                      ? "text-success"
                      : "text-fg-muted"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                    wizardStep === i + 1
                      ? "border-secondary-600 bg-secondary-50"
                      : wizardStep > i + 1
                        ? "border-green-600 bg-success-subtle"
                        : "border-line-strong"
                  }`}
                >
                  {wizardStep > i + 1 ? "✓" : i + 1}
                </div>
                <span className="text-xs font-medium hidden sm:block">
                  {label}
                </span>
              </div>
              {i < 3 && (
                <div
                  className={`flex-1 h-0.5 ${wizardStep > i + 1 ? "bg-green-400" : "bg-emphasis"}`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {budgetSummary !== null && !budgetSummary.hasBudget && (
          <div className="whitespace-pre-line rounded-xl bg-secondary-50 border border-secondary-200 px-4 py-3 text-secondary-700 mb-4">
            No GAA budget allocated for {year} yet — you can still record
            this project. Utilization will be tracked and capped
            automatically once the budget arrives.
          </div>
        )}

        {addError && (
          <div className="mb-4 p-3 rounded bg-danger-subtle border border-danger-border text-danger text-sm">
            {addError}
          </div>
        )}

        {addWarning && (
          <div className="mb-4 p-3 rounded bg-secondary-50 border border-secondary-200 text-secondary-700 text-sm whitespace-pre-line">
            {addWarning}
          </div>
        )}

        {wizardStep === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-fg-3 mb-1">
                Project Type <span className="text-danger">*</span>
              </label>
              <select
                className="w-full border border-line-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-secondary-500"
                value={newProject.project_type}
                onChange={(e) =>
                  handleNewProjectChange("project_type", e.target.value)
                }
              >
                <option value="">Select project type</option>
                <option value="Client Focused">Client Focused</option>
                <option value="Organization Focused">
                  Organization Focused
                </option>
                <option value="Attributed Program">
                  Attributed Program
                </option>
              </select>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-subtle border border-line px-3 py-2 text-xs text-fg-muted">
              <span>Project Reference No.</span>
              <span className="font-mono font-semibold text-fg-3">
                {nextRefPreview}
              </span>
            </div>
            {!isAttributedProgram(newProject) && (
              <>
                <div>
                  <label className="block text-sm font-medium text-fg-3 mb-1">
                    Gender Issue / GAD Mandate{" "}
                    <span className="text-danger">*</span>
                  </label>
                  <textarea
                    className="w-full border border-line-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-secondary-500"
                    rows={3}
                    value={newProject.gender_issue}
                    onChange={(e) =>
                      handleNewProjectChange("gender_issue", e.target.value)
                    }
                  />
                  {duplicateWarnings.length > 0 && (
                    <div className="mt-2 p-3 rounded-lg bg-secondary-50 border border-secondary-200 text-secondary-700 text-xs space-y-1">
                      <p className="font-semibold flex items-center gap-1">
                        ⚠️ Similar Gender Issue / GAD Mandate exists:
                      </p>
                      {duplicateWarnings.map((w, i) => (
                        <p key={i} className="pl-4">
                          "{w.gender_issue}" (
                          {Math.round(w.similarity * 100)}% match)
                        </p>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-fg-3 mb-1">
                    Cause of the Gender Issue{" "}
                    <span className="text-danger">*</span>
                  </label>
                  {newProject.cause_gender_issue.map((val, idx) => (
                    <div key={idx} className="flex gap-2 mb-2">
                      <textarea
                        className="flex-1 border border-line-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-secondary-500"
                        rows={2}
                        value={val}
                        onChange={(e) =>
                          handleArrayFieldChange(
                            "cause_gender_issue",
                            idx,
                            e.target.value,
                          )
                        }
                      />
                      <div className="flex flex-col gap-1">
                        {newProject.cause_gender_issue.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              handleRemoveArrayField(
                                "cause_gender_issue",
                                idx,
                              )
                            }
                            className="px-2 py-1 bg-red-500 text-white rounded text-xs"
                          >
                            -
                          </button>
                        )}
                        {idx ===
                          newProject.cause_gender_issue.length - 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              handleAddArrayField("cause_gender_issue")
                            }
                            className="px-2 py-1 bg-green-500 text-white rounded text-xs"
                          >
                            +
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {wizardStep === 2 && !isAttributedProgram(newProject) && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-fg-3 mb-1">
                GAD Result Statement / GAD Objective{" "}
                <span className="text-danger">*</span>
              </label>
              {newProject.gad_objective.map((val, idx) => (
                <div key={idx} className="flex gap-2 mb-2">
                  <textarea
                    className="flex-1 border border-line-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-secondary-500"
                    rows={2}
                    value={val}
                    onChange={(e) =>
                      handleArrayFieldChange(
                        "gad_objective",
                        idx,
                        e.target.value,
                      )
                    }
                  />
                  <div className="flex flex-col gap-1">
                    {newProject.gad_objective.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          handleRemoveArrayField("gad_objective", idx)
                        }
                        className="px-2 py-1 bg-red-500 text-white rounded text-xs"
                      >
                        -
                      </button>
                    )}
                    {idx === newProject.gad_objective.length - 1 && (
                      <button
                        type="button"
                        onClick={() => handleAddArrayField("gad_objective")}
                        className="px-2 py-1 bg-green-500 text-white rounded text-xs"
                      >
                        +
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div>
              <label className="block text-sm font-medium text-fg-3 mb-1">
                Supporting Statistics / Data
              </label>
              <textarea
                className="w-full border border-line-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-secondary-500"
                rows={3}
                value={newProject.supporting_statistics_data}
                onChange={(e) =>
                  handleNewProjectChange(
                    "supporting_statistics_data",
                    e.target.value,
                  )
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-fg-3 mb-1">
                Relevant Agency MFO/PAP{" "}
                <span className="text-danger">*</span>
              </label>
              <textarea
                className="w-full border border-line-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-secondary-500"
                rows={2}
                value={newProject.relevant_agency}
                onChange={(e) =>
                  handleNewProjectChange("relevant_agency", e.target.value)
                }
              />
            </div>
          </div>
        )}

        {wizardStep === 3 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-fg-3 mb-1">
                GAD Activity <span className="text-danger">*</span>
              </label>
              <p className="text-xs text-fg-muted mb-2">
                Type the activity title, then its description underneath.
                Both print inside the single GAD Activity column.
              </p>
              {newProject.gad_activity.map((val, idx) => (
                <div
                  key={idx}
                  className="flex gap-2 mb-2 rounded-lg border border-line bg-subtle p-2"
                >
                  <div className="flex-1 space-y-2">
                    <textarea
                      className="w-full border border-line-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-secondary-500"
                      rows={2}
                      placeholder="GAD activity title"
                      value={val}
                      onChange={(e) =>
                        handleActivityTitleChange(idx, e.target.value)
                      }
                    />
                    <textarea
                      className="w-full border border-line-strong rounded-lg px-3 py-2 text-xs text-fg-4 focus:outline-none focus:ring-2 focus:ring-secondary-500"
                      rows={2}
                      placeholder="Description (optional)"
                      value={
                        alignActivityDescriptions(
                          newProject.gad_activity,
                          newProject.gad_activity_description,
                        )[idx] || ""
                      }
                      onChange={(e) =>
                        handleActivityDescriptionChange(idx, e.target.value)
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    {newProject.gad_activity.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveActivityRow(idx)}
                        className="px-2 py-1 bg-red-500 text-white rounded text-xs"
                      >
                        -
                      </button>
                    )}
                    {idx === newProject.gad_activity.length - 1 && (
                      <button
                        type="button"
                        onClick={handleAddActivityRow}
                        className="px-2 py-1 bg-green-500 text-white rounded text-xs"
                      >
                        +
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {!isAttributedProgram(newProject) && (
              <div>
                <label className="block text-sm font-medium text-fg-3 mb-1">
                  Output Performance Indicators and Target
                </label>
                {newProject.performance_indicator_target.map((val, idx) => (
                  <div key={idx} className="flex gap-2 mb-2 items-start">
                    <div className="flex-1">
                      <PerformanceIndicatorInput
                        value={val}
                        onChange={(updated) => {
                          const arr = [
                            ...newProject.performance_indicator_target,
                          ];
                          arr[idx] = updated;
                          handleNewProjectChange(
                            "performance_indicator_target",
                            arr,
                          );
                        }}
                      />
                    </div>
                    <div className="flex flex-col gap-1 mt-4">
                      {newProject.performance_indicator_target.length >
                        1 && (
                        <button
                          type="button"
                          onClick={() =>
                            handleRemoveArrayField(
                              "performance_indicator_target",
                              idx,
                            )
                          }
                          className="px-2 py-1 bg-red-500 text-white rounded text-xs"
                        >
                          -
                        </button>
                      )}
                      {idx ===
                        newProject.performance_indicator_target.length -
                          1 && (
                        <button
                          type="button"
                          onClick={() =>
                            handleAddArrayField(
                              "performance_indicator_target",
                            )
                          }
                          className="px-2 py-1 bg-green-500 text-white rounded text-xs"
                        >
                          +
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-fg-3 mb-1">
                  GAD Budget <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  className="w-full border border-line-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-secondary-500"
                  value={newProject.gad_budget ?? ""}
                  /* An emptied field stays empty; Number("") made it "0". */
                  onChange={(e) =>
                    handleNewProjectChange(
                      "gad_budget",
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-fg-3 mb-1">
                  Source of Budget <span className="text-danger">*</span>
                </label>
                <textarea
                  className="w-full border border-line-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-secondary-500"
                  rows={2}
                  value={newProject.source_budget}
                  onChange={(e) =>
                    handleNewProjectChange("source_budget", e.target.value)
                  }
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-fg-3 mb-1">
                Responsible Unit/Office{" "}
                <span className="text-danger">*</span>
              </label>
              <OfficeMultiSelect
                value={newProject.responsible_office}
                onChange={(next) =>
                  handleNewProjectChange("responsible_office", next)
                }
              />
            </div>
          </div>
        )}

        {wizardStep === 4 && (
          <div className="space-y-3 text-sm">
            <div className="bg-subtle rounded-lg p-4 space-y-3">
              <div>
                <span className="font-medium text-fg-4">
                  Project Type:
                </span>
                <p className="mt-0.5 text-fg-2">
                  {newProject.project_type || "—"}
                </p>
              </div>
              <div>
                <span className="font-medium text-fg-4">
                  Gender Issue:
                </span>
                <p className="mt-0.5 text-fg-2">
                  {newProject.gender_issue || "—"}
                </p>
              </div>
              <div>
                <span className="font-medium text-fg-4">
                  Cause of Gender Issue:
                </span>
                <ul className="mt-0.5 list-disc list-inside text-fg-2">
                  {newProject.cause_gender_issue
                    .filter(Boolean)
                    .map((v, i) => (
                      <li key={i}>{v}</li>
                    ))}
                </ul>
              </div>
              <div>
                <span className="font-medium text-fg-4">
                  GAD Objective:
                </span>
                <ul className="mt-0.5 list-disc list-inside text-fg-2">
                  {newProject.gad_objective.filter(Boolean).map((v, i) => (
                    <li key={i}>{v}</li>
                  ))}
                </ul>
              </div>
              <div>
                <span className="font-medium text-fg-4">
                  Supporting Statistics:
                </span>
                <p className="mt-0.5 text-fg-2">
                  {newProject.supporting_statistics_data || "—"}
                </p>
              </div>
              <div>
                <span className="font-medium text-fg-4">
                  Relevant Agency:
                </span>
                <p className="mt-0.5 text-fg-2">
                  {newProject.relevant_agency || "—"}
                </p>
              </div>
              <div>
                <span className="font-medium text-fg-4">
                  GAD Activity:
                </span>
                <ul className="mt-0.5 list-disc list-inside text-fg-2">
                  {newProject.gad_activity.filter(Boolean).map((v, i) => {
                    const description = alignActivityDescriptions(
                      newProject.gad_activity,
                      newProject.gad_activity_description,
                    )[i];
                    return (
                      <li key={i}>
                        {v}
                        {description ? (
                          <span className="block pl-4">{description}</span>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div>
                <span className="font-medium text-fg-4">
                  Performance Indicators:
                </span>
                <ul className="mt-0.5 list-disc list-inside text-fg-2">
                  {serializeIndicators(
                    newProject.performance_indicator_target,
                  ).map((v, i) => (
                    <li key={i}>{v}</li>
                  ))}
                </ul>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="font-medium text-fg-4">
                    GAD Budget:
                  </span>
                  <p className="mt-0.5 text-fg-2">
                    ₱{Number(newProject.gad_budget || 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-fg-4">
                    Source of Budget:
                  </span>
                  <p className="mt-0.5 text-fg-2">
                    {newProject.source_budget || "—"}
                  </p>
                </div>
              </div>
              <div>
                <span className="font-medium text-fg-4">
                  Responsible Office:
                </span>
                <p className="mt-0.5 text-fg-2">
                  {toOfficeArray(newProject.responsible_office).join(
                    ", ",
                  ) || "—"}
                </p>
              </div>
            </div>
          </div>
        )}

        {(() => {
          const stepValid =
            wizardStep === 1
              ? isStep1Valid(newProject)
              : wizardStep === 2
                ? isStep2Valid(newProject)
                : wizardStep === 3
                  ? isStep3Valid(newProject)
                  : true;

          return (
            <div className="flex flex-col gap-2 mt-6 pt-4 border-t border-line">
              {!stepValid && (
                <div className="text-xs text-danger text-right">
                  Please fill in all required fields before continuing.
                </div>
              )}
              <div className="flex justify-between">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => {
                    if (wizardStep === 1) {
                      setShowWizard(false);
                      setWizardStep(1);
                    } else if (
                      isAttributedProgram(newProject) &&
                      wizardStep === 3
                    ) {
                      setWizardStep(1);
                    } else {
                      setWizardStep(wizardStep - 1);
                    }
                  }}
                >
                  {wizardStep === 1 ? "Cancel" : "← Back"}
                </Button>
                {wizardStep < 4 ? (
                  <Button
                    variant="primary"
                    type="button"
                    onClick={() => {
                      if (
                        isAttributedProgram(newProject) &&
                        wizardStep === 1
                      ) {
                        setWizardStep(3);
                      } else {
                        setWizardStep(wizardStep + 1);
                      }
                    }}
                    disabled={!stepValid}
                  >
                    Next →
                  </Button>
                ) : (
                  <Button
                    variant="success"
                    type="button"
                    onClick={handleWizardSubmit}
                    disabled={
                      addLoading ||
                      !isStep3Valid(newProject) ||
                      !isStep1Valid(newProject) ||
                      !isStep2Valid(newProject)
                    }
                  >
                    {addLoading ? "Saving..." : "Submit"}
                  </Button>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
