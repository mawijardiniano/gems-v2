"use client";
import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSelector } from "react-redux";
import { useRef } from "react";
import { FiArrowLeft, FiEdit2 } from "react-icons/fi";
import axios from "axios";

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

const CommentBox = ({
  field,
  onComment,
  showAddButton,
  onDeleteComment,
  projectId,
  role,
  fieldName,
}) => {
  return (
    <div className="mt-1">
      {showAddButton && (
        <button
          type="button"
          onClick={onComment}
          className="text-xs text-blue-500 hover:underline mt-1"
        >
          + Comment
        </button>
      )}

      {Array.isArray(field?.comments) && field.comments.length > 0 && (
        <div className="mt-1 text-xs text-gray-600">
          <div className="font-semibold">Comments:</div>

          {field.comments.map((c) => (
            <div key={c._id} className="relative border-l pl-2 mt-2 pr-4">
              {role === "planning director" && (
                <button
                  onClick={() => onDeleteComment(projectId, fieldName, c._id)}
                  className="absolute top-0 right-0 text-red-500 hover:text-red-700 text-xs"
                  title="Delete comment"
                >
                  ✕
                </button>
              )}

              <span
                className={`text-xs font-medium ${
                  c.type === "revision" ? "text-red-500" : "text-green-600"
                }`}
              >
                [{c.type}]
              </span>

              <div>{c.message}</div>

              <div className="text-gray-400">
                {new Date(c.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function ProjectContent({ sidebarOpen }) {
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
  const [pageSize, setPageSize] = useState(5);
  const [pageSizeInput, setPageSizeInput] = useState("10");
  const [annualBudget, setAnnualBudget] = useState(null);
  const [totalGAA, setTotalGAA] = useState(null);
  const [remainingBudget, setRemainingBudget] = useState(null);
  const [usedBudget, setUsedBudget] = useState(0);
  const [budgetYear, setBudgetYear] = useState(() => new Date().getFullYear());
  const [projectlist, setProjectList] = useState(null);
  const [status, setStatus] = useState("");
  const [budgetSummary, setBudgetSummary] = useState(null);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState("");
  const [commentType, setCommentType] = useState("approval");
  const [commentField, setCommentField] = useState(null);
  const [commentProjectId, setCommentProjectId] = useState(null);
  const [updateStatusModal, setUpdateStatusModal] = useState(false);
  const [statusType, setStatusType] = useState("approved");
  const [reasonField, setReasonField] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedGPBId, setSelectedGPBId] = useState(null);
  const [selectedGPBKey, setSelectedGPBKey] = useState(null);
  const [selectedGPBStatus, setSelectedGPBStatus] = useState(null);

  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const params = useParams();
  const year = params?.year;

  const emptyNewProject = () => ({
    year: Number(year),
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

  const handleUpdateStatusModal = () => {
    setUpdateStatusModal(true);
  };

  const userId = useSelector((state) => state.auth.userId);
  const role = useSelector((state) => state.auth.role);

  const topScrollRef = useRef(null);
  const tableScrollRef = useRef(null);

  const handleTopScroll = () => {
    tableScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
  };

  const handleTableScroll = () => {
    topScrollRef.current.scrollLeft = tableScrollRef.current.scrollLeft;
  };

  const safeProjects = Array.isArray(projects) ? projects : [];
  const totalPages = Math.max(1, Math.ceil(safeProjects.length / pageSize));
  const paginatedProjects = safeProjects.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/gpb/${year}`);
      const data = await res.json();

      const projects = data?.data?.projects || [];

      const normalizeField = (field) => {
        if (!field) {
          return { value: "", comments: [] };
        }

        if (
          typeof field === "object" &&
          !Array.isArray(field) &&
          "value" in field
        ) {
          return {
            value: field.value ?? "",
            comments: field.comments ?? [],
          };
        }

        if (Array.isArray(field)) {
          return {
            value: field,
            comments: [],
          };
        }

        return {
          value: field,
          comments: [],
        };
      };

      const normalized = projects.map((p) => ({
        ...p,
        _raw: {
          gender_issue: p.gender_issue,
          cause_gender_issue: p.cause_gender_issue,
          gad_objective: p.gad_objective,
          supporting_statistics_data: p.supporting_statistics_data,
          relevant_agency: p.relevant_agency,
          gad_activity: p.gad_activity,
          performance_indicator_target: p.performance_indicator_target,
          gad_budget: p.gad_budget,
          source_budget: p.source_budget,
          responsible_office: p.responsible_office,
        },

        gender_issue: p.gender_issue?.value ?? p.gender_issue,
        cause_gender_issue:
          p.cause_gender_issue?.value ?? p.cause_gender_issue ?? [],
        gad_objective: p.gad_objective?.value ?? p.gad_objective ?? [],
        supporting_statistics_data:
          p.supporting_statistics_data?.value ?? p.supporting_statistics_data,
        relevant_agency: p.relevant_agency?.value ?? p.relevant_agency,
        gad_activity: p.gad_activity?.value ?? p.gad_activity ?? [],
        performance_indicator_target:
          p.performance_indicator_target?.value ??
          p.performance_indicator_target ??
          [],
        gad_budget: p.gad_budget?.value ?? p.gad_budget,
        source_budget: p.source_budget?.value ?? p.source_budget,
        responsible_office: p.responsible_office?.value ?? p.responsible_office,
      }));

      setProjectList(normalized);
      setStatus(data.data.status_of_gpb?.status);
      console.log("Comments", data.data.projects);
      setProjects(normalized);
      console.log("Normalized", normalized);
      setSelectedGPBId(data.data._id);
      setSelectedGPBStatus(data.data.status_of_gpb);
      console.log("Key", data.data.status_of_gpb);
      console.log("GPBId", data.data._id);
    } catch (err) {
      console.error(err);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchProjects();
  }, [budgetYear]);

  // useEffect(() => {
  //   setNewProject((prev) => ({ ...prev, year: getDefaultYear() }));
  // }, [projects]);

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
    if (!year) return;
    fetch(`/api/gaa-budget?year=${year}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data.length > 0) {
          setTotalGAA(data.data[0].totalGAA);
        } else {
          setTotalGAA(null);
        }
      });
  }, [year]);

  const fetchBudgetSummary = async () => {
    if (!year) return;

    try {
      const res = await fetch(`/api/project/budget/summary/${year}`);
      const data = await res.json();

      setBudgetSummary(data?.budgetSummary || null);
    } catch (err) {
      console.error(err);
      setBudgetSummary(null);
    }
  };

  useEffect(() => {
    if (!year) return;
    fetchBudgetSummary();
  }, [year]);

  useEffect(() => {
    if (!year) return;
    fetch(`/api/project/budget/summary/${year}`)
      .then((r) => r.json())
      .then((data) => {
        console.log("Budget", data.budgetSummary);
        if (data.budgetSummary) {
          setBudgetSummary(data.budgetSummary);
        } else {
          setBudgetSummary(null);
        }
      });
  }, [year]);

  // useEffect(() => {
  //   if (annualBudget !== null) {
  //     const used = projects
  //       .filter((p) => Number(p.year) === Number(budgetYear))
  //       .reduce((sum, p) => sum + (Number(p.gad_budget) || 0), 0);

  //     setUsedBudget(used);
  //     setRemainingBudget(annualBudget - used);
  //   } else {
  //     setRemainingBudget(null);
  //     setUsedBudget(0);
  //   }
  // }, [annualBudget, projects, budgetYear]);

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
        fetchBudgetSummary();
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
        gender_issue: editRow.gender_issue,
        cause_gender_issue: editRow.cause_gender_issue,
        gad_objective: editRow.gad_objective,
        gad_activity: editRow.gad_activity,
        supporting_statistics_data: editRow.supporting_statistics_data,
        relevant_agency: editRow.relevant_agency,
        performance_indicator_target: serializeIndicators(
          editRow.performance_indicator_target,
        ),
        gad_budget: editRow.gad_budget,
        source_budget: editRow.source_budget,
        responsible_office: editRow.responsible_office,
      };

      const res = await fetch(`/api/project/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to update");
      }

      setEditingId(null);
      setEditRow(null);

      await fetchProjects();
      await fetchBudgetSummary();
    } catch (err) {
      console.error(err);
      setEditError(err.message || "Network error");
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
        fetchBudgetSummary();
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

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/projects/${projectlist._id}/comments`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Failed");

      setComments(data);
      console.log("Comments:", data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchComments();
  }, []);

  const handleSubmitComment = async () => {
    if (!comment.trim() || !commentField || !commentProjectId) {
      console.warn("⚠️ Missing required fields");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        field: commentField,
        userId,
        message: comment,
        type: commentType,
      };

      console.log("📦 PAYLOAD SENT:", payload);

      const url = `/api/project/${commentProjectId}/comments`;
      console.log("🌐 REQUEST URL:", url);

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      console.log("📩 RESPONSE STATUS:", res.status);
      console.log("📩 RESPONSE DATA:", data);

      if (!res.ok) {
        throw new Error(data.message || data.error || "Request failed");
      }

      console.log("✅ COMMENT SUCCESS:", data);

      setComment("");
      setShowCommentForm(false);
      setCommentField(null);
      setCommentProjectId(null);

      fetchProjects();
    } catch (err) {
      console.error("❌ COMMENT ERROR:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (projectId, field, commentId) => {
    try {
      setLoading(true);

      // ✅ IMPORTANT: always send base field only
      const cleanField = field.split(".")[0];

      const res = await fetch(
        `/api/project/${projectId}/comments?field=${cleanField}&commentId=${commentId}`,
        {
          method: "DELETE",
        },
      );

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Delete failed");

      await fetchProjects();
    } catch (err) {
      console.error("Delete comment error:", err);
    } finally {
      setLoading(false);
    }
  };

  const deleteFileByKey = async (key) => {
    if (!key) return;

    try {
      await axios.delete("/api/upload", {
        data: { key },
      });
    } catch (err) {
      console.log("Failed to delete old file:", err);
    }
  };

  const handleUpdateStatus = async () => {
    try {
      setSaving(true);
      const oldKey = selectedGPBStatus?.scanned_copy?.key;

      console.log("OLD KEY:", oldKey);

      let scanned_copy = selectedGPBStatus?.scanned_copy || {
        url: "",
        key: "",
      };

      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("folder", "status/scanned");

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const uploadData = await uploadRes.json();

        scanned_copy = {
          url: uploadData.url,
          key: uploadData.key,
        };
      }

      const res = await fetch(`/api/gpb/status/${selectedGPBId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: statusType,
          reason: reasonField,
          scanned_copy,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update status");
      }

      console.log("NEW KEY:", scanned_copy.key);

      if (selectedFile && oldKey && oldKey !== scanned_copy.key) {
        await deleteFileByKey(oldKey);
      }

      setUpdateStatusModal(false);
      setReasonField("");
      setStatusType("approved");
      setSelectedFile(null);

      fetchProjects();
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  const TABLE_WIDTH = sidebarOpen ? 2000 : 1800;

  return (
    <div className="p-6">
      <button
        onClick={() => router.push("/projects")}
        className="flex flex-row items-center mb-2 text-blue-600 gap-1"
      >
        <FiArrowLeft /> Back to GPB List
      </button>
      <div className="flex justify-between">
        <h2 className="text-3xl font-bold mb-4">GPB Year {year}</h2>

        <button
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded transition mb-2"
          onClick={handlePrintProjects}
          disabled={totalGAA === null || typeof totalGAA === "undefined"}
        >
          Print Projects
        </button>
      </div>

      {/* <div className="mb-4 flex items-center gap-3">
        <select
          className="border rounded px-3 py-2 text-sm"
          value={budgetYear}
          onChange={(e) => setBudgetYear(Number(e.target.value))}
        >
          {Array.from(
            { length: 10 },
            (_, i) => new Date().getFullYear() - 8 + i,
          ).map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div> */}

      <div className=" flex gap-2">
        {/* {role === "planning director" && (
          <button
            onClick={() => setShowCommentForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded transition mb-2 mr-4"
          >
            Add Comment
          </button>
        )} */}
      </div>
      {updateStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-semibold text-gray-800">
                Update GPB Status
              </h2>

              <button
                onClick={() => setUpdateStatusModal(false)}
                className="text-gray-500 hover:text-gray-700 text-3xl"
              >
                ×
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>

              <select
                className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={statusType}
                onChange={(e) => setStatusType(e.target.value)}
              >
                <option value="draft">Draft</option>
                <option value="approved">Approved</option>
                <option value="disapproved">Disapproved</option>
              </select>
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason
              </label>

              <textarea
                className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="Write the reason..."
                value={reasonField}
                onChange={(e) => setReasonField(e.target.value)}
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Scanned Copy (Optional)
              </label>

              <input
                type="file"
                className="w-full border border-gray-300 rounded-lg p-2"
                onChange={(e) => setSelectedFile(e.target.files[0])}
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setUpdateStatusModal(false)}
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition"
              >
                Cancel
              </button>

              <button
                onClick={handleUpdateStatus}
                disabled={saving}
                className={`px-5 py-2 rounded-lg text-white transition ${
                  saving
                    ? "bg-gray-400 cursor-not-allowed"
                    : statusType === "approved"
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {saving ? "Saving..." : "Save Status"}
              </button>
            </div>
          </div>
        </div>
      )}
      {showCommentForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md relative">
            <h3 className="text-xl font-semibold mb-1">Add Comment</h3>
            {commentField && (
              <p className="text-sm text-gray-500 mb-3 capitalize">
                Field:{" "}
                <span className="font-medium text-gray-700">
                  {commentField.includes(".")
                    ? `${commentField.split(".")[0].replace(/_/g, " ")} — item ${Number(commentField.split(".")[1]) + 1}`
                    : commentField.replace(/_/g, " ")}
                </span>
              </p>
            )}
            <textarea
              className="w-full border rounded p-2 mb-2"
              rows={3}
              placeholder="Write your comment..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <select
              className="border rounded p-2 mb-2 w-full"
              value={commentType}
              onChange={(e) => setCommentType(e.target.value)}
            >
              <option value="approval">Approval</option>
              <option value="revision">Needs Revision</option>
            </select>
            <div className="flex gap-2 justify-end">
              <button
                onClick={handleSubmitComment}
                disabled={loading}
                className="bg-green-600 text-white px-4 py-2 rounded"
              >
                {loading ? "Saving..." : "Submit"}
              </button>
              <button
                onClick={() => {
                  setShowCommentForm(false);
                  setCommentField(null);
                  setCommentProjectId(null);
                }}
                className="bg-gray-400 px-4 py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between mb-4">
        <p className="text-md font-bold">
          Status:{" "}
          <span
            className={`capitalize ${
              status === "draft"
                ? " text-yellow-500"
                : status === "approved"
                  ? " text-green-700"
                  : " text-red-600"
            }`}
          >
            {status}
          </span>
        </p>

        {role !== "gad coordinator" && (
          <button
            onClick={handleUpdateStatusModal}
            className="bg-blue-600 py-2 px-5 text-white rounded-md font-medium"
          >
            Update Status
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {budgetSummary !== null && (
          <div className="bg-white border border-gray-200 p-4 h-20">
            <div className="mb-2 text-sm font-medium">
              Total GAD Budget for {year}
            </div>
            <div className="flex justify-end">
              ₱{" "}
              <span className="text-red-600">
                {budgetSummary.totalBudget.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        )}

        {budgetSummary !== null && (
          <div className="bg-white border border-gray-200 p-4 h-20">
            <div className="mb-2 text-sm font-medium">
              Total GAD Allocation Used for {year}
            </div>
            <div className="flex justify-end">
              ₱{" "}
              <span className="text-red-600">
                {budgetSummary.usedBudget.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        )}

        {budgetSummary !== null && (
          <div className="bg-white border border-gray-200 p-4 h-20">
            <div className="mb-4 text-sm font-medium">
              Remaining GAD Budget for {year}
            </div>
            <div className="flex justify-end">
              ₱{" "}
              <span className="text-red-600">
                {budgetSummary.remainingBudget.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-3 mb-2">
        {Array.isArray(comments) &&
          comments.map((c) => (
            <div key={c._id} className="border p-2 mb-2">
              <p className="font-semibold">
                {c.userId?.personal_info_id?.personal.first_name}{" "}
                {c.userId?.personal_info_id?.personal.last_name} •{" "}
                {c.userId?.role}
              </p>

              <p className="text-xs text-gray-500 capitalize">
                {c.type} {new Date(c.createdAt).toLocaleString()}
              </p>

              <p>{c.message}</p>
            </div>
          ))}
      </div>

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
            <div
              className="transition-all duration-300 w-full"
              style={{
                maxWidth: sidebarOpen
                  ? "calc(100vw - 10px)"
                  : "calc(100vw - 360px)",
              }}
            >
              <div
                ref={topScrollRef}
                onScroll={handleTopScroll}
                className="overflow-x-auto"
              >
                <div style={{ width: `${TABLE_WIDTH}px`, height: "1px" }} />
              </div>

              <div
                ref={tableScrollRef}
                onScroll={handleTableScroll}
                className="overflow-x-auto"
              >
                <table
                  className="bg-white rounded shadow"
                  style={{ minWidth: `${TABLE_WIDTH}px` }}
                >
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-gray-900 border text-white">
                      <th className="py-2 px-4 border-b text-center">No.</th>
                      <th className="py-2 px-4 border-b text-center w-40">
                        Gender Issue and/or GAD Mandate
                      </th>
                      <th className="py-2 px-4 border-b text-center w-40">
                        Cause of the Gender Issue
                      </th>
                      <th className="py-2 px-4 border-b text-center w-40 ">
                        GAD Result Statement/GAD Objective
                      </th>
                      <th className="py-2 px-4 border-b text-center w-40">
                        Supporting Statistics Data
                      </th>
                      <th className="py-2 px-4 border-b text-center w-40">
                        Relevant Agency MFO/PAP
                      </th>
                      <th className="py-2 px-4 border-b text-center w-40">
                        GAD Activity
                      </th>
                      <th className="py-2 px-4 border-b text-center w-40">
                        Output Performance Indicators and Target
                      </th>
                      <th className="py-2 px-4 border-b text-center w-40">
                        GAD Budget
                      </th>
                      <th className="py-2 px-4 border-b text-center w-40">
                        Source of Budget
                      </th>
                      <th className="py-2 px-4 border-b text-center w-40">
                        Responsible Unit/Office
                      </th>
                      {role !== "planning director" && (
                        <>
                          <th className="py-2 px-4 border-b text-center w-40">
                            Number of Events
                          </th>
                          <th className="py-2 px-4 border-b text-center w-40">
                            Actions
                          </th>
                        </>
                      )}
                    </tr>

                    {role !== "planning director" &&
                      selectedGPBStatus?.status !== "approved" &&
                      selectedGPBStatus?.status !== "disapproved" && (
                        <tr className="bg-gray-100 sticky top-[41px] z-10">
                          <td className="py-2 px-4 border-b">--</td>

                          <td className="py-2 px-4 border-b">
                            <textarea
                              className="w-40 border rounded px-2 py-1"
                              value={newProject.gender_issue}
                              onChange={(e) =>
                                handleNewProjectChange(
                                  "gender_issue",
                                  e.target.value,
                                )
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
                                      handleRemoveArrayField(
                                        "cause_gender_issue",
                                        idx,
                                      )
                                    }
                                  >
                                    -
                                  </button>
                                )}
                                {idx ===
                                  newProject.cause_gender_issue.length - 1 && (
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
                                      handleRemoveArrayField(
                                        "gad_objective",
                                        idx,
                                      )
                                    }
                                  >
                                    -
                                  </button>
                                )}
                                {idx ===
                                  newProject.gad_objective.length - 1 && (
                                  <button
                                    type="button"
                                    className="ml-1 px-2 py-1 bg-green-500 text-white rounded"
                                    onClick={() =>
                                      handleAddArrayField("gad_objective")
                                    }
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
                                      handleRemoveArrayField(
                                        "gad_activity",
                                        idx,
                                      )
                                    }
                                  >
                                    -
                                  </button>
                                )}
                                {idx === newProject.gad_activity.length - 1 && (
                                  <button
                                    type="button"
                                    className="ml-1 px-2 py-1 bg-green-500 text-white rounded"
                                    onClick={() =>
                                      handleAddArrayField("gad_activity")
                                    }
                                  >
                                    +
                                  </button>
                                )}
                              </div>
                            ))}
                          </td>
                          <td className="py-2 px-4 border-b">
                            {newProject.performance_indicator_target.map(
                              (val, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-start gap-1 mb-2"
                                >
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
                                    {newProject.performance_indicator_target
                                      .length > 1 && (
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
                                      newProject.performance_indicator_target
                                        .length -
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
                              ),
                            )}
                          </td>
                          <td className="py-2 px-4 border-b">
                            <textarea
                              className="w-32 border rounded px-2 py-1"
                              value={newProject.gad_budget}
                              onChange={(e) =>
                                handleNewProjectChange(
                                  "gad_budget",
                                  e.target.value,
                                )
                              }
                              required
                            />
                          </td>
                          <td className="py-2 px-4 border-b">
                            <textarea
                              className="w-32 border rounded px-2 py-1"
                              value={newProject.source_budget}
                              onChange={(e) =>
                                handleNewProjectChange(
                                  "source_budget",
                                  e.target.value,
                                )
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
                      )}
                  </thead>

                  <tbody>
                    {addError && (
                      <tr>
                        <td
                          colSpan={13}
                          className="text-red-500 text-sm px-4 py-2"
                        >
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
                                    <div>
                                      {project._raw.gender_issue?.value}
                                    </div>
                                    <CommentBox
                                      field={project._raw.gender_issue}
                                      fieldName="gender_issue"
                                      projectId={project._id}
                                      role={role}
                                      showAddButton={
                                        role === "planning director"
                                      }
                                      onComment={() => {
                                        if (!project?._id) {
                                          console.error(
                                            "Missing project ID",
                                            project,
                                          );
                                          return;
                                        }

                                        setCommentField("gender_issue");
                                        setCommentProjectId(project._id);
                                        setShowCommentForm(true);
                                      }}
                                      onDeleteComment={handleDeleteComment}
                                    />
                                    {/* <pre>{JSON.stringify(project._raw.cause_gender_issue, null, 2)}</pre> */}
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

                                        <CommentBox
                                          field={
                                            project._raw.cause_gender_issue
                                          }
                                          fieldName="cause_gender_issue"
                                          projectId={project._id}
                                          role={role}
                                          showAddButton={
                                            role === "planning director"
                                          }
                                          onComment={() => {
                                            if (!project?._id) {
                                              console.error(
                                                "Missing project ID",
                                                project,
                                              );
                                              return;
                                            }

                                            setCommentField(
                                              "cause_gender_issue",
                                            );
                                            setCommentProjectId(project._id);
                                            setShowCommentForm(true);
                                          }}
                                          onDeleteComment={handleDeleteComment}
                                        />
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
                                            {rowIdx ===
                                              editCauseArr.length - 1 && (
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
                                              handleEditRowChange(
                                                "gad_objective",
                                                [e.target.value],
                                              )
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
                                            {rowIdx ===
                                              editObjArr.length - 1 && (
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
                                {/* causeArr */}
                                {causeArr.length === 1 ? (
                                  rowIdx === 0 && (
                                    <td
                                      className="py-2 px-4 border"
                                      rowSpan={maxRows}
                                    >
                                      {causeArr[0]}
                                      <CommentBox
                                        field={{
                                          value: causeArr[rowIdx],
                                          comments: (
                                            project._raw.cause_gender_issue
                                              ?.comments || []
                                          ).filter(
                                            (c) =>
                                              Number(c.fieldIndex) === rowIdx,
                                          ),
                                        }}
                                        fieldName={`cause_gender_issue.${rowIdx}`}
                                        role={role}
                                        projectId={project._id}
                                        showAddButton={
                                          role === "planning director"
                                        }
                                        onComment={() => {
                                          setCommentField(
                                            `cause_gender_issue.${rowIdx}`,
                                          );
                                          setCommentProjectId(project._id);
                                          setShowCommentForm(true);
                                        }}
                                        onDeleteComment={handleDeleteComment}
                                      />
                                    </td>
                                  )
                                ) : (
                                  <td className="py-2 px-4 border">
                                    {causeArr[rowIdx] || ""}
                                    <CommentBox
                                      field={{
                                        value: causeArr[rowIdx],
                                        comments: (
                                          project._raw.cause_gender_issue
                                            ?.comments || []
                                        ).filter(
                                          (c) =>
                                            Number(c.fieldIndex) === rowIdx,
                                        ),
                                      }}
                                      fieldName={`cause_gender_issue.${rowIdx}`}
                                      role={role}
                                      projectId={project._id}
                                      showAddButton={
                                        role === "planning director"
                                      }
                                      onComment={() => {
                                        setCommentField(
                                          `cause_gender_issue.${rowIdx}`,
                                        );
                                        setCommentProjectId(project._id);
                                        setShowCommentForm(true);
                                      }}
                                      onDeleteComment={handleDeleteComment}
                                    />
                                  </td>
                                )}

                                {objArr.length === 1 ? (
                                  rowIdx === 0 && (
                                    <td
                                      className="py-2 px-4 border"
                                      rowSpan={maxRows}
                                    >
                                      {objArr[0]}
                                      <CommentBox
                                        field={project._raw.gad_objective}
                                        fieldName="gad_objective"
                                        role={role}
                                        projectId={project._id}
                                        showAddButton={
                                          role === "planning director"
                                        }
                                        onComment={() => {
                                          setCommentField("gad_objective");
                                          setCommentProjectId(project._id);
                                          setShowCommentForm(true);
                                        }}
                                        onDeleteComment={handleDeleteComment}
                                      />
                                    </td>
                                  )
                                ) : (
                                  <td className="py-2 px-4 border">
                                    {objArr[rowIdx] || ""}
                                    <CommentBox
                                      field={{
                                        value: objArr[rowIdx],
                                        comments: (
                                          project._raw.gad_objective
                                            ?.comments || []
                                        ).filter(
                                          (c) => c.fieldIndex === rowIdx,
                                        ),
                                      }}
                                      fieldName={`gad_objective.${rowIdx}`}
                                      role={role}
                                      projectId={project._id}
                                      showAddButton={
                                        role === "planning director"
                                      }
                                      onComment={() => {
                                        setCommentField(
                                          `gad_objective.${rowIdx}`,
                                        );
                                        setCommentProjectId(project._id);
                                        setShowCommentForm(true);
                                      }}
                                      onDeleteComment={handleDeleteComment}
                                    />
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
                                    <CommentBox
                                      field={
                                        project._raw.supporting_statistics_data
                                      }
                                      fieldName="supporting_statistics_data"
                                      projectId={project._id}
                                      role={role}
                                      showAddButton={
                                        role === "planning director"
                                      }
                                      onComment={() => {
                                        if (!project?._id) {
                                          console.error(
                                            "Missing project ID",
                                            project,
                                          );
                                          return;
                                        }

                                        setCommentField(
                                          "supporting_statistics_data",
                                        );
                                        setCommentProjectId(project._id);
                                        setShowCommentForm(true);
                                      }}
                                      onDeleteComment={handleDeleteComment}
                                    />
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
                                    <CommentBox
                                      field={project._raw.relevant_agency}
                                      fieldName="relevant_agency"
                                      role={role}
                                      projectId={project._id}
                                      showAddButton={
                                        role === "planning director"
                                      }
                                      onComment={() => {
                                        if (!project?._id) {
                                          console.error(
                                            "Missing project ID",
                                            project,
                                          );
                                          return;
                                        }

                                        setCommentField("relevant_agency");
                                        setCommentProjectId(project._id);
                                        setShowCommentForm(true);
                                      }}
                                      onDeleteComment={handleDeleteComment}
                                    />
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
                                              handleEditRowChange(
                                                "gad_activity",
                                                [e.target.value],
                                              )
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
                                            {rowIdx ===
                                              editActArr.length - 1 && (
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
                                          {editPerfArr[0]?._raw !==
                                          undefined ? (
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
                                                handleEditIndicatorChange(
                                                  rowIdx,
                                                  {
                                                    _raw: e.target.value,
                                                  },
                                                )
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
                                                  handleRemoveEditIndicator(
                                                    rowIdx,
                                                  )
                                                }
                                              >
                                                -
                                              </button>
                                            )}
                                            {rowIdx ===
                                              editPerfArr.length - 1 && (
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
                                      <CommentBox
                                        field={project._raw.gad_activity}
                                        fieldName="gad_activity"
                                        projectId={project._id}
                                        role={role}
                                        showAddButton={
                                          role === "planning director"
                                        }
                                        onComment={() => {
                                          setCommentField("gad_activity");
                                          setCommentProjectId(project._id);
                                          setShowCommentForm(true);
                                        }}
                                        onDeleteComment={handleDeleteComment}
                                      />
                                    </td>
                                  )
                                ) : (
                                  <td className="py-2 px-4 border">
                                    {actArr[rowIdx] || ""}
                                    <CommentBox
                                      field={{
                                        value: actArr[rowIdx],
                                        comments: (
                                          project._raw.gad_activity?.comments ||
                                          []
                                        ).filter(
                                          (c) => c.fieldIndex === rowIdx,
                                        ),
                                      }}
                                      fieldName={`gad_activity.${rowIdx}`}
                                      role={role}
                                      projectId={project._id}
                                      showAddButton={
                                        role === "planning director"
                                      }
                                      onComment={() => {
                                        setCommentField(
                                          `gad_activity.${rowIdx}`,
                                        );
                                        setCommentProjectId(project._id);
                                        setShowCommentForm(true);
                                      }}
                                      onDeleteComment={handleDeleteComment}
                                    />
                                  </td>
                                )}

                                {perfArr.length === 1 ? (
                                  rowIdx === 0 && (
                                    <td
                                      className="py-2 px-4 border"
                                      rowSpan={maxRows}
                                    >
                                      {perfArr[0]}
                                      <CommentBox
                                        field={
                                          project._raw
                                            .performance_indicator_target
                                        }
                                        fieldName="performance_indicator_target"
                                        projectId={project._id}
                                        role={role}
                                        showAddButton={
                                          role === "planning director"
                                        }
                                        onComment={() => {
                                          setCommentField(
                                            "performance_indicator_target",
                                          );
                                          setCommentProjectId(project._id);
                                          setShowCommentForm(true);
                                        }}
                                        onDeleteComment={handleDeleteComment}
                                      />
                                    </td>
                                  )
                                ) : (
                                  <td className="py-2 px-4 border">
                                    {perfArr[rowIdx] || ""}
                                    <CommentBox
                                      field={{
                                        value: perfArr[rowIdx],
                                        comments: (
                                          project._raw
                                            .performance_indicator_target
                                            ?.comments || []
                                        ).filter(
                                          (c) => c.fieldIndex === rowIdx,
                                        ),
                                      }}
                                      fieldName={`performance_indicator_target.${rowIdx}`}
                                      role={role}
                                      projectId={project._id}
                                      showAddButton={
                                        role === "planning director"
                                      }
                                      onComment={() => {
                                        setCommentField(
                                          `performance_indicator_target.${rowIdx}`,
                                        );
                                        setCommentProjectId(project._id);
                                        setShowCommentForm(true);
                                      }}
                                      onDeleteComment={handleDeleteComment}
                                    />
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
                                    <CommentBox
                                      field={project._raw.gad_budget}
                                      fieldName="gad_budget"
                                      projectId={project._id}
                                      role={role}
                                      showAddButton={
                                        role === "planning director"
                                      }
                                      onComment={() => {
                                        if (!project?._id) {
                                          console.error(
                                            "Missing project ID",
                                            project,
                                          );
                                          return;
                                        }

                                        setCommentField("gad_budget");
                                        setCommentProjectId(project._id);
                                        setShowCommentForm(true);
                                      }}
                                      onDeleteComment={handleDeleteComment}
                                    />
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
                                    <CommentBox
                                      field={project._raw.source_budget}
                                      fieldName="source_budget"
                                      role={role}
                                      projectId={project._id}
                                      showAddButton={
                                        role === "planning director"
                                      }
                                      onComment={() => {
                                        if (!project?._id) {
                                          console.error(
                                            "Missing project ID",
                                            project,
                                          );
                                          return;
                                        }

                                        setCommentField("source_budget");
                                        setCommentProjectId(project._id);
                                        setShowCommentForm(true);
                                      }}
                                      onDeleteComment={handleDeleteComment}
                                    />
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
                                    <CommentBox
                                      field={project._raw.responsible_office}
                                      fieldName="responsible_office"
                                      role={role}
                                      projectId={project._id}
                                      showAddButton={
                                        role === "planning director"
                                      }
                                      onComment={() => {
                                        if (!project?._id) {
                                          console.error(
                                            "Missing project ID",
                                            project,
                                          );
                                          return;
                                        }

                                        setCommentField("responsible_office");
                                        setCommentProjectId(project._id);
                                        setShowCommentForm(true);
                                      }}
                                      onDeleteComment={handleDeleteComment}
                                    />
                                  </td>
                                )}
                                {role !== "planning director" && (
                                  <>
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
                                          {role !== "planning director" && (
                                            <>
                                              <button
                                                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                                                onClick={() =>
                                                  router.push(
                                                    `/projects/dump/${project._id}`,
                                                  )
                                                }
                                              >
                                                View
                                              </button>
                                              <button
                                                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition"
                                                onClick={() =>
                                                  startEdit(project)
                                                }
                                              >
                                                Edit
                                              </button>

                                              <button
                                                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition"
                                                onClick={() =>
                                                  setDeleteModal({
                                                    open: true,
                                                    project,
                                                  })
                                                }
                                              >
                                                Delete
                                              </button>
                                            </>
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
                      );
                    })}

                    {editError && (
                      <tr>
                        <td
                          colSpan={13}
                          className="text-red-500 text-sm px-4 py-2"
                        >
                          {editError}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
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
