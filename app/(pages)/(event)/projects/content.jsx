"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function formatPerformanceIndicator({ totalSeminars, totalMale, totalFemale }) {
  const s = Number(totalSeminars) || 0;
  const m = Number(totalMale) || 0;
  const f = Number(totalFemale) || 0;
  const total = m + f;
  const hasSeminars = s > 0;
  const hasParticipants = total > 0;

  if (hasSeminars && hasParticipants) {
    return `At least ${s} training session${s !== 1 ? "s" : ""} conducted with ${total} participants (${f} Female, ${m} Male)`;
  } else if (hasSeminars && !hasParticipants) {
    return `No. of seminars conducted - at least ${s}`;
  } else if (!hasSeminars && hasParticipants) {
    return `At least ${total} participants trained. (${f} Female, ${m} Male)`;
  }
  return "";
}

function parsePerformanceIndicator(str) {
  if (!str || typeof str !== "string") return emptyIndicator();

  const bothMatch = str.match(
    /At least (\d+) training sessions? conducted with \d+ participants \((\d+) Female, (\d+) Male\)/,
  );
  if (bothMatch) {
    return {
      totalSeminars: bothMatch[1],
      totalFemale: bothMatch[2],
      totalMale: bothMatch[3],
    };
  }

  const seminarsOnly = str.match(/No\. of seminars conducted - at least (\d+)/);
  if (seminarsOnly) {
    return { totalSeminars: seminarsOnly[1], totalMale: "", totalFemale: "" };
  }

  const participantsOnly = str.match(
    /At least \d+ participants trained\. \((\d+) Female, (\d+) Male\)/,
  );
  if (participantsOnly) {
    return {
      totalSeminars: "",
      totalFemale: participantsOnly[1],
      totalMale: participantsOnly[2],
    };
  }

  return { _raw: str };
}

function emptyIndicator() {
  return { totalSeminars: "", totalMale: "", totalFemale: "" };
}

function serializeIndicators(arr) {
  return (arr || [])
    .map((p) => {
      if (typeof p === "string") return p;
      if (p?._raw !== undefined) return p._raw;
      return formatPerformanceIndicator(p);
    })
    .filter(Boolean);
}

function PerformanceIndicatorInput({ value, onChange }) {
  const v =
    typeof value === "object" && value !== null && !value._raw
      ? value
      : emptyIndicator();

  const preview = formatPerformanceIndicator(v);

  return (
    <div className="flex flex-col gap-1 w-44">
      <div className="flex gap-1">
        <div className="flex flex-col flex-1">
          <label className="text-xs text-gray-400">Seminars</label>
          <input
            type="number"
            min={0}
            className="border rounded px-1 py-0.5 w-full text-sm"
            value={v.totalSeminars}
            onChange={(e) => onChange({ ...v, totalSeminars: e.target.value })}
            placeholder="0"
          />
        </div>
        <div className="flex flex-col flex-1">
          <label className="text-xs text-gray-400">Male</label>
          <input
            type="number"
            min={0}
            className="border rounded px-1 py-0.5 w-full text-sm"
            value={v.totalMale}
            onChange={(e) => onChange({ ...v, totalMale: e.target.value })}
            placeholder="0"
          />
        </div>
        <div className="flex flex-col flex-1">
          <label className="text-xs text-gray-400">Female</label>
          <input
            type="number"
            min={0}
            className="border rounded px-1 py-0.5 w-full text-sm"
            value={v.totalFemale}
            onChange={(e) => onChange({ ...v, totalFemale: e.target.value })}
            placeholder="0"
          />
        </div>
      </div>
      {preview && (
        <div className="text-xs text-blue-600 bg-blue-50 rounded px-2 py-1 mt-1 italic">
          {preview}
        </div>
      )}
    </div>
  );
}

export default function ProjectContent() {
  const emptyNewProject = () => ({
    year: new Date().getFullYear(),
    gender_issue: "",
    cause_gender_issue: [""],
    gad_objective: [""],
    supporting_statistics_data: "",
    relevant_agency: "",
    gad_activity: [""],
    performance_indicator_target: [emptyIndicator()],
    gad_budget: "",
    source_budget: "",
    responsible_office: "",
  });

  const [newProject, setNewProject] = useState(emptyNewProject());
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    project: null,
  });
  const [editingId, setEditingId] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pageSizeInput, setPageSizeInput] = useState("10");
  const [annualBudget, setAnnualBudget] = useState(null);
  const [totalGAA, setTotalGAA] = useState(null);
  const [remainingBudget, setRemainingBudget] = useState(null);
  const [usedBudget, setUsedBudget] = useState(0);
  const [budgetYear, setBudgetYear] = useState(() => new Date().getFullYear());
  const router = useRouter();

  const safeProjects = Array.isArray(projects) ? projects : [];
  const totalPages = Math.max(1, Math.ceil(safeProjects.length / pageSize));
  const paginatedProjects = safeProjects.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  const getDefaultYear = () => {
    if (projects.length > 0) {
      const yearCounts = projects.reduce((acc, p) => {
        const y = Number(p.year) || new Date().getFullYear();
        acc[y] = (acc[y] || 0) + 1;
        return acc;
      }, {});
      return Number(
        Object.entries(yearCounts).sort((a, b) => b[1] - a[1])[0][0],
      );
    }
    return new Date().getFullYear();
  };

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/project");
      const data = await res.json();
      setProjects(data.data || []);
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);
  useEffect(() => {
    setNewProject((prev) => ({ ...prev, year: getDefaultYear() }));
  }, [projects]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
    setPageSizeInput(String(pageSize));
  }, [page, totalPages, pageSize]);
  // useEffect(() => {
  //   if (projects.length > 0) {
  //     const yearCounts = projects.reduce((acc, p) => {
  //       const y = Number(p.year) || new Date().getFullYear();
  //       acc[y] = (acc[y] || 0) + 1;
  //       return acc;
  //     }, {});
  //     setBudgetYear(
  //       Number(Object.entries(yearCounts).sort((a, b) => b[1] - a[1])[0][0]),
  //     );
  //   }
  // }, [projects]);
  useEffect(() => {
    if (!budgetYear) return;
    fetch(`/api/gaa-budget?year=${budgetYear}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data.length > 0) {
          setAnnualBudget(data.data[0].gadAnnualBudget);
          setTotalGAA(data.data[0].totalGAA);
        } else {
          setAnnualBudget(null);
        }
      });
  }, [budgetYear]);
  useEffect(() => {
    if (annualBudget !== null) {
      const used = projects
        .filter((p) => Number(p.year) === Number(budgetYear))
        .reduce((sum, p) => sum + (Number(p.gad_budget) || 0), 0);

      setUsedBudget(used);
      setRemainingBudget(annualBudget - used);
    } else {
      setRemainingBudget(null);
      setUsedBudget(0);
    }
  }, [annualBudget, projects, budgetYear]);

  const handleNewProjectChange = (field, value) =>
    setNewProject((prev) => ({ ...prev, [field]: value }));

  const handleArrayFieldChange = (field, idx, value) =>
    setNewProject((prev) => {
      const arr = Array.isArray(prev[field]) ? [...prev[field]] : [""];
      arr[idx] = value;
      return { ...prev, [field]: arr };
    });

  const handleAddArrayField = (field) =>
    setNewProject((prev) => {
      const arr = Array.isArray(prev[field]) ? [...prev[field]] : [""];
      arr.push(
        field === "performance_indicator_target" ? emptyIndicator() : "",
      );
      return { ...prev, [field]: arr };
    });

  const handleRemoveArrayField = (field, idx) =>
    setNewProject((prev) => {
      const arr = Array.isArray(prev[field]) ? [...prev[field]] : [""];
      if (arr.length > 1) arr.splice(idx, 1);
      return { ...prev, [field]: arr };
    });

  const startEdit = (project) => {
    setEditingId(project._id);
    setEditRow({
      ...project,
      performance_indicator_target: (
        project.performance_indicator_target || [""]
      ).map((p) => (typeof p === "string" ? parsePerformanceIndicator(p) : p)),
    });
    setEditError("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditRow(null);
    setEditError("");
  };

  const handleEditRowChange = (field, value) =>
    setEditRow((prev) => ({ ...prev, [field]: value }));

  const handleEditIndicatorChange = (idx, value) => {
    const arr = [...(editRow.performance_indicator_target || [])];
    arr[idx] = value;
    handleEditRowChange("performance_indicator_target", arr);
  };

  const handleAddEditIndicator = () => {
    const arr = [...(editRow.performance_indicator_target || [])];
    arr.push(emptyIndicator());
    handleEditRowChange("performance_indicator_target", arr);
  };

  const handleRemoveEditIndicator = (idx) => {
    const arr = [...(editRow.performance_indicator_target || [])];
    if (arr.length > 1) arr.splice(idx, 1);
    handleEditRowChange("performance_indicator_target", arr);
  };

  const handleAddProject = async (e) => {
    e.preventDefault();
    setAddLoading(true);
    setAddError("");
    try {
      const payload = {
        ...newProject,
        performance_indicator_target: serializeIndicators(
          newProject.performance_indicator_target,
        ),
      };
      const res = await fetch("/api/project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setNewProject(emptyNewProject());
        fetchProjects();
      } else {
        setAddError(data.error || "Failed to add project");
      }
    } catch {
      setAddError("Network error");
    } finally {
      setAddLoading(false);
    }
  };

  const saveEdit = async () => {
    if (!editRow) return;
    setEditLoading(true);
    setEditError("");
    try {
      const payload = {
        ...editRow,
        performance_indicator_target: serializeIndicators(
          editRow.performance_indicator_target,
        ),
      };
      const res = await fetch(`/api/project/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setEditingId(null);
        setEditRow(null);
        fetchProjects();
      } else {
        setEditError(data.error || "Failed to update project");
      }
    } catch {
      setEditError("Network error");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (projectId) => {
    try {
      const res = await fetch(`/api/project/${projectId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDeleteModal({ open: false, project: null });
        fetchProjects();
      }
    } catch {}
  };

  const handlePrintProjects = () => {
    const year = budgetYear;
    let totalGAAFormatted = "";
    if (typeof totalGAA === "number" && !isNaN(totalGAA)) {
      totalGAAFormatted = totalGAA.toLocaleString(undefined, {
        minimumFractionDigits: 2,
      });
    } else if (typeof totalGAA === "string" && !isNaN(Number(totalGAA))) {
      totalGAAFormatted = Number(totalGAA).toLocaleString(undefined, {
        minimumFractionDigits: 2,
      });
    }

    const html = `
      <html><head><title>Projects List</title>
      <style>
        body { font-family: Arial, sans-serif; }
        table { border-collapse: collapse; width: 100%; margin-top: 10px; }
        th, td { border: 1px solid #333; padding: 8px; text-align: left; }
        th { background: #f2f2f2; }
        .gad-report-header { text-align: center; }
        .gad-report-header h4, .agency h4 { margin: 0; }
      </style></head><body>
      <div class="gad-report-header">
        <h4>ANNUAL GENDER AND DEVELOPMENT (GAD) PLAN AND BUDGET</h4>
        <h4>FY ${year}</h4>
      </div>
      <div class="agency">
        <h4><span style="font-weight:200;">Agency/Bureau/Office:</span> Marinduque State University</h4>
        <h4><span style="font-weight:200;">Total GAA of Agency:</span> ${totalGAAFormatted}</h4>
      </div>
      <table>
        <thead><tr>
          <th>No.</th><th>Gender Issue and/or GAD Mandate</th>
          <th>Cause of the Gender Issue</th><th>GAD Result Statement/GAD Objective</th>
          <th>Supporting Statistics Data</th><th>Relevant Agency MFO/PAP</th>
          <th>GAD Activity</th><th>Output Performance Indicators and Target</th>
          <th>GAD Budget</th><th>Source of Budget</th><th>Responsible Unit/Office</th>
        </tr></thead>
        <tbody>
          ${projects
            .map((project, idx) => {
              const causeArr = Array.isArray(project.cause_gender_issue)
                ? project.cause_gender_issue
                : [project.cause_gender_issue || ""];
              const objArr = Array.isArray(project.gad_objective)
                ? project.gad_objective
                : [project.gad_objective || ""];
              const actArr = Array.isArray(project.gad_activity)
                ? project.gad_activity
                : [project.gad_activity || ""];
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
              let gadBudgetFormatted = "";
              if (
                !isNaN(Number(project.gad_budget)) &&
                project.gad_budget !== ""
              ) {
                gadBudgetFormatted = Number(project.gad_budget).toLocaleString(
                  undefined,
                  { minimumFractionDigits: 2 },
                );
              }
              return Array.from({ length: maxRows })
                .map(
                  (_, rowIdx) => `
              <tr>
    ${rowIdx === 0 ? `<td rowspan="${maxRows}">${idx + 1}</td>` : ""}
    ${rowIdx === 0 ? `<td rowspan="${maxRows}">${project.gender_issue || ""}</td>` : ""}

    ${
      causeArr.length === 1
        ? rowIdx === 0
          ? `<td rowspan="${maxRows}">${causeArr[0]}</td>`
          : ""
        : `<td>${causeArr[rowIdx] || ""}</td>`
    }


    ${
      objArr.length === 1
        ? rowIdx === 0
          ? `<td rowspan="${maxRows}">${objArr[0]}</td>`
          : ""
        : `<td>${objArr[rowIdx] || ""}</td>`
    }

    ${rowIdx === 0 ? `<td rowspan="${maxRows}">${project.supporting_statistics_data || ""}</td>` : ""}
    ${rowIdx === 0 ? `<td rowspan="${maxRows}">${project.relevant_agency || ""}</td>` : ""}

   
    ${
      actArr.length === 1
        ? rowIdx === 0
          ? `<td rowspan="${maxRows}">${actArr[0]}</td>`
          : ""
        : `<td>${actArr[rowIdx] || ""}</td>`
    }


    ${
      perfArr.length === 1
        ? rowIdx === 0
          ? `<td rowspan="${maxRows}">${perfArr[0]}</td>`
          : ""
        : `<td>${perfArr[rowIdx] || ""}</td>`
    }

    ${rowIdx === 0 ? `<td rowspan="${maxRows}">${gadBudgetFormatted}</td>` : ""}
    ${rowIdx === 0 ? `<td rowspan="${maxRows}">${project.source_budget || ""}</td>` : ""}
    ${rowIdx === 0 ? `<td rowspan="${maxRows}">${project.responsible_office || ""}</td>` : ""}
  </tr>`,
                )
                .join("");
            })
            .join("")}
        </tbody>
      </table></body></html>`;

    const iframe = document.createElement("iframe");
    Object.assign(iframe.style, {
      position: "fixed",
      right: "0",
      bottom: "0",
      width: "0",
      height: "0",
      border: "0",
    });
    document.body.appendChild(iframe);
    const frameDoc = iframe.contentWindow?.document;
    if (!frameDoc) return;
    frameDoc.open();
    frameDoc.write(html);
    frameDoc.close();
    iframe.onload = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    };
  };

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold mb-4">Projects</h2>
      <button
        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded transition mb-2"
        onClick={handlePrintProjects}
        disabled={totalGAA === null || typeof totalGAA === "undefined"}
      >
        Print Projects
      </button>

      {annualBudget !== null && (
        <div className="mb-2 text-md font-bold">
          Total GAD Budget for {budgetYear}: ₱{" "}
          <span className="text-red-600">
            {annualBudget.toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </span>
        </div>
      )}

      {usedBudget !== null && (
        <div className="mb-2 text-md font-bold">
          Total GAD Allocation Used for {budgetYear}: ₱{" "}
          <span className="text-red-600">
            {usedBudget.toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </span>
        </div>
      )}

      {remainingBudget !== null && (
        <div className="mb-4 text-md font-bold">
          Remaining GAD Budget for {budgetYear}: ₱{" "}
          <span className="text-red-600">
            {remainingBudget.toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </span>
        </div>
      )}

      {deleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md relative">
            <button
              className="absolute top-2 right-3 text-gray-500 hover:text-gray-700 text-4xl"
              onClick={() => setDeleteModal({ open: false, project: null })}
            >
              &times;
            </button>
            <h3 className="text-xl font-bold mb-4">Delete Project</h3>
            <p>Are you sure you want to delete this project?</p>
            <div className="flex justify-end gap-2 mt-6">
              <button
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                onClick={() => setDeleteModal({ open: false, project: null })}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                onClick={() => handleDelete(deleteModal.project._id)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div>Loading projects...</div>
      ) : (
        <div className="overflow-x-auto">
          <form onSubmit={handleAddProject}>
            <table className="min-w-full bg-white rounded shadow">
              <thead>
                <tr className="bg-gray-900 border text-white">
                  <th className="py-2 px-4 border-b text-center">No.</th>
                  <th className="py-2 px-4 border-b text-center">
                    Gender Issue and/or GAD Mandate
                  </th>
                  <th className="py-2 px-4 border-b text-center">
                    Cause of the Gender Issue
                  </th>
                  <th className="py-2 px-4 border-b text-center">
                    GAD Result Statement/GAD Objective
                  </th>
                  <th className="py-2 px-4 border-b text-center">
                    Supporting Statistics Data
                  </th>
                  <th className="py-2 px-4 border-b text-center">
                    Relevant Agency MFO/PAP
                  </th>
                  <th className="py-2 px-4 border-b text-center">
                    GAD Activity
                  </th>
                  <th className="py-2 px-4 border-b text-center">
                    Output Performance Indicators and Target
                  </th>
                  <th className="py-2 px-4 border-b text-center">GAD Budget</th>
                  <th className="py-2 px-4 border-b text-center">
                    Source of Budget
                  </th>
                  <th className="py-2 px-4 border-b text-center">
                    Responsible Unit/Office
                  </th>
                  <th className="py-2 px-4 border-b text-center">
                    Number of Events
                  </th>
                  <th className="py-2 px-4 border-b text-center">Actions</th>
                </tr>

                {/* ── ADD ROW ── */}
                <tr className="bg-gray-100">
                  <td className="py-2 px-4 border-b text-center">—</td>
                  <td className="py-2 px-4 border-b">
                    <textarea
                      className="w-40 border rounded px-2 py-1"
                      value={newProject.gender_issue}
                      onChange={(e) =>
                        handleNewProjectChange("gender_issue", e.target.value)
                      }
                      required
                    />
                  </td>
                  <td className="py-2 px-4 border-b">
                    {newProject.cause_gender_issue.map((val, idx) => (
                      <div key={idx} className="flex items-center mb-1">
                        <textarea
                          className="w-40 border rounded px-2 py-1"
                          value={val}
                          onChange={(e) =>
                            handleArrayFieldChange(
                              "cause_gender_issue",
                              idx,
                              e.target.value,
                            )
                          }
                          required
                        />
                        {newProject.cause_gender_issue.length > 1 && (
                          <button
                            type="button"
                            className="ml-1 px-2 py-1 bg-red-500 text-white rounded"
                            onClick={() =>
                              handleRemoveArrayField("cause_gender_issue", idx)
                            }
                          >
                            -
                          </button>
                        )}
                        {idx === newProject.cause_gender_issue.length - 1 && (
                          <button
                            type="button"
                            className="ml-1 px-2 py-1 bg-green-500 text-white rounded"
                            onClick={() =>
                              handleAddArrayField("cause_gender_issue")
                            }
                          >
                            +
                          </button>
                        )}
                      </div>
                    ))}
                  </td>
                  <td className="py-2 px-4 border-b">
                    {newProject.gad_objective.map((val, idx) => (
                      <div key={idx} className="flex items-center mb-1">
                        <textarea
                          className="w-40 border rounded px-2 py-1"
                          value={val}
                          onChange={(e) =>
                            handleArrayFieldChange(
                              "gad_objective",
                              idx,
                              e.target.value,
                            )
                          }
                          required
                        />
                        {newProject.gad_objective.length > 1 && (
                          <button
                            type="button"
                            className="ml-1 px-2 py-1 bg-red-500 text-white rounded"
                            onClick={() =>
                              handleRemoveArrayField("gad_objective", idx)
                            }
                          >
                            -
                          </button>
                        )}
                        {idx === newProject.gad_objective.length - 1 && (
                          <button
                            type="button"
                            className="ml-1 px-2 py-1 bg-green-500 text-white rounded"
                            onClick={() => handleAddArrayField("gad_objective")}
                          >
                            +
                          </button>
                        )}
                      </div>
                    ))}
                  </td>
                  <td className="py-2 px-4 border-b">
                    <textarea
                      className="w-40 border rounded px-2 py-1"
                      value={newProject.supporting_statistics_data}
                      onChange={(e) =>
                        handleNewProjectChange(
                          "supporting_statistics_data",
                          e.target.value,
                        )
                      }
                    />
                  </td>
                  <td className="py-2 px-4 border-b">
                    <textarea
                      className="w-40 border rounded px-2 py-1"
                      value={newProject.relevant_agency}
                      onChange={(e) =>
                        handleNewProjectChange(
                          "relevant_agency",
                          e.target.value,
                        )
                      }
                      required
                    />
                  </td>
                  <td className="py-2 px-4 border-b">
                    {newProject.gad_activity.map((val, idx) => (
                      <div key={idx} className="flex items-center mb-1">
                        <textarea
                          className="w-40 border rounded px-2 py-1"
                          value={val}
                          onChange={(e) =>
                            handleArrayFieldChange(
                              "gad_activity",
                              idx,
                              e.target.value,
                            )
                          }
                          required
                        />
                        {newProject.gad_activity.length > 1 && (
                          <button
                            type="button"
                            className="ml-1 px-2 py-1 bg-red-500 text-white rounded"
                            onClick={() =>
                              handleRemoveArrayField("gad_activity", idx)
                            }
                          >
                            -
                          </button>
                        )}
                        {idx === newProject.gad_activity.length - 1 && (
                          <button
                            type="button"
                            className="ml-1 px-2 py-1 bg-green-500 text-white rounded"
                            onClick={() => handleAddArrayField("gad_activity")}
                          >
                            +
                          </button>
                        )}
                      </div>
                    ))}
                  </td>
                  <td className="py-2 px-4 border-b">
                    {newProject.performance_indicator_target.map((val, idx) => (
                      <div key={idx} className="flex items-start gap-1 mb-2">
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
                        <div className="flex flex-col gap-1 mt-4">
                          {newProject.performance_indicator_target.length >
                            1 && (
                            <button
                              type="button"
                              className="px-2 py-1 bg-red-500 text-white rounded text-xs"
                              onClick={() =>
                                handleRemoveArrayField(
                                  "performance_indicator_target",
                                  idx,
                                )
                              }
                            >
                              -
                            </button>
                          )}
                          {idx ===
                            newProject.performance_indicator_target.length -
                              1 && (
                            <button
                              type="button"
                              className="px-2 py-1 bg-green-500 text-white rounded text-xs"
                              onClick={() =>
                                handleAddArrayField(
                                  "performance_indicator_target",
                                )
                              }
                            >
                              +
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </td>
                  <td className="py-2 px-4 border-b">
                    <textarea
                      className="w-32 border rounded px-2 py-1"
                      value={newProject.gad_budget}
                      onChange={(e) =>
                        handleNewProjectChange("gad_budget", e.target.value)
                      }
                      required
                    />
                  </td>
                  <td className="py-2 px-4 border-b">
                    <textarea
                      className="w-32 border rounded px-2 py-1"
                      value={newProject.source_budget}
                      onChange={(e) =>
                        handleNewProjectChange("source_budget", e.target.value)
                      }
                      required
                    />
                  </td>
                  <td className="py-2 px-4 border-b">
                    <textarea
                      className="w-40 border rounded px-2 py-1"
                      value={newProject.responsible_office}
                      onChange={(e) =>
                        handleNewProjectChange(
                          "responsible_office",
                          e.target.value,
                        )
                      }
                      required
                    />
                  </td>
                  <td className="py-2 px-4 border-b text-center">—</td>
                  <td className="py-2 px-4 border-b">
                    <button
                      type="submit"
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                      disabled={addLoading}
                    >
                      {addLoading ? "Adding..." : "Add"}
                    </button>
                  </td>
                </tr>
              </thead>

              <tbody>
                {addError && (
                  <tr>
                    <td colSpan={13} className="text-red-500 text-sm px-4 py-2">
                      {addError}
                    </td>
                  </tr>
                )}

                {paginatedProjects.map((project, idx) => {
                  const causeArr = Array.isArray(project.cause_gender_issue)
                    ? project.cause_gender_issue
                    : [project.cause_gender_issue || ""];
                  const objArr = Array.isArray(project.gad_objective)
                    ? project.gad_objective
                    : [project.gad_objective || ""];
                  const actArr = Array.isArray(project.gad_activity)
                    ? project.gad_activity
                    : [project.gad_activity || ""];
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

                  const editCauseArr =
                    editingId === project._id &&
                    Array.isArray(editRow?.cause_gender_issue)
                      ? editRow.cause_gender_issue
                      : causeArr;
                  const editObjArr =
                    editingId === project._id &&
                    Array.isArray(editRow?.gad_objective)
                      ? editRow.gad_objective
                      : objArr;
                  const editActArr =
                    editingId === project._id &&
                    Array.isArray(editRow?.gad_activity)
                      ? editRow.gad_activity
                      : actArr;
                  const editPerfArr =
                    editingId === project._id &&
                    Array.isArray(editRow?.performance_indicator_target)
                      ? editRow.performance_indicator_target
                      : perfArr;
                  const editMaxRows =
                    editingId === project._id
                      ? Math.max(
                          editCauseArr.length,
                          editObjArr.length,
                          editActArr.length,
                          editPerfArr.length,
                        )
                      : maxRows;

                  return Array.from({ length: editMaxRows }).map(
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
                              {(page - 1) * pageSize + idx + 1}
                            </td>
                            {editingId === project._id ? (
                              <td
                                className="py-2 px-4 border"
                                rowSpan={editMaxRows}
                              >
                                <textarea
                                  className="w-40 border rounded px-2 py-1"
                                  value={editRow.gender_issue}
                                  onChange={(e) =>
                                    handleEditRowChange(
                                      "gender_issue",
                                      e.target.value,
                                    )
                                  }
                                  required
                                />
                              </td>
                            ) : (
                              <td
                                className="py-2 px-4 border"
                                rowSpan={maxRows}
                              >
                                {project.gender_issue}
                              </td>
                            )}
                          </>
                        )}
                        {editingId === project._id ? (
                          <>
                            {editCauseArr.length === 1
                              ? rowIdx === 0 && (
                                  <td
                                    className="py-2 px-4 border"
                                    rowSpan={editMaxRows}
                                  >
                                    <div className="flex items-center gap-1">
                                      <textarea
                                        className="w-40 border rounded px-2 py-1"
                                        value={editCauseArr[0] || ""}
                                        onChange={(e) =>
                                          handleEditRowChange(
                                            "cause_gender_issue",
                                            [e.target.value],
                                          )
                                        }
                                      />
                                      <div className="flex flex-col gap-1">
                                        {editCauseArr.length > 1 && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleEditRowChange(
                                                "cause_gender_issue",
                                                [""],
                                              )
                                            }
                                          >
                                            -
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          className="px-2 py-1 bg-green-500 text-white rounded text-xs"
                                          onClick={() =>
                                            handleEditRowChange(
                                              "cause_gender_issue",
                                              [...editCauseArr, ""],
                                            )
                                          }
                                        >
                                          +
                                        </button>
                                      </div>
                                    </div>
                                  </td>
                                )
                              : rowIdx < editCauseArr.length && (
                                  <td className="py-2 px-4 border">
                                    <div className="flex items-center gap-1">
                                      <textarea
                                        className="w-40 border rounded px-2 py-1"
                                        value={editCauseArr[rowIdx] || ""}
                                        onChange={(e) => {
                                          const arr = [...editCauseArr];
                                          arr[rowIdx] = e.target.value;
                                          handleEditRowChange(
                                            "cause_gender_issue",
                                            arr,
                                          );
                                        }}
                                      />
                                      <div className="flex flex-col gap-1">
                                        {editCauseArr.length > 1 && (
                                          <button
                                            type="button"
                                            className="px-2 py-1 bg-red-500 text-white rounded text-xs"
                                            onClick={() => {
                                              const arr = [...editCauseArr];
                                              arr.splice(rowIdx, 1);
                                              handleEditRowChange(
                                                "cause_gender_issue",
                                                arr,
                                              );
                                            }}
                                          >
                                            -
                                          </button>
                                        )}
                                        {rowIdx === editCauseArr.length - 1 && (
                                          <button
                                            type="button"
                                            className="px-2 py-1 bg-green-500 text-white rounded text-xs"
                                            onClick={() =>
                                              handleEditRowChange(
                                                "cause_gender_issue",
                                                [...editCauseArr, ""],
                                              )
                                            }
                                          >
                                            +
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                )}

                            {editObjArr.length === 1
                              ? rowIdx === 0 && (
                                  <td
                                    className="py-2 px-4 border"
                                    rowSpan={editMaxRows}
                                  >
                                    <div className="flex items-center gap-1">
                                      <textarea
                                        className="w-40 border rounded px-2 py-1"
                                        value={editObjArr[0] || ""}
                                        onChange={(e) =>
                                          handleEditRowChange("gad_objective", [
                                            e.target.value,
                                          ])
                                        }
                                      />
                                      <div className="flex flex-col gap-1">
                                        {editObjArr.length > 1 && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleEditRowChange(
                                                "gad_objective",
                                                [""],
                                              )
                                            }
                                          >
                                            -
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          className="px-2 py-1 bg-green-500 text-white rounded text-xs"
                                          onClick={() =>
                                            handleEditRowChange(
                                              "gad_objective",
                                              [...editObjArr, ""],
                                            )
                                          }
                                        >
                                          +
                                        </button>
                                      </div>
                                    </div>
                                  </td>
                                )
                              : rowIdx < editObjArr.length && (
                                  <td className="py-2 px-4 border">
                                    <div className="flex items-center gap-1">
                                      <textarea
                                        className="w-40 border rounded px-2 py-1"
                                        value={editObjArr[rowIdx] || ""}
                                        onChange={(e) => {
                                          const arr = [...editObjArr];
                                          arr[rowIdx] = e.target.value;
                                          handleEditRowChange(
                                            "gad_objective",
                                            arr,
                                          );
                                        }}
                                      />
                                      <div className="flex flex-col gap-1">
                                        {editObjArr.length > 1 && (
                                          <button
                                            type="button"
                                            className="px-2 py-1 bg-red-500 text-white rounded text-xs"
                                            onClick={() => {
                                              const arr = [...editObjArr];
                                              arr.splice(rowIdx, 1);
                                              handleEditRowChange(
                                                "gad_objective",
                                                arr,
                                              );
                                            }}
                                          >
                                            -
                                          </button>
                                        )}
                                        {rowIdx === editObjArr.length - 1 && (
                                          <button
                                            type="button"
                                            className="px-2 py-1 bg-green-500 text-white rounded text-xs"
                                            onClick={() =>
                                              handleEditRowChange(
                                                "gad_objective",
                                                [...editObjArr, ""],
                                              )
                                            }
                                          >
                                            +
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                )}
                          </>
                        ) : (
                          <>
                            {causeArr.length === 1 ? (
                              rowIdx === 0 && (
                                <td
                                  className="py-2 px-4 border"
                                  rowSpan={maxRows}
                                >
                                  {causeArr[0]}
                                </td>
                              )
                            ) : (
                              <td className="py-2 px-4 border">
                                {causeArr[rowIdx] || ""}
                              </td>
                            )}

                            {/* OBJECTIVE */}
                            {objArr.length === 1 ? (
                              rowIdx === 0 && (
                                <td
                                  className="py-2 px-4 border"
                                  rowSpan={maxRows}
                                >
                                  {objArr[0]}
                                </td>
                              )
                            ) : (
                              <td className="py-2 px-4 border">
                                {objArr[rowIdx] || ""}
                              </td>
                            )}
                          </>
                        )}

                        {rowIdx === 0 && (
                          <>
                            {editingId === project._id ? (
                              <td
                                className="py-2 px-4 border"
                                rowSpan={editMaxRows}
                              >
                                <textarea
                                  className="w-40 border rounded px-2 py-1"
                                  value={editRow.supporting_statistics_data}
                                  onChange={(e) =>
                                    handleEditRowChange(
                                      "supporting_statistics_data",
                                      e.target.value,
                                    )
                                  }
                                />
                              </td>
                            ) : (
                              <td
                                className="py-2 px-4 border"
                                rowSpan={maxRows}
                              >
                                {project.supporting_statistics_data}
                              </td>
                            )}
                            {editingId === project._id ? (
                              <td
                                className="py-2 px-4 border"
                                rowSpan={editMaxRows}
                              >
                                <textarea
                                  className="w-40 border rounded px-2 py-1"
                                  value={editRow.relevant_agency}
                                  onChange={(e) =>
                                    handleEditRowChange(
                                      "relevant_agency",
                                      e.target.value,
                                    )
                                  }
                                  required
                                />
                              </td>
                            ) : (
                              <td
                                className="py-2 px-4 border"
                                rowSpan={maxRows}
                              >
                                {project.relevant_agency}
                              </td>
                            )}
                          </>
                        )}

                        {editingId === project._id ? (
                          <>
                            {editActArr.length === 1
                              ? rowIdx === 0 && (
                                  <td
                                    className="py-2 px-4 border"
                                    rowSpan={editMaxRows}
                                  >
                                    <div className="flex items-center gap-1">
                                      <textarea
                                        className="w-40 border rounded px-2 py-1"
                                        value={editActArr[0] || ""}
                                        onChange={(e) =>
                                          handleEditRowChange("gad_activity", [
                                            e.target.value,
                                          ])
                                        }
                                      />
                                      <div className="flex flex-col gap-1">
                                        {editActArr.length > 1 && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleEditRowChange(
                                                "gad_activity",
                                                [""],
                                              )
                                            }
                                          >
                                            -
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          className="px-2 py-1 bg-green-500 text-white rounded text-xs"
                                          onClick={() =>
                                            handleEditRowChange(
                                              "gad_activity",
                                              [...editActArr, ""],
                                            )
                                          }
                                        >
                                          +
                                        </button>
                                      </div>
                                    </div>
                                  </td>
                                )
                              : rowIdx < editActArr.length && (
                                  <td className="py-2 px-4 border">
                                    <div className="flex items-center gap-1">
                                      <textarea
                                        className="w-40 border rounded px-2 py-1"
                                        value={editActArr[rowIdx] || ""}
                                        onChange={(e) => {
                                          const arr = [...editActArr];
                                          arr[rowIdx] = e.target.value;
                                          handleEditRowChange(
                                            "gad_activity",
                                            arr,
                                          );
                                        }}
                                      />
                                      <div className="flex flex-col gap-1">
                                        {editActArr.length > 1 && (
                                          <button
                                            type="button"
                                            className="px-2 py-1 bg-red-500 text-white rounded text-xs"
                                            onClick={() => {
                                              const arr = [...editActArr];
                                              arr.splice(rowIdx, 1);
                                              handleEditRowChange(
                                                "gad_activity",
                                                arr,
                                              );
                                            }}
                                          >
                                            -
                                          </button>
                                        )}
                                        {rowIdx === editActArr.length - 1 && (
                                          <button
                                            type="button"
                                            className="px-2 py-1 bg-green-500 text-white rounded text-xs"
                                            onClick={() =>
                                              handleEditRowChange(
                                                "gad_activity",
                                                [...editActArr, ""],
                                              )
                                            }
                                          >
                                            +
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                )}

                            {editPerfArr.length === 1
                              ? rowIdx === 0 && (
                                  <td
                                    className="py-2 px-4 border"
                                    rowSpan={editMaxRows}
                                  >
                                    <div className="flex items-start gap-1">
                                      {editPerfArr[0]?._raw !== undefined ? (
                                        <textarea
                                          className="w-40 border rounded px-2 py-1"
                                          value={editPerfArr[0]._raw}
                                          onChange={(e) =>
                                            handleEditIndicatorChange(0, {
                                              _raw: e.target.value,
                                            })
                                          }
                                        />
                                      ) : (
                                        <PerformanceIndicatorInput
                                          value={editPerfArr[0]}
                                          onChange={(updated) =>
                                            handleEditIndicatorChange(
                                              0,
                                              updated,
                                            )
                                          }
                                        />
                                      )}
                                      <div className="flex flex-col gap-1 mt-4">
                                        {editPerfArr.length > 1 && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleRemoveEditIndicator(0)
                                            }
                                          >
                                            -
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          className="px-2 py-1 bg-green-500 text-white rounded text-xs"
                                          onClick={handleAddEditIndicator}
                                        >
                                          +
                                        </button>
                                      </div>
                                    </div>
                                  </td>
                                )
                              : rowIdx < editPerfArr.length && (
                                  <td className="py-2 px-4 border">
                                    <div className="flex items-start gap-1">
                                      {editPerfArr[rowIdx]?._raw !==
                                      undefined ? (
                                        <textarea
                                          className="w-40 border rounded px-2 py-1"
                                          value={editPerfArr[rowIdx]._raw}
                                          onChange={(e) =>
                                            handleEditIndicatorChange(rowIdx, {
                                              _raw: e.target.value,
                                            })
                                          }
                                        />
                                      ) : (
                                        <PerformanceIndicatorInput
                                          value={editPerfArr[rowIdx]}
                                          onChange={(updated) =>
                                            handleEditIndicatorChange(
                                              rowIdx,
                                              updated,
                                            )
                                          }
                                        />
                                      )}
                                      <div className="flex flex-col gap-1 mt-4">
                                        {editPerfArr.length > 1 && (
                                          <button
                                            type="button"
                                            className="px-2 py-1 bg-red-500 text-white rounded text-xs"
                                            onClick={() =>
                                              handleRemoveEditIndicator(rowIdx)
                                            }
                                          >
                                            -
                                          </button>
                                        )}
                                        {rowIdx === editPerfArr.length - 1 && (
                                          <button
                                            type="button"
                                            className="px-2 py-1 bg-green-500 text-white rounded text-xs"
                                            onClick={handleAddEditIndicator}
                                          >
                                            +
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                )}
                          </>
                        ) : (
                          <>
                            {actArr.length === 1 ? (
                              rowIdx === 0 && (
                                <td
                                  className="py-2 px-4 border"
                                  rowSpan={maxRows}
                                >
                                  {actArr[0]}
                                </td>
                              )
                            ) : (
                              <td className="py-2 px-4 border">
                                {actArr[rowIdx] || ""}
                              </td>
                            )}

                            {perfArr.length === 1 ? (
                              rowIdx === 0 && (
                                <td
                                  className="py-2 px-4 border"
                                  rowSpan={maxRows}
                                >
                                  {perfArr[0]}
                                </td>
                              )
                            ) : (
                              <td className="py-2 px-4 border">
                                {perfArr[rowIdx] || ""}
                              </td>
                            )}
                          </>
                        )}

                        {rowIdx === 0 && (
                          <>
                            {editingId === project._id ? (
                              <td
                                className="py-2 px-4 border text-center"
                                rowSpan={editMaxRows}
                              >
                                <textarea
                                  className="w-32 border rounded px-2 py-1"
                                  value={editRow.gad_budget}
                                  onChange={(e) =>
                                    handleEditRowChange(
                                      "gad_budget",
                                      e.target.value,
                                    )
                                  }
                                  required
                                />
                              </td>
                            ) : (
                              <td
                                className="py-2 px-4 border text-center"
                                rowSpan={maxRows}
                              >
                                {Number(project.gad_budget).toLocaleString(
                                  undefined,
                                  { minimumFractionDigits: 2 },
                                )}
                              </td>
                            )}
                            {editingId === project._id ? (
                              <td
                                className="py-2 px-4 border text-center"
                                rowSpan={editMaxRows}
                              >
                                <textarea
                                  className="w-32 border rounded px-2 py-1"
                                  value={editRow.source_budget}
                                  onChange={(e) =>
                                    handleEditRowChange(
                                      "source_budget",
                                      e.target.value,
                                    )
                                  }
                                  required
                                />
                              </td>
                            ) : (
                              <td
                                className="py-2 px-4 border text-center"
                                rowSpan={maxRows}
                              >
                                {project.source_budget}
                              </td>
                            )}
                            {editingId === project._id ? (
                              <td
                                className="py-2 px-4 border"
                                rowSpan={editMaxRows}
                              >
                                <textarea
                                  className="w-40 border rounded px-2 py-1"
                                  value={editRow.responsible_office}
                                  onChange={(e) =>
                                    handleEditRowChange(
                                      "responsible_office",
                                      e.target.value,
                                    )
                                  }
                                  required
                                />
                              </td>
                            ) : (
                              <td
                                className="py-2 px-4 border"
                                rowSpan={maxRows}
                              >
                                {project.responsible_office}
                              </td>
                            )}
                            <td
                              className="py-2 px-4 border"
                              rowSpan={editMaxRows}
                            >
                              {Array.isArray(project.events)
                                ? project.events.length
                                : 0}
                            </td>
                            <td
                              className="py-2 px-4 flex gap-2"
                              rowSpan={editMaxRows}
                            >
                              {editingId === project._id ? (
                                <>
                                  <button
                                    className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      saveEdit();
                                    }}
                                    disabled={editLoading}
                                  >
                                    {editLoading ? "Saving..." : "Save"}
                                  </button>
                                  <button
                                    className="px-3 py-1 bg-gray-400 text-black rounded hover:bg-gray-500 transition"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      cancelEdit();
                                    }}
                                    disabled={editLoading}
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                                    onClick={() =>
                                      router.push(`/projects/${project._id}`)
                                    }
                                  >
                                    View
                                  </button>
                                  <button
                                    className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition"
                                    onClick={() => startEdit(project)}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition"
                                    onClick={() =>
                                      setDeleteModal({ open: true, project })
                                    }
                                  >
                                    Delete
                                  </button>
                                </>
                              )}
                            </td>
                          </>
                        )}
                      </tr>
                    ),
                  );
                })}

                {editError && (
                  <tr>
                    <td colSpan={13} className="text-red-500 text-sm px-4 py-2">
                      {editError}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </form>

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
                      Math.ceil(safeProjects.length / num),
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
      )}
    </div>
  );
}
