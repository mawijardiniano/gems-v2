"use client";
import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSelector } from "react-redux";
import { useRef } from "react";
import { FiArrowLeft, FiEdit2 } from "react-icons/fi";
import axios from "axios";
import PrintGPB from "../../components/Print/PrintGPB";

const ACTIVITY_TYPE = ["Seminar", "Training", "Lecture"];

function emptyIndicator() {
  return {
    activityType: "",
    totalActivities: "",
    totalMale: "",
    totalFemale: "",
  };
}

function formatPerformanceIndicator({
  activityType,
  totalActivities,
  totalMale,
  totalFemale,
}) {
  const a = activityType || "activity";
  const s = Number(totalActivities) || 0;
  const m = Number(totalMale) || 0;
  const f = Number(totalFemale) || 0;
  const total = m + f;
  const hasActivities = s > 0;
  const hasParticipants = total > 0;

  if (hasActivities && hasParticipants) {
    return `At least ${s} ${a.toLowerCase()}${s !== 1 ? "s" : ""} conducted with ${total} participants (${f} Female, ${m} Male)`;
  } else if (hasActivities && !hasParticipants) {
    return `No. of ${a.toLowerCase()}s conducted - at least ${s}`;
  } else if (!hasActivities && hasParticipants) {
    return `At least ${total} participants trained. (${f} Female, ${m} Male)`;
  }
  return "";
}

const ACTIVITY_ALTERNATION = ACTIVITY_TYPE.join("|");

function parsePerformanceIndicator(str) {
  if (!str || typeof str !== "string") return emptyIndicator();

  const bothMatch = str.match(
    new RegExp(
      `At least (\\d+) (${ACTIVITY_ALTERNATION})s? conducted with \\d+ participants \\((\\d+) Female, (\\d+) Male\\)`,
      "i",
    ),
  );
  if (bothMatch) {
    const matchedType =
      ACTIVITY_TYPE.find(
        (t) => t.toLowerCase() === bothMatch[2].toLowerCase(),
      ) || bothMatch[2];
    return {
      activityType: matchedType,
      totalActivities: bothMatch[1],
      totalFemale: bothMatch[3],
      totalMale: bothMatch[4],
    };
  }

  const activitiesOnly = str.match(
    new RegExp(
      `No\\. of (${ACTIVITY_ALTERNATION})s conducted - at least (\\d+)`,
      "i",
    ),
  );
  if (activitiesOnly) {
    const matchedType =
      ACTIVITY_TYPE.find(
        (t) => t.toLowerCase() === activitiesOnly[1].toLowerCase(),
      ) || activitiesOnly[1];
    return {
      activityType: matchedType,
      totalActivities: activitiesOnly[2],
      totalMale: "",
      totalFemale: "",
    };
  }

  const participantsOnly = str.match(
    /At least \d+ participants trained\. \((\d+) Female, (\d+) Male\)/,
  );
  if (participantsOnly) {
    return {
      activityType: "",
      totalActivities: "",
      totalFemale: participantsOnly[1],
      totalMale: participantsOnly[2],
    };
  }

  return { _raw: str };
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
      ? { ...emptyIndicator(), ...value }
      : emptyIndicator();

  const preview = formatPerformanceIndicator(v);

  const hasActivityType = !!v.activityType;
  const hasActivityCount =
    v.totalActivities !== "" && Number(v.totalActivities) > 0;

  const activityTypeMissing = hasActivityCount && !hasActivityType;
  const activityCountMissing = hasActivityType && !hasActivityCount;

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex gap-3">
        <div className="flex flex-col flex-1">
          <label className="text-xs text-gray-400 mb-0.5">
            Type of Activity{" "}
            {hasActivityCount && <span className="text-red-500">*</span>}
          </label>
          <select
            className={`border rounded-lg px-2 py-1.5 w-full text-sm focus:outline-none focus:ring-2 ${
              activityTypeMissing
                ? "border-red-400 focus:ring-red-400"
                : "border-gray-300 focus:ring-blue-400"
            }`}
            value={v.activityType}
            onChange={(e) => onChange({ ...v, activityType: e.target.value })}
          >
            <option value="">Select</option>
            {ACTIVITY_TYPE.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col flex-1">
          <label className="text-xs text-gray-400 mb-0.5">
            No. of Activity{" "}
            {hasActivityType && <span className="text-red-500">*</span>}
          </label>
          <input
            type="number"
            min={0}
            className={`border rounded-lg px-2 py-1.5 w-full text-sm focus:outline-none focus:ring-2 ${
              activityCountMissing
                ? "border-red-400 focus:ring-red-400"
                : "border-gray-300 focus:ring-blue-400"
            }`}
            value={v.totalActivities}
            onChange={(e) =>
              onChange({ ...v, totalActivities: e.target.value })
            }
            placeholder="0"
          />
        </div>
        <div className="flex flex-col flex-1">
          <label className="text-xs text-gray-400 mb-0.5">Male</label>
          <input
            type="number"
            min={0}
            className="border border-gray-300 rounded-lg px-2 py-1.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={v.totalMale}
            onChange={(e) => onChange({ ...v, totalMale: e.target.value })}
            placeholder="0"
          />
        </div>
        <div className="flex flex-col flex-1">
          <label className="text-xs text-gray-400 mb-0.5">Female</label>
          <input
            type="number"
            min={0}
            className="border border-gray-300 rounded-lg px-2 py-1.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={v.totalFemale}
            onChange={(e) => onChange({ ...v, totalFemale: e.target.value })}
            placeholder="0"
          />
        </div>
      </div>

      {activityTypeMissing && (
        <div className="text-xs text-red-500 px-1">
          Type of Activity is required when No. of Activity is filled in.
        </div>
      )}
      {activityCountMissing && (
        <div className="text-xs text-red-500 px-1">
          No. of Activity is required when a Type of Activity is selected.
        </div>
      )}

      {preview && (
        <div className="text-xs text-blue-600 bg-blue-50 rounded-lg px-2 py-1.5 italic">
          {preview}
        </div>
      )}
    </div>
  );
}

function isIndicatorValid(ind) {
  if (!ind || ind._raw !== undefined) return true;
  const hasType = !!ind.activityType;
  const hasCount =
    ind.totalActivities !== "" && Number(ind.totalActivities) > 0;
  return hasType === hasCount;
}

function isIndicatorComplete(ind) {
  if (!ind || ind._raw !== undefined) return true;
  const hasType = !!ind.activityType;
  const hasCount =
    ind.totalActivities !== "" && Number(ind.totalActivities) > 0;
  return hasType && hasCount;
}

function indicatorsValid(arr) {
  return Array.isArray(arr) && arr.length > 0 && arr.every(isIndicatorComplete);
}

function isNonEmptyArrayFilled(arr) {
  return (
    Array.isArray(arr) &&
    arr.length > 0 &&
    arr.every((v) => typeof v === "string" && v.trim() !== "")
  );
}

function isStep1Valid(p) {
  return (
    p.project_type?.trim() !== "" &&
    p.gender_issue.trim() !== "" &&
    isNonEmptyArrayFilled(p.cause_gender_issue)
  );
}

function isStep2Valid(p) {
  return (
    isNonEmptyArrayFilled(p.gad_objective) && p.relevant_agency.trim() !== ""
  );
}

function isStep3Valid(p) {
  return (
    isNonEmptyArrayFilled(p.gad_activity) &&
    Number(p.gad_budget) > 0 &&
    p.source_budget.trim() !== "" &&
    p.responsible_office.trim() !== "" &&
    indicatorsValid(p.performance_indicator_target)
  );
}

function isEditRowValid(row) {
  if (!row) return false;
  return (
    row.project_type?.trim() &&
    row.gender_issue?.trim() &&
    isNonEmptyArrayFilled(row.cause_gender_issue) &&
    isNonEmptyArrayFilled(row.gad_objective) &&
    row.relevant_agency?.trim() &&
    isNonEmptyArrayFilled(row.gad_activity) &&
    Number(row.gad_budget) > 0 &&
    row.source_budget?.trim() &&
    row.responsible_office?.trim() &&
    indicatorsValid(row.performance_indicator_target)
  );
}

const CommentBox = ({
  fieldComments,
  onComment,
  showAddButton,
  onDeleteComment,
  projectId,
  role,
  fieldName,
}) => {
  const getTags = (comment) => {
    if (Array.isArray(comment?.fields) && comment.fields.length > 0) {
      return comment.fields;
    }

    return comment?.field ? [comment.field] : [fieldName || "general"];
  };

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

      {Array.isArray(fieldComments) && fieldComments.length > 0 && (
        <div className="mt-1 text-xs text-gray-600">
          <div className="font-semibold">Comments:</div>

          {fieldComments.map((c) => {
            const tags = getTags(c);

            return (
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

                <div className="text-xs">
                  <span
                    className={`font-medium ${
                      c.type === "revision" ? "text-red-500" : "text-green-600"
                    }`}
                  >
                    {tags
                      .map((t) => `[${String(t).replace(/_/g, " ")}]`)
                      .join(", ")}
                    :
                  </span>
                  <span>{c.message}</span>
                </div>

                <div className="text-gray-400">
                  {new Date(c.createdAt).toLocaleString()}
                </div>
              </div>
            );
          })}
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
  const [projectlist, setProjectList] = useState(null);
  const [status, setStatus] = useState("");
  const [budgetSummary, setBudgetSummary] = useState(null);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState("");
  const [commentType, setCommentType] = useState("approval");
  const [commentField, setCommentField] = useState([]);
  const [commentProjectId, setCommentProjectId] = useState(null);
  const [updateStatusModal, setUpdateStatusModal] = useState(false);
  const [statusType, setStatusType] = useState("approved");
  const [reasonField, setReasonField] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedGPBId, setSelectedGPBId] = useState(null);
  const [selectedGPBKey, setSelectedGPBKey] = useState(null);
  const [selectedGPBStatus, setSelectedGPBStatus] = useState(null);

  const [saving, setSaving] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [showEditModal, setShowEditModal] = useState(false);
  const router = useRouter();
  const params = useParams();
  const year = params?.year;
  const budgetYear = year;

  const emptyNewProject = () => ({
    year: Number(year),
    project_type: "",
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
  const getProjectTypeLabel = (project) => {
    const rawType = project?.project_type;
    const value =
      rawType && typeof rawType === "object" ? rawType.value : rawType;

    if (value === "Client Focused") return "Client Focused";
    if (value === "Organization Focused") return "Organization Focused";
    return "Uncategorized";
  };

  const projectTypeOrder = {
    "Client Focused": 0,
    "Organization Focused": 1,
    Uncategorized: 2,
  };

  const orderedProjects = [...safeProjects]
    .map((project, originalIndex) => ({ project, originalIndex }))
    .sort((a, b) => {
      const aType = getProjectTypeLabel(a.project);
      const bType = getProjectTypeLabel(b.project);
      const byType = projectTypeOrder[aType] - projectTypeOrder[bType];

      if (byType !== 0) return byType;
      return a.originalIndex - b.originalIndex;
    })
    .map((entry) => entry.project);

  const totalPages = Math.max(1, Math.ceil(orderedProjects.length / pageSize));
  const paginatedProjects = orderedProjects.slice(
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
          project_type: p.project_type,
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

        project_type: p.project_type?.value ?? p.project_type,
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
        comments: Array.isArray(p.comments) ? p.comments : [],
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

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
    setPageSizeInput(String(pageSize));
  }, [page, totalPages, pageSize]);

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
    setEditRow({
      ...project,
      performance_indicator_target: (
        project.performance_indicator_target || [""]
      ).map((p) => (typeof p === "string" ? parsePerformanceIndicator(p) : p)),
    });
    setEditError("");
    setShowEditModal(true);
  };

  const cancelEdit = () => {
    setEditRow(null);
    setEditError("");
    setShowEditModal(false);
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
        userId,
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
        if (data.budgetSummary) {
          setAddError(
            `${data.message}. Remaining Budget: ₱${Number(
              data.budgetSummary.remainingBudget,
            ).toLocaleString()}`,
          );
        } else {
          setAddError(data.message || data.error || "Failed to add project");
        }
      }
    } catch {
      setAddError("Network error");
    } finally {
      setAddLoading(false);
    }
  };

  const handleWizardSubmit = async () => {
    setAddLoading(true);
    setAddError("");
    try {
      const payload = {
        ...newProject,
        userId,
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
        setShowWizard(false);
        setWizardStep(1);
        fetchProjects();
        fetchBudgetSummary();
      } else {
        if (data.budgetSummary) {
          setAddError(
            `${data.message}. Remaining Budget: ₱${Number(
              data.budgetSummary.remainingBudget,
            ).toLocaleString()}`,
          );
        } else {
          setAddError(data.message || data.error || "Failed to add project");
        }
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
        userId,
        project_type: editRow.project_type,
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

      const res = await fetch(`/api/project/${editRow._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to update");
      }

      setShowEditModal(false);
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

  const fetchComments = async () => {
    if (!projectlist?._id) return;
    try {
      const res = await fetch(`/api/project/${projectlist._id}/comments`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Failed");

      setComments(data.data ?? []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchComments();
  }, []);

  const handleSubmitComment = async () => {
    const fields =
      Array.isArray(commentField) && commentField.length > 0
        ? commentField
        : typeof commentField === "string" && commentField.trim()
          ? [commentField]
          : ["general"];

    if (!comment.trim() || !commentProjectId) {
      console.warn("⚠️ Missing required fields");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`/api/project/${commentProjectId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fields,
          userId,
          message: comment,
          type: commentType,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save comment");
      }

      setComment("");
      setShowCommentForm(false);
      setCommentField([]);
      setCommentProjectId(null);

      fetchProjects();
    } catch (err) {
      console.error("❌ COMMENT ERROR:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (
    projectId,
    fieldOrCommentId,
    maybeCommentId,
  ) => {
    try {
      setLoading(true);
      const commentId = maybeCommentId || fieldOrCommentId;

      const res = await fetch(
        `/api/project/${projectId}/comments?commentId=${commentId}`,
        {
          method: "DELETE",
        },
      );

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Delete failed");

      setComments(data.data ?? []);
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

  useEffect(() => {
    if (addError) {
      const timer = setTimeout(() => {
        setAddError("");
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [addError]);

  const TABLE_WIDTH = sidebarOpen ? 1400 : 1000;

  return (
    <div className="p-6">
      <button
        onClick={() => router.push("/gpb")}
        className="flex flex-row items-center mb-2 text-blue-600 gap-1"
      >
        <FiArrowLeft /> Back to GPB List
      </button>
      <div className="flex justify-between">
        <h2 className="text-3xl font-bold mb-4">GPB Year {year}</h2>

        <PrintGPB
          totalGAA={totalGAA}
          budgetYear={budgetYear}
          projects={projects}
        />
      </div>

      <div className=" flex gap-2"></div>
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
            <h3 className="text-xl font-semibold mb-3">Add Comment</h3>

            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fields{" "}
                <span className="text-xs text-gray-400">
                  (select one or more)
                </span>
              </label>
              <div className="border rounded p-2 max-h-48 overflow-y-auto flex flex-col gap-1">
                {[
                  { value: "project_type", label: "Project Type" },
                  { value: "gender_issue", label: "Gender Issue" },
                  {
                    value: "cause_gender_issue",
                    label: "Cause of Gender Issue",
                  },
                  { value: "gad_objective", label: "GAD Objective" },
                  {
                    value: "supporting_statistics_data",
                    label: "Supporting Statistics Data",
                  },
                  { value: "relevant_agency", label: "Relevant Agency" },
                  { value: "gad_activity", label: "GAD Activity" },
                  {
                    value: "performance_indicator_target",
                    label: "Performance Indicator Target",
                  },
                  { value: "gad_budget", label: "GAD Budget" },
                  { value: "source_budget", label: "Source Budget" },
                  { value: "responsible_office", label: "Responsible Office" },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={
                        Array.isArray(commentField) &&
                        commentField.includes(opt.value)
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setCommentField((prev) => [
                            ...(Array.isArray(prev) ? prev : []),
                            opt.value,
                          ]);
                        } else {
                          setCommentField((prev) =>
                            (Array.isArray(prev) ? prev : []).filter(
                              (f) => f !== opt.value,
                            ),
                          );
                        }
                      }}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
              {Array.isArray(commentField) && commentField.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {commentField.map((f) => (
                    <span
                      key={f}
                      className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full capitalize"
                    >
                      {f.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              )}
            </div>

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
                  setCommentField([]);
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
          <div className="flex items-center gap-2">
            {role !== "planning director" &&
              selectedGPBStatus?.status !== "approved" &&
              selectedGPBStatus?.status !== "disapproved" && (
                <button
                  type="button"
                  onClick={() => {
                    setShowWizard(true);
                    setWizardStep(1);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 transition"
                >
                  + Add Project
                </button>
              )}
            <button
              onClick={handleUpdateStatusModal}
              className="bg-blue-600 py-2 px-5 text-white rounded-md font-medium"
            >
              Update Status
            </button>
          </div>
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
              {status === "approved"
                ? "Total GAD Allocation Used"
                : "Projected GAD Allocation Utilization"}{" "}
              for {year}
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

        {/*Projected*/}
        {budgetSummary !== null && (
          <div className="bg-white border border-gray-200 p-4 h-20">
            <div className="mb-4 text-sm font-medium">
              {status === "approved"
                ? "Remaining GAD Budget"
                : "Projected Remaining GAD Budget"}{" "}
              for {year}
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

      {showEditModal && editRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl relative flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  Edit Project
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  All fields marked <span className="text-red-500">*</span> are
                  required
                </p>
              </div>
              <button
                onClick={cancelEdit}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-800 text-3xl transition"
              >
                ×
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto px-6 py-5 space-y-8 flex-1">
              {editError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                  {editError}
                </div>
              )}

              {/* Section 1 */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                    1
                  </div>
                  <h3 className="text-base font-semibold text-gray-700">
                    Gender Issue
                  </h3>
                </div>
                <div className="space-y-4 pl-8">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
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
                  </select>
                </div>

                <div className="space-y-4 pl-8">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Gender Issue / GAD Mandate{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                      rows={3}
                      value={editRow.gender_issue || ""}
                      onChange={(e) =>
                        handleEditRowChange("gender_issue", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Cause of the Gender Issue{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-2">
                      {(editRow.cause_gender_issue || [""]).map((val, idx) => (
                        <div key={idx} className="flex gap-2 items-start">
                          <span className="mt-2 text-xs text-gray-400 w-5 text-right shrink-0">
                            {idx + 1}.
                          </span>
                          <textarea
                            className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                            rows={2}
                            value={val}
                            onChange={(e) => {
                              const arr = [
                                ...(editRow.cause_gender_issue || [""]),
                              ];
                              arr[idx] = e.target.value;
                              handleEditRowChange("cause_gender_issue", arr);
                            }}
                          />
                          <div className="flex flex-col gap-1 mt-1 shrink-0">
                            {(editRow.cause_gender_issue || []).length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const arr = [...editRow.cause_gender_issue];
                                  arr.splice(idx, 1);
                                  handleEditRowChange(
                                    "cause_gender_issue",
                                    arr,
                                  );
                                }}
                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-100 text-red-600 hover:bg-red-200 text-base font-bold transition"
                              >
                                −
                              </button>
                            )}
                            {idx ===
                              (editRow.cause_gender_issue || []).length - 1 && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleEditRowChange("cause_gender_issue", [
                                    ...(editRow.cause_gender_issue || []),
                                    "",
                                  ])
                                }
                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-green-100 text-green-600 hover:bg-green-200 text-base font-bold transition"
                              >
                                +
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2 */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
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
                      <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-2">
                      {(editRow.gad_objective || [""]).map((val, idx) => (
                        <div key={idx} className="flex gap-2 items-start">
                          <span className="mt-2 text-xs text-gray-400 w-5 text-right shrink-0">
                            {idx + 1}.
                          </span>
                          <textarea
                            className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                            rows={2}
                            value={val}
                            onChange={(e) => {
                              const arr = [...(editRow.gad_objective || [""])];
                              arr[idx] = e.target.value;
                              handleEditRowChange("gad_objective", arr);
                            }}
                          />
                          <div className="flex flex-col gap-1 mt-1 shrink-0">
                            {(editRow.gad_objective || []).length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const arr = [...editRow.gad_objective];
                                  arr.splice(idx, 1);
                                  handleEditRowChange("gad_objective", arr);
                                }}
                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-100 text-red-600 hover:bg-red-200 text-base font-bold transition"
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
                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-green-100 text-green-600 hover:bg-green-200 text-base font-bold transition"
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
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
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
                      <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                      rows={2}
                      value={editRow.relevant_agency || ""}
                      onChange={(e) =>
                        handleEditRowChange("relevant_agency", e.target.value)
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Section 3 */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                    3
                  </div>
                  <h3 className="text-base font-semibold text-gray-700">
                    Activity & Budget
                  </h3>
                </div>
                <div className="space-y-4 pl-8">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      GAD Activity <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-2">
                      {(editRow.gad_activity || [""]).map((val, idx) => (
                        <div key={idx} className="flex gap-2 items-start">
                          <span className="mt-2 text-xs text-gray-400 w-5 text-right shrink-0">
                            {idx + 1}.
                          </span>
                          <textarea
                            className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                            rows={2}
                            value={val}
                            onChange={(e) => {
                              const arr = [...(editRow.gad_activity || [""])];
                              arr[idx] = e.target.value;
                              handleEditRowChange("gad_activity", arr);
                            }}
                          />
                          <div className="flex flex-col gap-1 mt-1 shrink-0">
                            {(editRow.gad_activity || []).length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const arr = [...editRow.gad_activity];
                                  arr.splice(idx, 1);
                                  handleEditRowChange("gad_activity", arr);
                                }}
                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-100 text-red-600 hover:bg-red-200 text-base font-bold transition"
                              >
                                −
                              </button>
                            )}
                            {idx ===
                              (editRow.gad_activity || []).length - 1 && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleEditRowChange("gad_activity", [
                                    ...(editRow.gad_activity || []),
                                    "",
                                  ])
                                }
                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-green-100 text-green-600 hover:bg-green-200 text-base font-bold transition"
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
                          <div className="flex flex-col gap-1 shrink-0">
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
                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-100 text-red-600 hover:bg-red-200 text-base font-bold transition"
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
                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-green-100 text-green-600 hover:bg-green-200 text-base font-bold transition"
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
                        GAD Budget <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                          ₱
                        </span>
                        <input
                          type="number"
                          min="0"
                          className="w-full border border-gray-300 rounded-xl pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
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
                        Source of Budget <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
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
                      <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                      rows={2}
                      value={editRow.responsible_office || ""}
                      onChange={(e) =>
                        handleEditRowChange(
                          "responsible_office",
                          e.target.value,
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
              <button
                type="button"
                onClick={cancelEdit}
                className="px-5 py-2 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <div className="flex flex-col items-end gap-1">
                {!isEditRowValid(editRow) && (
                  <span className="text-xs text-red-500">
                    Please fill in all required fields.
                  </span>
                )}
                <button
                  type="button"
                  onClick={saveEdit}
                  disabled={editLoading || !isEditRowValid(editRow)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {editLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">
                Add Project — Year {year}
              </h2>
              <button
                onClick={() => {
                  setShowWizard(false);
                  setWizardStep(1);
                }}
                className="text-gray-500 hover:text-gray-700 text-3xl leading-none"
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
                        ? "text-blue-600"
                        : wizardStep > i + 1
                          ? "text-green-600"
                          : "text-gray-400"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                        wizardStep === i + 1
                          ? "border-blue-600 bg-blue-50"
                          : wizardStep > i + 1
                            ? "border-green-600 bg-green-50"
                            : "border-gray-300"
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
                      className={`flex-1 h-0.5 ${wizardStep > i + 1 ? "bg-green-400" : "bg-gray-200"}`}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>

            {addError && (
              <div className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-red-600 text-sm">
                {addError}
              </div>
            )}

            {wizardStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
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
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gender Issue / GAD Mandate{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    value={newProject.gender_issue}
                    onChange={(e) =>
                      handleNewProjectChange("gender_issue", e.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cause of the Gender Issue{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  {newProject.cause_gender_issue.map((val, idx) => (
                    <div key={idx} className="flex gap-2 mb-2">
                      <textarea
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                              handleRemoveArrayField("cause_gender_issue", idx)
                            }
                            className="px-2 py-1 bg-red-500 text-white rounded text-xs"
                          >
                            -
                          </button>
                        )}
                        {idx === newProject.cause_gender_issue.length - 1 && (
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
              </div>
            )}

            {wizardStep === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    GAD Result Statement / GAD Objective{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  {newProject.gad_objective.map((val, idx) => (
                    <div key={idx} className="flex gap-2 mb-2">
                      <textarea
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Supporting Statistics / Data
                  </label>
                  <textarea
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Relevant Agency MFO/PAP{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    GAD Activity <span className="text-red-500">*</span>
                  </label>
                  {newProject.gad_activity.map((val, idx) => (
                    <div key={idx} className="flex gap-2 mb-2">
                      <textarea
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={2}
                        value={val}
                        onChange={(e) =>
                          handleArrayFieldChange(
                            "gad_activity",
                            idx,
                            e.target.value,
                          )
                        }
                      />
                      <div className="flex flex-col gap-1">
                        {newProject.gad_activity.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              handleRemoveArrayField("gad_activity", idx)
                            }
                            className="px-2 py-1 bg-red-500 text-white rounded text-xs"
                          >
                            -
                          </button>
                        )}
                        {idx === newProject.gad_activity.length - 1 && (
                          <button
                            type="button"
                            onClick={() => handleAddArrayField("gad_activity")}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                        {newProject.performance_indicator_target.length > 1 && (
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      GAD Budget <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={newProject.gad_budget}
                      onChange={(e) =>
                        handleNewProjectChange(
                          "gad_budget",
                          Number(e.target.value),
                        )
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Source of Budget <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={2}
                      value={newProject.source_budget}
                      onChange={(e) =>
                        handleNewProjectChange("source_budget", e.target.value)
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Responsible Unit/Office{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    value={newProject.responsible_office}
                    onChange={(e) =>
                      handleNewProjectChange(
                        "responsible_office",
                        e.target.value,
                      )
                    }
                  />
                </div>
              </div>
            )}

            {wizardStep === 4 && (
              <div className="space-y-3 text-sm">
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div>
                    <span className="font-medium text-gray-600">
                      Project Type:
                    </span>
                    <p className="mt-0.5 text-gray-800">
                      {newProject.project_type || "—"}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">
                      Gender Issue:
                    </span>
                    <p className="mt-0.5 text-gray-800">
                      {newProject.gender_issue || "—"}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">
                      Cause of Gender Issue:
                    </span>
                    <ul className="mt-0.5 list-disc list-inside text-gray-800">
                      {newProject.cause_gender_issue
                        .filter(Boolean)
                        .map((v, i) => (
                          <li key={i}>{v}</li>
                        ))}
                    </ul>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">
                      GAD Objective:
                    </span>
                    <ul className="mt-0.5 list-disc list-inside text-gray-800">
                      {newProject.gad_objective.filter(Boolean).map((v, i) => (
                        <li key={i}>{v}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">
                      Supporting Statistics:
                    </span>
                    <p className="mt-0.5 text-gray-800">
                      {newProject.supporting_statistics_data || "—"}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">
                      Relevant Agency:
                    </span>
                    <p className="mt-0.5 text-gray-800">
                      {newProject.relevant_agency || "—"}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">
                      GAD Activity:
                    </span>
                    <ul className="mt-0.5 list-disc list-inside text-gray-800">
                      {newProject.gad_activity.filter(Boolean).map((v, i) => (
                        <li key={i}>{v}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">
                      Performance Indicators:
                    </span>
                    <ul className="mt-0.5 list-disc list-inside text-gray-800">
                      {serializeIndicators(
                        newProject.performance_indicator_target,
                      ).map((v, i) => (
                        <li key={i}>{v}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="font-medium text-gray-600">
                        GAD Budget:
                      </span>
                      <p className="mt-0.5 text-gray-800">
                        ₱{Number(newProject.gad_budget || 0).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">
                        Source of Budget:
                      </span>
                      <p className="mt-0.5 text-gray-800">
                        {newProject.source_budget || "—"}
                      </p>
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">
                      Responsible Office:
                    </span>
                    <p className="mt-0.5 text-gray-800">
                      {newProject.responsible_office || "—"}
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
                <div className="flex flex-col gap-2 mt-6 pt-4 border-t border-gray-200">
                  {!stepValid && (
                    <div className="text-xs text-red-500 text-right">
                      Please fill in all required fields before continuing.
                    </div>
                  )}
                  <div className="flex justify-between">
                    <button
                      type="button"
                      onClick={() =>
                        wizardStep === 1
                          ? (setShowWizard(false), setWizardStep(1))
                          : setWizardStep(wizardStep - 1)
                      }
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
                    >
                      {wizardStep === 1 ? "Cancel" : "← Back"}
                    </button>
                    {wizardStep < 4 ? (
                      <button
                        type="button"
                        onClick={() => setWizardStep(wizardStep + 1)}
                        disabled={!stepValid}
                        className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        Next →
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleWizardSubmit}
                        disabled={
                          addLoading ||
                          !isStep3Valid(newProject) ||
                          !isStep1Valid(newProject) ||
                          !isStep2Valid(newProject)
                        }
                        className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {addLoading ? "Saving..." : "Submit"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {loading ? (
        <div className="h-screen">Loading projects...</div>
      ) : (
        <div className="overflow-x-auto">
          <form onSubmit={handleAddProject}>
            {addError && (
              <div className="whitespace-pre-line rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-red-600 mb-4">
                {addError}
              </div>
            )}
            <div
              className="transition-all duration-300 w-full"
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
                        Comments
                      </th>
                      {role !== "planning director" && (
                        <>
                          <th className="py-2 px-4 border-b text-center w-10 text-xs">
                            Number of Events
                          </th>
                          <th className="py-2 px-4 border-b text-center w-10 text-xs">
                            Actions
                          </th>
                        </>
                      )}
                    </tr>

                    {false &&
                      role !== "planning director" &&
                      selectedGPBStatus?.status !== "approved" &&
                      selectedGPBStatus?.status !== "disapproved" && (
                        <tr className="bg-gray-100 sticky top-[41px] z-10">
                          <td className="py-2 px-4 border-b">--</td>

                          <td className="py-2 px-4 border-b">
                            <textarea
                              className="w-10 border rounded px-2 py-1"
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
                                  className="w-10 border rounded px-2 py-1"
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
                                  className="w-10 border rounded px-2 py-1"
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
                              className="w-10 border rounded px-2 py-1"
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
                              className="w-10 border rounded px-2 py-1"
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
                                  className="w-10 border rounded px-2 py-1"
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
                            <input
                              type="number"
                              min="0"
                              className="w-20 border rounded px-2 py-1"
                              value={newProject.gad_budget}
                              onChange={(e) =>
                                handleNewProjectChange(
                                  "gad_budget",
                                  Number(e.target.value),
                                )
                              }
                              required
                            />
                          </td>
                          <td className="py-2 px-4 border-b">
                            <textarea
                              className="w-10 border rounded px-2 py-1"
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
                              className="w-10 border rounded px-2 py-1"
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

                      return (
                        <React.Fragment key={project._id}>
                          {shouldShowTypeHeader && (
                            <tr className="bg-orange-300 border-y border-black">
                              <td
                                colSpan={role !== "planning director" ? 14 : 12}
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
                                        className="py-2 px-4 border text-xs"
                                        rowSpan={maxRows}
                                      >
                                        <div>
                                          {project._raw.gender_issue?.value}
                                        </div>
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
                                            className="py-2 px-4 border text-xs"
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
                                              fieldComments={
                                                project.comments?.filter((c) =>
                                                  Array.isArray(c.fields)
                                                    ? c.fields.includes(
                                                        "cause_gender_issue",
                                                      )
                                                    : c.field ===
                                                      "cause_gender_issue",
                                                ) ?? []
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
                                                setCommentProjectId(
                                                  project._id,
                                                );
                                                setShowCommentForm(true);
                                              }}
                                              onDeleteComment={
                                                handleDeleteComment
                                              }
                                            />
                                          </td>
                                        )
                                      : rowIdx < editCauseArr.length && (
                                          <td className="py-2 px-4 border">
                                            <div className="flex items-center gap-1">
                                              <textarea
                                                className="w-40 border rounded px-2 py-1"
                                                value={
                                                  editCauseArr[rowIdx] || ""
                                                }
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
                                                      const arr = [
                                                        ...editCauseArr,
                                                      ];
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
                                            className="py-2 px-4 border text-xs"
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
                                                      const arr = [
                                                        ...editObjArr,
                                                      ];
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
                                    {editingId === project._id ? (
                                      <td
                                        className="py-2 px-4 border text-xs"
                                        rowSpan={editMaxRows}
                                      >
                                        <textarea
                                          className="w-40 border rounded px-2 py-1"
                                          value={
                                            editRow.supporting_statistics_data
                                          }
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
                                        className="py-2 px-4 border text-xs"
                                        rowSpan={maxRows}
                                      >
                                        {project.supporting_statistics_data}
                                      </td>
                                    )}

                                    {editingId === project._id ? (
                                      <td
                                        className="py-2 px-4 border text-xs"
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
                                        className="py-2 px-4 border text-xs"
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
                                            className="py-2 px-4 border text-xs"
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
                                                      const arr = [
                                                        ...editActArr,
                                                      ];
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
                                            className="py-2 px-4 border text-xs"
                                            rowSpan={editMaxRows}
                                          >
                                            <div className="flex items-start gap-1">
                                              {editPerfArr[0]?._raw !==
                                              undefined ? (
                                                <textarea
                                                  className="w-40 border rounded px-2 py-1"
                                                  value={editPerfArr[0]._raw}
                                                  onChange={(e) =>
                                                    handleEditIndicatorChange(
                                                      0,
                                                      {
                                                        _raw: e.target.value,
                                                      },
                                                    )
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
                                                      handleRemoveEditIndicator(
                                                        0,
                                                      )
                                                    }
                                                  >
                                                    -
                                                  </button>
                                                )}
                                                <button
                                                  type="button"
                                                  className="px-2 py-1 bg-green-500 text-white rounded text-xs"
                                                  onClick={
                                                    handleAddEditIndicator
                                                  }
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
                                                  value={
                                                    editPerfArr[rowIdx]._raw
                                                  }
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
                                                    onClick={
                                                      handleAddEditIndicator
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
                                    {actArr.length === 1 ? (
                                      rowIdx === 0 && (
                                        <td
                                          className="py-2 px-4 border text-xs"
                                          rowSpan={maxRows}
                                        >
                                          {actArr[0]}
                                        </td>
                                      )
                                    ) : (
                                      <td className="py-2 px-4 border text-xs">
                                        {actArr[rowIdx] || ""}
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
                                    {editingId === project._id ? (
                                      <td
                                        className="py-2 px-4 border text-center text-xs"
                                        rowSpan={editMaxRows}
                                      >
                                        <input
                                          type="number"
                                          min="0"
                                          className="w-32 border rounded px-2 py-1"
                                          value={editRow.gad_budget}
                                          onChange={(e) =>
                                            handleEditRowChange(
                                              "gad_budget",
                                              Number(e.target.value),
                                            )
                                          }
                                          required
                                        />
                                      </td>
                                    ) : (
                                      <td
                                        className="py-2 px-4 border text-center text-xs"
                                        rowSpan={maxRows}
                                      >
                                        {Number(
                                          project.gad_budget,
                                        ).toLocaleString(undefined, {
                                          minimumFractionDigits: 2,
                                        })}
                                      </td>
                                    )}
                                    {editingId === project._id ? (
                                      <td
                                        className="py-2 px-4 border text-center text-xs"
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
                                        className="py-2 px-4 border text-center text-xs"
                                        rowSpan={maxRows}
                                      >
                                        {project.source_budget}
                                      </td>
                                    )}
                                    {editingId === project._id ? (
                                      <td
                                        className="py-2 px-4 border text-xs"
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
                                        className="py-2 px-4 border text-xs"
                                        rowSpan={maxRows}
                                      >
                                        {project.responsible_office}
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
                                                          handleDeleteComment(
                                                            project._id,
                                                            c._id,
                                                          )
                                                        }
                                                        className="ml-1 text-red-400 hover:text-red-600 text-xs"
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
                                            onClick={() => {
                                              setCommentField(["general"]);
                                              setCommentProjectId(project._id);
                                              setShowCommentForm(true);
                                            }}
                                            className="mt-1 text-blue-500 hover:underline text-xs"
                                          >
                                            + Add Comment
                                          </button>
                                        )}
                                      </td>
                                    )}
                                    {role !== "planning director" && (
                                      <>
                                        <td
                                          className="py-2 px-4 border text-sm"
                                          rowSpan={editMaxRows}
                                        >
                                          {Array.isArray(project.events)
                                            ? project.events.length
                                            : 0}
                                        </td>
                                        <td
                                          className="py-2 px-4 border text-sm"
                                          rowSpan={editMaxRows}
                                        >
                                          {editingId === project._id ? (
                                            <>
                                              <button
                                                type="button"
                                                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition"
                                                onClick={(e) => {
                                                  e.preventDefault();
                                                  saveEdit();
                                                }}
                                                disabled={editLoading}
                                              >
                                                {editLoading
                                                  ? "Saving..."
                                                  : "Save"}
                                              </button>
                                              <button
                                                type="button"
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
                                                <div className="flex flex-col items-center gap-2">
                                                  <button
                                                    type="button"
                                                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                                                    onClick={() =>
                                                      router.push(
                                                        `/gpb/dump/${project._id}`,
                                                      )
                                                    }
                                                  >
                                                    View
                                                  </button>
                                                  {selectedGPBStatus?.status !==
                                                    "approved" &&
                                                    selectedGPBStatus?.status !==
                                                      "disapproved" && (
                                                      <button
                                                        type="button"
                                                        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition"
                                                        onClick={() =>
                                                          startEdit(project)
                                                        }
                                                      >
                                                        Edit
                                                      </button>
                                                    )}
                                                  {selectedGPBStatus?.status !==
                                                    "approved" &&
                                                    selectedGPBStatus?.status !==
                                                      "disapproved" && (
                                                      <button
                                                        type="button"
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
