"use client";

import { useEffect, useState } from "react";
import useIntegrationData from "../components/integration/useIntegrationData";
import StagingWorkspace from "../components/integration/StagingWorkspace";
import FieldMappingPanel from "../components/integration/FieldMappingPanel";
import SyncLogsPanel from "../components/integration/SyncLogsPanel";
import { MessageBanner } from "../components/integration/statuses";
import { buildSchoolYearOptions } from "../components/integration/schoolYears";

const TABS = [
  { id: "staging", label: "Staging Areas" },
  { id: "mapping", label: "Field Mapping" },
  { id: "logs", label: "Synchronization Logs" },
];

export default function IntegrationContent() {
  const d = useIntegrationData();
  const [tab, setTab] = useState("staging");

  const [config, setConfig] = useState(null);
  const [endpoint, setEndpoint] = useState("");
  const [authHeader, setAuthHeader] = useState("");
  const [cfgSchoolYear, setCfgSchoolYear] = useState("");
  const [cfgSemester, setCfgSemester] = useState("");
  const [savingConfig, setSavingConfig] = useState(false);

  async function loadConfig() {
    try {
      const res = await fetch("/api/integration/config", {
        credentials: "include",
      });
      const data = await res.json();
      if (data?.status === "success" && data.data) {
        setConfig(data.data);
        setEndpoint(data.data.endpoint || "");
        setCfgSchoolYear(data.data.school_year || "");
        setCfgSemester(data.data.semester || "");
        const authz = Object.entries(data.data.headers || {}).find(
          ([key]) => key.toLowerCase() === "authorization",
        );
        if (authz) setAuthHeader(authz[1] || "");
      }
    } catch {
     
    }
  }

  useEffect(() => {
    loadConfig();
  }, []);

  async function saveConfig(e) {
    e.preventDefault();
    setSavingConfig(true);
    d.setMessage(null);
    try {
      const res = await fetch("/api/integration/config", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint,
          headers: authHeader ? { Authorization: authHeader } : {},
          school_year: cfgSchoolYear,
          semester: cfgSemester,
        }),
      });
      const data = await res.json();
      if (!res.ok || data?.status === "error") {
        throw new Error(data?.message || "Failed to save config");
      }
      d.setMessage({ type: "success", text: "HRMIS connection config saved." });
      await loadConfig();
    } catch (err) {
      d.setMessage({
        type: "error",
        text: err.message || "Failed to save config",
      });
    } finally {
      setSavingConfig(false);
    }
  }

  async function syncNow(e) {
    e.preventDefault();
    await d.runAction("Sync Now", () => ({
      url: "/api/integration/fetch",
      options: {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          school_year: cfgSchoolYear,
          semester: cfgSemester,
        }),
      },
    }));
    await loadConfig();
  }

  const lastSync = config?.last_sync_at
    ? new Date(config.last_sync_at).toLocaleString()
    : null;

  return (
    <div className="py-8 space-y-4">
      <div className="bg-white border border-gray-200 rounded-md p-4">
        <h1 className="text-lg font-semibold text-gray-900">
          Data Integration
        </h1>
        <p className="text-sm text-gray-600">
          Connect to the HRMIS API, sync employee and student data into the
          staging area, validate, review, and migrate into production.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-md p-4 space-y-3">
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div>
            <h2 className="text-base font-medium text-gray-900">
              HRMIS API Integration
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              {config?.last_sync_at ? (
                <>
                  Last synchronization: {lastSync}
                  {config?.last_sync_message
                    ? ` — ${config.last_sync_message}`
                    : ""}
                </>
              ) : (
                "Not synchronized yet."
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`text-xs px-2 py-1 rounded inline-flex items-center gap-1 ${
                endpoint
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full inline-block ${
                  endpoint ? "bg-green-500" : "bg-gray-400"
                }`}
              />
              {endpoint ? "Connected" : "Not Configured"}
            </span>
            <button
              type="button"
              onClick={syncNow}
              disabled={d.busyAction !== "" || !endpoint}
              className="px-4 py-2 rounded bg-blue-600 text-white text-sm disabled:opacity-50"
            >
              {d.busyAction === "Sync Now" ? "Syncing..." : "Sync Now"}
            </button>
          </div>
        </div>

        <form
          onSubmit={saveConfig}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-gray-100 pt-3"
        >
          <input
            type="url"
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            placeholder="HRMIS API endpoint (https://...)"
            required
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm sm:col-span-2"
          />
          <input
            type="password"
            value={authHeader}
            onChange={(e) => setAuthHeader(e.target.value)}
            placeholder="Authorization header value (optional, stored securely)"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              value={cfgSchoolYear}
              onChange={(e) => setCfgSchoolYear(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="">Default school year</option>
              {buildSchoolYearOptions(cfgSchoolYear).map((sy) => (
                <option key={sy} value={sy}>
                  {sy}
                </option>
              ))}
            </select>
            <select
              value={cfgSemester}
              onChange={(e) => setCfgSemester(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="">Default semester</option>
              <option value="1st">1st</option>
              <option value="2nd">2nd</option>
              <option value="Summer">Summer</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={savingConfig}
              className="px-4 py-2 rounded border border-gray-300 text-sm disabled:opacity-50"
            >
              {savingConfig ? "Saving..." : "Save Connection"}
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
          {tab === "mapping" && <FieldMappingPanel />}
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