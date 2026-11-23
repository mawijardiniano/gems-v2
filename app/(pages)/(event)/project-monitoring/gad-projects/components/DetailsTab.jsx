"use client";

import React, { useState } from "react";
import axios from "axios";
import { appDateInput } from "@/data/lib/appTime";
import {
  ayLabel,
  formatDate,
  getArrayValue,
  getFieldValue,
} from "../../lib/projectView";
import {
  PROJECT_STATUSES,
  PROJECT_STATUS_META,
  getProjectStatus,
} from "../lib/gadProjects";
import {
  DetailList,
  DetailRow,
  EditButton,
  ErrorNote,
  FieldLabel,
  SaveCancel,
  StatusPill,
  inputClass,
} from "./DetailFields";

/* Start/end dates and status, editable by those who manage the project. */
function ScheduleSection({ project, canManage, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const statusMeta = PROJECT_STATUS_META[getProjectStatus(project)];

  const start = () => {
    setError("");
    /* The Manila day of a stored date — the browser's local day showed the
       previous day west of UTC+8, and saving unchanged moved it back a day. */
    setDraft({
      start_date: appDateInput(project.start_date),
      end_date: appDateInput(project.end_date),
      project_status: getProjectStatus(project),
    });
    setEditing(true);
  };

  const save = async () => {
    if (saving) return;
    const { start_date, end_date, project_status } = draft;
    // "YYYY-MM-DD" strings compare in date order.
    if (start_date && end_date && end_date < start_date) {
      setError("End date must be on or after the start date.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const changes = {
        start_date: start_date || null,
        end_date: end_date || null,
        project_status,
      };
      await axios.put(`/api/project/${project._id}`, changes, {
        withCredentials: true,
      });
      onSaved(changes);
      setEditing(false);
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          "Failed to save schedule and status. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const set = (field) => (e) =>
    setDraft((d) => ({ ...d, [field]: e.target.value }));

  return (
    <section className="rounded-xl bg-white border border-gray-100 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <FieldLabel>Schedule &amp; Status</FieldLabel>
        {canManage && !editing && (
          <EditButton onClick={start}>
            {project.start_date || project.end_date ? "Update" : "Set Schedule"}
          </EditButton>
        )}
      </div>
      {editing ? (
        <div className="space-y-3">
          {error && <ErrorNote>{error}</ErrorNote>}
          <label className="block">
            <FieldLabel className="mb-1">Start Date</FieldLabel>
            <input
              type="date"
              value={draft.start_date}
              onChange={set("start_date")}
              className={inputClass}
            />
          </label>
          <label className="block">
            <FieldLabel className="mb-1">End Date</FieldLabel>
            <input
              type="date"
              value={draft.end_date}
              onChange={set("end_date")}
              className={inputClass}
            />
          </label>
          <label className="block">
            <FieldLabel className="mb-1">Status</FieldLabel>
            <select
              value={draft.project_status}
              onChange={set("project_status")}
              className={inputClass}
            >
              {PROJECT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {PROJECT_STATUS_META[s].label}
                </option>
              ))}
            </select>
          </label>
          <SaveCancel
            saving={saving}
            onSave={save}
            onCancel={() => {
              setEditing(false);
              setError("");
            }}
          />
        </div>
      ) : (
        <>
          <DetailRow label="Start Date" value={formatDate(project.start_date)} />
          <DetailRow label="End Date" value={formatDate(project.end_date)} />
          <div>
            <FieldLabel>Status</FieldLabel>
            <span className="mt-0.5 inline-block">
              <StatusPill meta={statusMeta} />
            </span>
          </div>
          {!canManage && (
            <p className="text-[11px] text-gray-500 italic">
              Only the project creator or a GAD Focal Person can set the schedule
              and status.
            </p>
          )}
        </>
      )}
    </section>
  );
}

/* "Project Details" tab: the plan fields and the schedule. */
export default function DetailsTab({ project, canManage, onSaved }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-in" role="tabpanel">
      <section className="rounded-xl bg-white border border-gray-100 p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Project Information
        </p>
        <DetailRow
          label="Academic Year"
          value={project.year ? ayLabel(project.year) : "—"}
        />
        <DetailRow label="Project Type" value={getFieldValue(project.project_type)} />
        <DetailRow
          label="GAD Mandate (Gender Issue)"
          value={getFieldValue(project.gender_issue)}
        />
        <DetailList label="GAD Objective" items={getArrayValue(project.gad_objective)} />
        <DetailList
          label="GAD Activity"
          items={getArrayValue(project.gad_activity)}
          descriptions={getArrayValue(project.gad_activity_description)}
        />
        <DetailRow
          label="Responsible Office/Unit"
          value={getArrayValue(project.responsible_office).join(", ")}
        />
        <DetailList
          label="Performance Indicator / Target"
          items={getArrayValue(project.performance_indicator_target)}
        />
      </section>

      <ScheduleSection project={project} canManage={canManage} onSaved={onSaved} />
    </div>
  );
}
