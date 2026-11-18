"use client";

import { useState } from "react";
import { findDuplicates } from "@/data/lib/duplicateDetection";
import { toOfficeArray } from "@/data/lib/colleges";
import {
  addActivityRow,
  alignActivityDescriptions,
  describeBudgetRejection,
  describeBudgetWarning,
  emptyIndicator,
  isNonEmptyArrayFilled,
  parsePerformanceIndicator,
  removeActivityRow,
  serializeIndicators,
  setActivityDescription,
  setActivityTitle,
} from "../lib/projectForm";

const DUPLICATE_THRESHOLD = 0.7;

/* Possible duplicates of `genderIssue` among this year's other projects. */
function duplicatesFor(genderIssue, projects, year, excludeId) {
  if (!genderIssue?.trim()) return [];
  const sameYear = projects.filter(
    (p) => Number(p.year) === Number(year) && p._id !== excludeId,
  );
  return findDuplicates(genderIssue, sameYear, DUPLICATE_THRESHOLD);
}

const emptyNewProject = (year) => ({
  year: Number(year),
  project_type: "",
  gender_issue: "",
  cause_gender_issue: [""],
  gad_objective: [""],
  supporting_statistics_data: "",
  relevant_agency: "",
  gad_activity: [""],
  gad_activity_description: [""],
  performance_indicator_target: [emptyIndicator()],
  gad_budget: "",
  source_budget: "",
  responsible_office: [],
});

/* State and handlers for the "+ Add Project" wizard. The creator is taken
   from the session by the API, so no user id is sent. */
export function useAddProject({ year, projects, onCreated }) {
  const [newProject, setNewProject] = useState(() => emptyNewProject(year));
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  // Shown when a project is created while no GAA budget exists for the year.
  const [addWarning, setAddWarning] = useState("");
  const [duplicateWarnings, setDuplicateWarnings] = useState([]);

  const openWizard = () => {
    setShowWizard(true);
    setWizardStep(1);
  };

  const closeWizard = () => {
    if (addLoading) return;
    setShowWizard(false);
    setWizardStep(1);
  };

  const handleNewProjectChange = (field, value) => {
    setNewProject((prev) => ({ ...prev, [field]: value }));
    if (field === "gender_issue") {
      setDuplicateWarnings(duplicatesFor(value, projects, year));
    }
  };

  const handleArrayFieldChange = (field, idx, value) =>
    setNewProject((prev) => {
      const arr = Array.isArray(prev[field]) ? [...prev[field]] : [""];
      arr[idx] = value;
      return { ...prev, [field]: arr };
    });

  const handleAddArrayField = (field) =>
    setNewProject((prev) => {
      const arr = Array.isArray(prev[field]) ? [...prev[field]] : [""];
      arr.push(field === "performance_indicator_target" ? emptyIndicator() : "");
      return { ...prev, [field]: arr };
    });

  const handleRemoveArrayField = (field, idx) =>
    setNewProject((prev) => {
      const arr = Array.isArray(prev[field]) ? [...prev[field]] : [""];
      if (arr.length > 1) arr.splice(idx, 1);
      return { ...prev, [field]: arr };
    });

  const handleWizardSubmit = async () => {
    if (addLoading) return;
    if (!isNonEmptyArrayFilled(newProject.responsible_office)) {
      setAddError("Please select at least one responsible unit/office.");
      return;
    }
    setAddLoading(true);
    setAddError("");
    setAddWarning("");
    try {
      const res = await fetch("/api/project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newProject,
          performance_indicator_target: serializeIndicators(
            newProject.performance_indicator_target,
          ),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAddError(
          data.budgetSummary
            ? describeBudgetRejection(data)
            : data.message || data.error || "Failed to add project",
        );
        return;
      }
      if (data.duplicateWarnings?.length > 0) {
        setDuplicateWarnings(data.duplicateWarnings);
      }
      if (data.warning) setAddWarning(describeBudgetWarning(data));
      setNewProject(emptyNewProject(year));
      setShowWizard(false);
      setWizardStep(1);
      onCreated?.();
    } catch {
      setAddError("Network error");
    } finally {
      setAddLoading(false);
    }
  };

  return {
    newProject,
    showWizard,
    wizardStep,
    setWizardStep,
    setShowWizard,
    openWizard,
    closeWizard,
    addLoading,
    addError,
    setAddError,
    addWarning,
    setAddWarning,
    duplicateWarnings,
    handleNewProjectChange,
    handleArrayFieldChange,
    handleAddArrayField,
    handleRemoveArrayField,
    handleActivityTitleChange: (idx, value) =>
      setNewProject((prev) => setActivityTitle(prev, idx, value)),
    handleActivityDescriptionChange: (idx, value) =>
      setNewProject((prev) => setActivityDescription(prev, idx, value)),
    handleAddActivityRow: () => setNewProject(addActivityRow),
    handleRemoveActivityRow: (idx) =>
      setNewProject((prev) => removeActivityRow(prev, idx)),
    handleWizardSubmit,
  };
}

/* State and handlers for the edit-project modal. */
export function useEditProject({ year, projects, onSaved }) {
  const [editRow, setEditRow] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [editDuplicateWarnings, setEditDuplicateWarnings] = useState([]);

  const startEdit = (project) => {
    setEditRow({
      ...project,
      responsible_office: toOfficeArray(project.responsible_office),
      performance_indicator_target: (
        project.performance_indicator_target || [""]
      ).map((p) => (typeof p === "string" ? parsePerformanceIndicator(p) : p)),
      gad_activity_description: alignActivityDescriptions(
        project.gad_activity,
        project.gad_activity_description,
      ),
    });
    setEditError("");
    setEditDuplicateWarnings([]);
  };

  const cancelEdit = () => {
    if (editLoading) return;
    setEditRow(null);
    setEditError("");
  };

  /* Functional update: a stale `editRow` from an earlier render can no
     longer drop a keystroke. */
  const updateRow = (fn) => setEditRow((prev) => (prev ? fn(prev) : prev));

  const handleEditRowChange = (field, value) => {
    updateRow((prev) => ({ ...prev, [field]: value }));
    if (field === "gender_issue") {
      setEditDuplicateWarnings(
        duplicatesFor(value, projects, year, editRow?._id),
      );
    }
  };

  const saveEdit = async () => {
    if (!editRow || editLoading) return;
    if (!isNonEmptyArrayFilled(editRow.responsible_office)) {
      setEditError("Please select at least one responsible unit/office.");
      return;
    }

    setEditLoading(true);
    setEditError("");
    try {
      const res = await fetch(`/api/project/${editRow._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_type: editRow.project_type,
          gender_issue: editRow.gender_issue,
          cause_gender_issue: editRow.cause_gender_issue,
          gad_objective: editRow.gad_objective,
          gad_activity: editRow.gad_activity,
          gad_activity_description: alignActivityDescriptions(
            editRow.gad_activity,
            editRow.gad_activity_description,
          ),
          supporting_statistics_data: editRow.supporting_statistics_data,
          relevant_agency: editRow.relevant_agency,
          performance_indicator_target: serializeIndicators(
            editRow.performance_indicator_target,
          ),
          gad_budget: editRow.gad_budget,
          source_budget: editRow.source_budget,
          responsible_office: editRow.responsible_office,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEditError(data.error || data.message || "Failed to update");
        return;
      }
      setEditRow(null);
      onSaved?.();
    } catch (err) {
      console.error(err);
      setEditError("Network error");
    } finally {
      setEditLoading(false);
    }
  };

  return {
    editRow,
    editLoading,
    editError,
    editDuplicateWarnings,
    startEdit,
    cancelEdit,
    saveEdit,
    handleEditRowChange,
    handleEditActivityTitleChange: (idx, value) =>
      updateRow((prev) => setActivityTitle(prev, idx, value)),
    handleEditActivityDescriptionChange: (idx, value) =>
      updateRow((prev) => setActivityDescription(prev, idx, value)),
    handleAddEditActivityRow: () => updateRow(addActivityRow),
    handleRemoveEditActivityRow: (idx) =>
      updateRow((prev) => removeActivityRow(prev, idx)),
  };
}
