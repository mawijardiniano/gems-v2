"use client";

import React, { useRef } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import GADActivityCell from "./GADActivityCell";
import { formatAmount } from "@/data/lib/money";
import { toOfficeArray } from "@/data/lib/colleges";
import { canManageProject } from "@/data/lib/projectAccess";
import {
  alignActivityDescriptions,
  getCreatorName,
  getCreatorRole,
  getProjectTypeLabel,
} from "../lib/projectForm";

/* The GPB year page's projects table: budget notices, the project rows
   (grouped by type) and pagination. Data and actions come from the page. */
export default function GpbProjectsTable({
  addError,
  addWarning,
  budgetSummary,
  gpbStatus,
  page,
  pageSize,
  pageSizeInput,
  paginatedProjects,
  projectCount,
  setPage,
  setPageSize,
  setPageSizeInput,
  sidebarOpen,
  totalPages,
  year,
  onEdit,
  onDelete,
  onComment,
  onDeleteComment,
}) {
  const router = useRouter();
  const userId = useSelector((state) => state.auth.userId);
  const role = useSelector((state) => state.auth.role);
  const topScrollRef = useRef(null);
  const tableScrollRef = useRef(null);
  const TABLE_WIDTH = sidebarOpen ? 1400 : 1000;

  const handleTopScroll = () => {
    tableScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
  };
  const handleTableScroll = () => {
    topScrollRef.current.scrollLeft = tableScrollRef.current.scrollLeft;
  };

  /* Approved and disapproved GPBs are locked (the API refuses changes too);
     otherwise the API's rule applies: the creator, a GAD Focal Person or an
     Admin. Reviewers (Planning Director, SUC President) only comment. */
  const locked =
    gpbStatus?.status === "approved" || gpbStatus?.status === "disapproved";
  const canChange = (project) =>
    !locked && canManageProject({ _id: userId, role }, project);

  return (
    <div className="overflow-x-auto">
      <div>
        {budgetSummary !== null && !budgetSummary.hasBudget && (
          <div className="whitespace-pre-line rounded-xl bg-secondary-50 border border-secondary-200 px-4 py-3 text-secondary-700 mb-4">
            No GAA budget allocated for {year} yet — you can still record
            this project. Utilization will be tracked and capped
            automatically once the budget arrives.
          </div>
        )}

        {addError && (
          <div className="whitespace-pre-line rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-red-600 mb-4">
            {addError}
          </div>
        )}

        {addWarning && (
          <div className="whitespace-pre-line rounded-xl bg-secondary-50 border border-secondary-200 px-4 py-3 text-secondary-700 mb-4">
            {addWarning}
          </div>
        )}
        <div
          className="transition duration-300 w-full"
          style={{
            maxWidth: sidebarOpen
              ? "calc(100vw - 360px)"
              : "calc(100vw - 10px)",
            boxSizing: "border-box",
          }}
        >
          <div
            ref={topScrollRef}
            onScroll={handleTopScroll}
            className="overflow-x-auto"
          >
            <div
              style={{
                width: sidebarOpen ? `${TABLE_WIDTH}px` : "100%",
                height: "1px",
              }}
            />
          </div>

          <div
            ref={tableScrollRef}
            onScroll={handleTableScroll}
            className="overflow-x-auto"
          >
            <table
              className="bg-white rounded shadow"
              style={{
                minWidth: sidebarOpen ? `${TABLE_WIDTH}px` : "100%",
              }}
            >
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-900 border text-white">
                  <th className="py-2 border-b text-center w-10 text-sm">
                    No.
                  </th>
                  <th className="py-2  border-b text-center w-10 text-xs">
                    Gender Issue and/or GAD Mandate
                  </th>
                  <th className="py-2  border-b text-center w-10 text-xs">
                    Cause of the Gender Issue
                  </th>
                  <th className="py-2 border-b text-center w-10 text-xs">
                    GAD Result Statement/GAD Objective
                  </th>
                  <th className="py-2  border-b text-center w-10 text-xs">
                    Supporting Statistics Data
                  </th>
                  <th className="py-2  border-b text-center w-10 text-xs">
                    Relevant Agency MFO/PAP
                  </th>
                  <th className="py-2  border-b text-center w-10 text-xs">
                    GAD Activity
                  </th>
                  <th className="py-2  border-b text-center w-10 text-xs">
                    Output Performance Indicators and Target
                  </th>
                  <th className="py-2  border-b text-center w-10 text-xs">
                    GAD Budget
                  </th>
                  <th className="py-2  border-b text-center w-10 text-xs">
                    Source of Budget
                  </th>
                  <th className="py-2  border-b text-center w-10 text-xs">
                    Responsible Unit/Office
                  </th>
                  <th className="py-2 border-b text-center w-10 text-xs">
                    Created By
                  </th>
                  <th className="py-2 border-b text-center w-10 text-xs">
                    Comments
                  </th>
                  {role !== "planning director" && (
                    <>
                      {/* <th className="py-2 px-4 border-b text-center w-10 text-xs">
                        Number of Events
                      </th> */}
                      <th className="py-2 px-4 border-b text-center w-10 text-xs">
                        Actions
                      </th>
                    </>
                  )}
                </tr>

                
              </thead>

              <tbody>
                {paginatedProjects.map((project, idx) => {
                  const projectTypeLabel = getProjectTypeLabel(project);
                  const prevProject = paginatedProjects[idx - 1];
                  const prevTypeLabel = prevProject
                    ? getProjectTypeLabel(prevProject)
                    : null;
                  const shouldShowTypeHeader =
                    idx === 0 || prevTypeLabel !== projectTypeLabel;

                  const causeArr = Array.isArray(project.cause_gender_issue)
                    ? project.cause_gender_issue
                    : [project.cause_gender_issue || ""];

                  const objArr = Array.isArray(project.gad_objective)
                    ? project.gad_objective
                    : [project.gad_objective || ""];

                  const actArr = Array.isArray(project.gad_activity)
                    ? project.gad_activity
                    : [project.gad_activity || ""];

                  /* Index-paired with actArr — never shorter or longer. */
                  const descArr = alignActivityDescriptions(
                    actArr,
                    project.gad_activity_description,
                  );

                  const perfArr = Array.isArray(
                    project.performance_indicator_target,
                  )
                    ? project.performance_indicator_target
                    : [project.performance_indicator_target || ""];
                  const maxRows = Math.max(
                    causeArr.length,
                    objArr.length,
                    actArr.length,
                    perfArr.length,
                  );

                  const editMaxRows = maxRows;

                  return (
                    <React.Fragment key={project._id}>
                      {shouldShowTypeHeader && (
                        <tr className="bg-orange-300 border-y border-black">
                          <td
                            colSpan={role !== "planning director" ? 14 : 13}
                            className="py-2 px-4 text-sm font-semibold text-black"
                          >
                            {projectTypeLabel}
                          </td>
                        </tr>
                      )}
                      {Array.from({ length: editMaxRows }).map(
                        (_, rowIdx) => (
                          <tr
                            key={project._id + "-" + rowIdx}
                            className="hover:bg-gray-50 border"
                          >
                            {rowIdx === 0 && (
                              <>
                                <td
                                  className="py-2 px-4 border"
                                  rowSpan={editMaxRows}
                                >
                                  <div>
                                    {(page - 1) * pageSize + idx + 1}
                                  </div>
                                  {project.reference_number && (
                                    <div
                                      className="mt-1 font-mono text-2xs leading-tight text-gray-500 whitespace-nowrap"
                                      title="Project reference number"
                                    >
                                      {project.reference_number}
                                    </div>
                                  )}
                                </td>
                                {(
                                  <td
                                    className="py-2 px-4 border text-xs"
                                    rowSpan={maxRows}
                                  >
                                    {/* The normalized value: a legacy plain
                                        string has no `.value` and was blank. */}
                                    <div>{project.gender_issue}</div>
                                  </td>
                                )}
                              </>
                            )}
                            {(
                              <>
                                {/* causeArr */}
                                {causeArr.length === 1 ? (
                                  rowIdx === 0 && (
                                    <td
                                      className="py-2 px-4 border text-xs"
                                      rowSpan={maxRows}
                                    >
                                      {causeArr[0]}
                                    </td>
                                  )
                                ) : (
                                  <td className="py-2 px-4 border text-xs">
                                    {causeArr[rowIdx] || ""}
                                  </td>
                                )}

                                {objArr.length === 1 ? (
                                  rowIdx === 0 && (
                                    <td
                                      className="py-2 px-4 border text-xs"
                                      rowSpan={maxRows}
                                    >
                                      {objArr[0]}
                                    </td>
                                  )
                                ) : (
                                  <td className="py-2 px-4 border text-xs">
                                    {objArr[rowIdx] || ""}
                                  </td>
                                )}
                              </>
                            )}
                            {rowIdx === 0 && (
                              <>
                                {(
                                  <td
                                    className="py-2 px-4 border text-xs"
                                    rowSpan={maxRows}
                                  >
                                    {project.supporting_statistics_data}
                                  </td>
                                )}

                                {(
                                  <td
                                    className="py-2 px-4 border text-xs"
                                    rowSpan={maxRows}
                                  >
                                    {project.relevant_agency}
                                  </td>
                                )}
                              </>
                            )}

                            {(
                              <>
                                {actArr.length === 1 ? (
                                  rowIdx === 0 && (
                                    <td
                                      className="py-2 px-4 border text-xs"
                                      rowSpan={maxRows}
                                    >
                                      <GADActivityCell
                                        title={actArr[0]}
                                        description={descArr[0]}
                                      />
                                    </td>
                                  )
                                ) : (
                                  <td className="py-2 px-4 border text-xs">
                                    <GADActivityCell
                                      title={actArr[rowIdx]}
                                      description={descArr[rowIdx]}
                                    />
                                  </td>
                                )}

                                {perfArr.length === 1 ? (
                                  rowIdx === 0 && (
                                    <td
                                      className="py-2 px-4 border text-xs"
                                      rowSpan={maxRows}
                                    >
                                      {perfArr[0]}
                                    </td>
                                  )
                                ) : (
                                  <td className="py-2 px-4 border text-xs">
                                    {perfArr[rowIdx] || ""}
                                  </td>
                                )}
                              </>
                            )}

                            {rowIdx === 0 && (
                              <>
                                {(
                                  <td
                                    className="py-2 px-4 border text-center text-xs"
                                    rowSpan={maxRows}
                                  >
                                    {formatAmount(project.gad_budget, "—")}
                                  </td>
                                )}
                                {(
                                  <td
                                    className="py-2 px-4 border text-center text-xs"
                                    rowSpan={maxRows}
                                  >
                                    {project.source_budget}
                                  </td>
                                )}
                                {(
                                  <td
                                    className="py-2 px-4 border text-xs"
                                    rowSpan={maxRows}
                                  >
                                    {toOfficeArray(
                                      project.responsible_office,
                                    ).join(", ")}
                                  </td>
                                )}
                                {rowIdx === 0 && (
                                  <td
                                    className="py-2 px-4 border text-xs"
                                    rowSpan={maxRows}
                                  >
                                    <div className="flex items-center gap-2 w-16">
                                      <div className="min-w-0">
                                        <p className="text-xs font-medium text-gray-900 truncate">
                                          {getCreatorName(project)}
                                        </p>
                                        <p className="text-xs text-gray-500 capitalize">
                                          {getCreatorRole(project)}
                                        </p>
                                      </div>
                                    </div>
                                  </td>
                                )}
                                {rowIdx === 0 && (
                                  <td
                                    className="py-2 px-4 border text-xs"
                                    rowSpan={maxRows}
                                  >
                                    {Array.isArray(project.comments) &&
                                      project.comments.length > 0 && (
                                        <div className="flex flex-col gap-1">
                                          {project.comments.map((c) => {
                                            const tags = Array.isArray(
                                              c.fields,
                                            )
                                              ? c.fields
                                              : c.field
                                                ? [c.field]
                                                : ["general"];

                                            return (
                                              <div
                                                key={c._id}
                                                className="flex items-start gap-1 flex-wrap"
                                              >
                                                <span
                                                  className={`font-semibold text-xs ${
                                                    c.type === "revision"
                                                      ? "text-red-500"
                                                      : "text-green-600"
                                                  }`}
                                                >
                                                  {tags
                                                    .map(
                                                      (field) =>
                                                        `[${field.replace(/_/g, " ")}]`,
                                                    )
                                                    .join(", ")}
                                                  :
                                                </span>
                                                <span className="text-gray-700">
                                                  {c.message}
                                                </span>
                                                {role
                                                  ?.trim()
                                                  .toLowerCase() ===
                                                  "planning director" && (
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      onDeleteComment(
                                                        project._id,
                                                        c._id,
                                                      )
                                                    }
                                                    className="touch-target ml-1 text-red-400 hover:text-red-600 text-xs"
                                                    title="Delete comment"
                                                  >
                                                    ✕
                                                  </button>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    {role?.trim().toLowerCase() ===
                                      "planning director" && (
                                      <button
                                        type="button"
                                        onClick={() => onComment(project._id)}
                                        className="mt-1 text-secondary-500 hover:underline text-xs"
                                      >
                                        + Add Comment
                                      </button>
                                    )}
                                  </td>
                                )}
                                {role !== "planning director" && (
                                  <>
                                    {/* <td
                                      className="py-2 px-4 border text-sm"
                                      rowSpan={editMaxRows}
                                    >
                                      {Array.isArray(project.events)
                                        ? project.events.length
                                        : 0}
                                    </td> */}
                                    <td
                                      className="py-2 px-4 border text-sm"
                                      rowSpan={editMaxRows}
                                    >
                                      {(
                                        <>
                                          {role !== "planning director" && (
                                            <div className="flex flex-col items-center gap-2">
                                              <button
                                                type="button"
                                                className="px-3 py-1 bg-secondary-500 text-white rounded hover:bg-secondary-600 transition"
                                                onClick={() =>
                                                  router.push(
                                                    `/gpb/projects/${project._id}`,
                                                  )
                                                }
                                              >
                                                View
                                              </button>
                                              {canChange(project) && (
                                                  <button
                                                    type="button"
                                                    className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition"
                                                    onClick={() =>
                                                      onEdit(project)
                                                    }
                                                  >
                                                    Edit
                                                  </button>
                                                )}
                                              {canChange(project) && (
                                                  <button
                                                    type="button"
                                                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition"
                                                    onClick={() =>
                                                      onDelete(project)
                                                    }
                                                  >
                                                    Delete
                                                  </button>
                                                )}
                                                                                          </div>
                                          )}
                                        </>
                                      )}
                                    </td>
                                  </>
                                )}
                              </>
                            )}
                          </tr>
                        ),
                      )}
                    </React.Fragment>
                  );
                })}

              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 mt-6">
        <label className="text-sm gap">
          Show
          <input
            type="number"
            min={1}
            max={100}
            value={pageSizeInput}
            onChange={(e) => {
              const val = e.target.value;
              setPageSizeInput(val);
              const num = parseInt(val, 10);
              if (!isNaN(num) && num >= 1 && num <= 100) {
                setPageSize(num);
                const newTotalPages = Math.max(
                  1,
                  Math.ceil(projectCount / num),
                );
                if (page > newTotalPages) setPage(newTotalPages);
              }
            }}
            className="w-16 border rounded px-2 py-1 mx-2"
          />
          per page
        </label>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              className="px-3 py-1 rounded bg-gray-400 hover:bg-gray-500 disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </button>
            <button
              className="px-3 py-1 rounded bg-gray-400 hover:bg-gray-500 disabled:opacity-50"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
