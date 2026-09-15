"use client";

import { useState } from "react";
import useIntegrationData from "../components/integration/useIntegrationData";
import StagingWorkspace from "../components/integration/StagingWorkspace";
import SyncLogsPanel from "../components/integration/SyncLogsPanel";
import { MessageBanner } from "../components/integration/statuses";
import { buildSchoolYearOptions } from "../components/integration/schoolYears";

const TABS = [
  { id: "staging", label: "Staging Areas" },
  { id: "logs", label: "Synchronization Logs" },
];

export default function ManualUploadContent() {
  const d = useIntegrationData();
  const [tab, setTab] = useState("staging");
  const [uploadFile, setUploadFile] = useState(null);
  const [schoolYear, setSchoolYear] = useState("");
  const [semester, setSemester] = useState("");

  function onUploadCsv(e) {
    e.preventDefault();
    if (!uploadFile) {
      d.setMessage({ type: "error", text: "Please choose a CSV file first." });
      return;
    }
    d.runAction("Upload to Staging", () => {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("school_year", schoolYear);
      formData.append("semester", semester);
      return {
        url: "/api/integration/upload",
        options: {
          method: "POST",
          credentials: "include",
          body: formData,
        },
      };
    });
  }

  return (
    <div className="py-8 space-y-4">
      <div className="bg-white border border-gray-200 rounded-md p-4">
        <h1 className="text-lg font-semibold text-gray-900">Manual Upload</h1>
        <p className="text-sm text-gray-600">
          Upload SIS/ARO CSV files into the staging area, validate, review, and
          migrate into production. XLSX support is not enabled yet.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-md p-4 space-y-3">
        <h2 className="text-base font-medium text-gray-900">
          Upload CSV to Staging
        </h2>
        <form
          onSubmit={onUploadCsv}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3"
        >
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          />
          <select
            value={schoolYear}
            onChange={(e) => setSchoolYear(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          >
            <option value="">Default school year</option>
            {buildSchoolYearOptions().map((sy) => (
              <option key={sy} value={sy}>
                {sy}
              </option>
            ))}
          </select>
          <select
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          >
            <option value="">Default semester</option>
            <option value="1st">1st</option>
            <option value="2nd">2nd</option>
            <option value="Summer">Summer</option>
          </select>
          <div className="sm:col-span-3">
            <button
              type="submit"
              disabled={d.busyAction !== ""}
              className="px-4 py-2 rounded bg-emerald-600 text-white text-sm disabled:opacity-50"
            >
              {d.busyAction === "Upload to Staging"
                ? "Uploading..."
                : "Upload to Staging"}
            </button>
          </div>
        </form>
      </div>

      <MessageBanner message={d.message} />

      <div className="bg-white border border-gray-200 rounded-md">
        <div className="flex gap-1 border-b border-gray-200 px-4 pt-3">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-3 py-2 text-sm rounded-t-md -mb-px border-b-2 ${
                tab === t.id
                  ? "border-blue-600 text-blue-700 font-medium"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="p-4">
          {tab === "staging" && <StagingWorkspace d={d} />}
          {tab === "logs" && (
            <div>
              {d.selectedBatch ? (
                <>
                  <p className="text-xs text-gray-500 mb-2">
                    Sync logs for batch:{" "}
                    <span className="font-semibold">
                      {d.selectedBatch.source_name || d.selectedBatch._id}
                    </span>
                  </p>
                  <SyncLogsPanel
                    logs={d.logs}
                    loading={d.loadingDetails}
                    records={d.records}
                  />
                </>
              ) : (
                <p className="text-sm text-gray-500">
                  Select a batch in the Staging Areas tab to view its
                  synchronization logs.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}