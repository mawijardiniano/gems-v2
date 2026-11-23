"use client";

import { alignActivityDescriptions, emptyIndicator, isAttributedProgram, isEditRowValid } from "../lib/projectForm";
import PerformanceIndicatorInput from "./PerformanceIndicatorInput";
import OfficeMultiSelect from "../../../components/OfficeMultiSelect";
import { useDialog } from "@/hooks/useDialog";
import Button from "@/components/ui/Button";

/* Extracted from the GPB year page (gpb/[year]/content.jsx). The page owns
   the state and handlers and passes them in. */
export default function GpbEditProjectModal({
  cancelEdit,
  editDuplicateWarnings,
  editError,
  editLoading,
  editRow,
  handleAddEditActivityRow,
  handleEditActivityDescriptionChange,
  handleEditActivityTitleChange,
  handleEditRowChange,
  handleRemoveEditActivityRow,
  saveEdit,
}) {
  const dialogRef = useDialog(editLoading ? null : cancelEdit);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        ref={dialogRef}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl relative flex flex-col max-h-[92vh]"
        role="dialog"
        aria-modal="true"
        aria-label="Edit project"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              Edit Project
              {editRow.reference_number && (
                <span className="ml-2 align-middle font-mono text-xs font-semibold text-secondary-700 bg-secondary-50 border border-secondary-200 rounded px-2 py-0.5">
                  {editRow.reference_number}
                </span>
              )}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              All fields marked <span className="text-danger">*</span> are
              required
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={cancelEdit}
            className="touch-target w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-800 text-3xl transition"
          >
            ×
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto px-6 py-5 space-y-8 flex-1">
          {editError && (
            <div className="p-3 rounded-lg bg-danger-subtle border border-danger-border text-danger text-sm">
              {editError}
            </div>
          )}

          {/* Section 1 */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-full bg-secondary-600 text-white text-xs font-bold flex items-center justify-center">
                1
              </div>
              <h3 className="text-base font-semibold text-gray-700">
                Gender Issue
              </h3>
            </div>
            <div className="space-y-4 pl-8">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Type <span className="text-danger">*</span>
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-secondary-500"
                value={editRow.project_type}
                onChange={(e) =>
                  handleEditRowChange("project_type", e.target.value)
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

            {!isAttributedProgram(editRow) && (
              <div className="space-y-4 pl-8">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Gender Issue / GAD Mandate{" "}
                    <span className="text-danger">*</span>
                  </label>
                  <textarea
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary-400 resize-none"
                    rows={3}
                    value={editRow.gender_issue || ""}
                    onChange={(e) =>
                      handleEditRowChange("gender_issue", e.target.value)
                    }
                  />
                  {editDuplicateWarnings.length > 0 && (
                    <div className="mt-2 p-3 rounded-lg bg-secondary-50 border border-secondary-200 text-secondary-700 text-xs space-y-1">
                      <p className="font-semibold flex items-center gap-1">
                        ⚠️ Similar Gender Issue / GAD Mandate exists:
                      </p>
                      {editDuplicateWarnings.map((w, i) => (
                        <p key={i} className="pl-4">
                          "{w.gender_issue}" (
                          {Math.round(w.similarity * 100)}% match)
                        </p>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Cause of the Gender Issue{" "}
                    <span className="text-danger">*</span>
                  </label>
                  <div className="space-y-2">
                    {(editRow.cause_gender_issue || [""]).map(
                      (val, idx) => (
                        <div key={idx} className="flex gap-2 items-start">
                          <span className="mt-2 text-xs text-gray-500 w-5 text-right shrink-0">
                            {idx + 1}.
                          </span>
                          <textarea
                            className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary-400 resize-none"
                            rows={2}
                            value={val}
                            onChange={(e) => {
                              const arr = [
                                ...(editRow.cause_gender_issue || [""]),
                              ];
                              arr[idx] = e.target.value;
                              handleEditRowChange(
                                "cause_gender_issue",
                                arr,
                              );
                            }}
                          />
                          <div className="flex flex-col gap-1 pointer-coarse:gap-3 mt-1 shrink-0">
                            {(editRow.cause_gender_issue || []).length >
                              1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const arr = [
                                    ...editRow.cause_gender_issue,
                                  ];
                                  arr.splice(idx, 1);
                                  handleEditRowChange(
                                    "cause_gender_issue",
                                    arr,
                                  );
                                }}
                                aria-label="Remove cause"
                                className="touch-target w-7 h-7 flex items-center justify-center rounded-lg bg-red-100 text-danger hover:bg-red-200 text-base font-bold transition"
                              >
                                −
                              </button>
                            )}
                            {idx ===
                              (editRow.cause_gender_issue || []).length -
                                1 && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleEditRowChange(
                                    "cause_gender_issue",
                                    [
                                      ...(editRow.cause_gender_issue || []),
                                      "",
                                    ],
                                  )
                                }
                                aria-label="Add cause"
                                className="touch-target w-7 h-7 flex items-center justify-center rounded-lg bg-green-100 text-success hover:bg-green-200 text-base font-bold transition"
                              >
                                +
                              </button>
                            )}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {!isAttributedProgram(editRow) && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-full bg-secondary-600 text-white text-xs font-bold flex items-center justify-center">
                  2
                </div>
                <h3 className="text-base font-semibold text-gray-700">
                  Objectives & Data
                </h3>
              </div>
              <div className="space-y-4 pl-8">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    GAD Result Statement / GAD Objective{" "}
                    <span className="text-danger">*</span>
                  </label>
                  <div className="space-y-2">
                    {(editRow.gad_objective || [""]).map((val, idx) => (
                      <div key={idx} className="flex gap-2 items-start">
                        <span className="mt-2 text-xs text-gray-500 w-5 text-right shrink-0">
                          {idx + 1}.
                        </span>
                        <textarea
                          className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary-400 resize-none"
                          rows={2}
                          value={val}
                          onChange={(e) => {
                            const arr = [
                              ...(editRow.gad_objective || [""]),
                            ];
                            arr[idx] = e.target.value;
                            handleEditRowChange("gad_objective", arr);
                          }}
                        />
                        <div className="flex flex-col gap-1 pointer-coarse:gap-3 mt-1 shrink-0">
                          {(editRow.gad_objective || []).length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const arr = [...editRow.gad_objective];
                                arr.splice(idx, 1);
                                handleEditRowChange("gad_objective", arr);
                              }}
                              aria-label="Remove objective"
                              className="touch-target w-7 h-7 flex items-center justify-center rounded-lg bg-red-100 text-danger hover:bg-red-200 text-base font-bold transition"
                            >
                              −
                            </button>
                          )}
                          {idx ===
                            (editRow.gad_objective || []).length - 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                handleEditRowChange("gad_objective", [
                                  ...(editRow.gad_objective || []),
                                  "",
                                ])
                              }
                              aria-label="Add objective"
                              className="touch-target w-7 h-7 flex items-center justify-center rounded-lg bg-green-100 text-success hover:bg-green-200 text-base font-bold transition"
                            >
                              +
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Supporting Statistics / Data
                  </label>
                  <textarea
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary-400 resize-none"
                    rows={3}
                    value={editRow.supporting_statistics_data || ""}
                    onChange={(e) =>
                      handleEditRowChange(
                        "supporting_statistics_data",
                        e.target.value,
                      )
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Relevant Agency MFO/PAP{" "}
                    <span className="text-danger">*</span>
                  </label>
                  <textarea
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary-400 resize-none"
                    rows={2}
                    value={editRow.relevant_agency || ""}
                    onChange={(e) =>
                      handleEditRowChange("relevant_agency", e.target.value)
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section 3 */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-full bg-secondary-600 text-white text-xs font-bold flex items-center justify-center">
                3
              </div>
              <h3 className="text-base font-semibold text-gray-700">
                Activity & Budget
              </h3>
            </div>
            <div className="space-y-4 pl-8">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  GAD Activity <span className="text-danger">*</span>
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Type the activity title, then its description underneath.
                  Both print inside the single GAD Activity column.
                </p>
                <div className="space-y-3">
                  {(editRow.gad_activity || [""]).map((val, idx) => (
                    <div
                      key={idx}
                      className="flex gap-2 items-start rounded-xl border border-gray-200 bg-gray-50 p-2"
                    >
                      <span className="mt-2 text-xs text-gray-500 w-5 text-right shrink-0">
                        {idx + 1}.
                      </span>
                      <div className="flex-1 space-y-2">
                        <textarea
                          className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary-400 resize-none"
                          rows={2}
                          placeholder="GAD activity title"
                          value={val}
                          onChange={(e) =>
                            handleEditActivityTitleChange(
                              idx,
                              e.target.value,
                            )
                          }
                        />
                        <textarea
                          className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-secondary-400 resize-none"
                          rows={2}
                          placeholder="Description (optional)"
                          value={
                            alignActivityDescriptions(
                              editRow.gad_activity,
                              editRow.gad_activity_description,
                            )[idx] || ""
                          }
                          onChange={(e) =>
                            handleEditActivityDescriptionChange(
                              idx,
                              e.target.value,
                            )
                          }
                        />
                      </div>
                      <div className="flex flex-col gap-1 pointer-coarse:gap-3 mt-1 shrink-0">
                        {(editRow.gad_activity || []).length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveEditActivityRow(idx)}
                            aria-label="Remove activity"
                            className="touch-target w-7 h-7 flex items-center justify-center rounded-lg bg-red-100 text-danger hover:bg-red-200 text-base font-bold transition"
                          >
                            −
                          </button>
                        )}
                        {idx ===
                          (editRow.gad_activity || []).length - 1 && (
                          <button
                            type="button"
                            onClick={handleAddEditActivityRow}
                            aria-label="Add activity"
                            className="touch-target w-7 h-7 flex items-center justify-center rounded-lg bg-green-100 text-success hover:bg-green-200 text-base font-bold transition"
                          >
                            +
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Output Performance Indicators and Target
                </label>
                <div className="space-y-3">
                  {(
                    editRow.performance_indicator_target || [
                      emptyIndicator(),
                    ]
                  ).map((val, idx) => (
                    <div
                      key={idx}
                      className="flex gap-2 items-start bg-gray-50 rounded-xl p-3 border border-gray-200"
                    >
                      <div className="flex-1">
                        <PerformanceIndicatorInput
                          value={val}
                          onChange={(updated) => {
                            const arr = [
                              ...(editRow.performance_indicator_target ||
                                []),
                            ];
                            arr[idx] = updated;
                            handleEditRowChange(
                              "performance_indicator_target",
                              arr,
                            );
                          }}
                        />
                      </div>
                      <div className="flex flex-col gap-1 pointer-coarse:gap-3 shrink-0">
                        {(editRow.performance_indicator_target || [])
                          .length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const arr = [
                                ...editRow.performance_indicator_target,
                              ];
                              arr.splice(idx, 1);
                              handleEditRowChange(
                                "performance_indicator_target",
                                arr,
                              );
                            }}
                            aria-label="Remove indicator"
                            className="touch-target w-7 h-7 flex items-center justify-center rounded-lg bg-red-100 text-danger hover:bg-red-200 text-base font-bold transition"
                          >
                            −
                          </button>
                        )}
                        {idx ===
                          (editRow.performance_indicator_target || [])
                            .length -
                            1 && (
                          <button
                            type="button"
                            onClick={() =>
                              handleEditRowChange(
                                "performance_indicator_target",
                                [
                                  ...(editRow.performance_indicator_target ||
                                    []),
                                  emptyIndicator(),
                                ],
                              )
                            }
                            aria-label="Add indicator"
                            className="touch-target w-7 h-7 flex items-center justify-center rounded-lg bg-green-100 text-success hover:bg-green-200 text-base font-bold transition"
                          >
                            +
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    GAD Budget <span className="text-danger">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                      ₱
                    </span>
                    <input
                      type="number"
                      min="0"
                      className="w-full border border-gray-300 rounded-xl pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary-400"
                      value={editRow.gad_budget || ""}
                      onChange={(e) =>
                        handleEditRowChange(
                          "gad_budget",
                          Number(e.target.value),
                        )
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Source of Budget <span className="text-danger">*</span>
                  </label>
                  <textarea
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary-400 resize-none"
                    rows={2}
                    value={editRow.source_budget || ""}
                    onChange={(e) =>
                      handleEditRowChange("source_budget", e.target.value)
                    }
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Responsible Unit/Office{" "}
                  <span className="text-danger">*</span>
                </label>
                <OfficeMultiSelect
                  value={editRow.responsible_office}
                  onChange={(next) =>
                    handleEditRowChange("responsible_office", next)
                  }
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <Button
            variant="secondary"
            type="button"
            onClick={cancelEdit}
          >
            Cancel
          </Button>
          <div className="flex flex-col items-end gap-1">
            {!isEditRowValid(editRow) && (
              <span className="text-xs text-danger">
                Please fill in all required fields.
              </span>
            )}
            <Button
              variant="primary"
              type="button"
              onClick={saveEdit}
              disabled={editLoading || !isEditRowValid(editRow)}
            >
              {editLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
