"use client";

import { useMemo, useState } from "react";
import { FaUserTie } from "react-icons/fa";
import { OFFICE_OPTIONS } from "@/lib/colleges";
import {
  useGenderStats,
  LoadingState,
  ErrorState,
  SummaryCards,
  SexDonut,
  SexTable,
  DemographicTable,
} from "../components/GenderStatsShared";
import {
  APPOINTMENT_ORDER,
  CATEGORY_ORDER,
  EMPTY_EMPLOYEE_FILTERS,
  LIVE_APPOINTMENT_STATUSES,
  LIVE_PERSONNEL_TYPES,
  POSITION_LEVEL_ORDER,
  activeFilterCount,
  computeEmployeeStats,
  departmentOptions,
  filterEmployeeRecords,
} from "../components/employeeStats";
import {
  SAMPLE_EMPLOYEE_COUNT,
  SAMPLE_EMPLOYEE_RECORDS,
} from "../components/employeeSampleRecords";
import {
  QUICK_REPORT_OPTIONS,
  downloadQuickReport,
} from "../components/quickReports";

function buildInsights(data) {
  const t = data?.totals;
  if (!t || !t.total) return [];
  const insights = [];

  insights.push(
    `Female employees constitute ${t.pctFemale}% of the total employee population (${t.Female.toLocaleString()} of ${t.total.toLocaleString()}).`,
  );
  insights.push(
    `Male employees account for ${t.pctMale}% (${t.Male.toLocaleString()}) of employees.`,
  );

  const offices = (data.byOffice || []).filter((o) => o.total >= 3);
  if (offices.length > 1) {
    const mostFemale = [...offices].sort((a, b) => b.pctFemale - a.pctFemale)[0];
    const mostMale = [...offices].sort((a, b) => a.pctFemale - b.pctFemale)[0];
    insights.push(
      `${mostFemale.office} has the highest share of female employees (${mostFemale.pctFemale}%).`,
    );
    insights.push(
      `${mostMale.office} is the most male-dominated office (${100 - mostMale.pctFemale}% male).`,
    );
    insights.push(
      `${offices[0].office} is the largest office by headcount (${offices[0].total.toLocaleString()} employees).`,
    );
  }

  const appointments = data.byAppointment || [];
  if (appointments.length > 0) {
    insights.push(
      `${appointments[0].status} is the most common appointment status (${appointments[0].total.toLocaleString()} employees).`,
    );
  }

  if (t.Other > 0) {
    insights.push(
      `${t.Other.toLocaleString()} employee${t.Other === 1 ? "" : "s"} (${t.pctOther}%) are recorded as non-binary / other gender identity.`,
    );
  }

  return insights;
}

export default function EmployeeGenderStatsContent() {
  const [filters, setFilters] = useState(EMPTY_EMPLOYEE_FILTERS);
  const [useSample, setUseSample] = useState(false);

  const setFilter = (key) => (value) =>
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      /* The department list depends on the office, so clear a department that
         no longer belongs to the selected office. */
      if (key === "office") next.department = "";
      return next;
    });

  /* Live data only supports the filters the database backs: personnel type
     (employment_status), college/office and employment status (appointment). */
  const params = useMemo(
    () => ({
      ...(filters.office ? { college: filters.office } : {}),
      ...(filters.personnelType
        ? { personnel_type: filters.personnelType }
        : {}),
      ...(filters.appointmentStatus
        ? { appointment_status: filters.appointmentStatus }
        : {}),
    }),
    [filters.office, filters.personnelType, filters.appointmentStatus],
  );

  const { data, loading, error, refetch } = useGenderStats("employees", params);

  /* Demo dataset: individual records (../components/employeeSampleRecords)
     expanded from the curated totals, so every filter — including the
     sample-only Department and Position Level dimensions — re-aggregates the
     same way the API would. The JSON snapshot in ../data/sample-employees.json
     is only a fixture for tests/scripts; regenerate it with
     `node scripts/generate-sample-employees.mjs`. */
  const filteredSampleRecords = useMemo(
    () => filterEmployeeRecords(SAMPLE_EMPLOYEE_RECORDS, filters),
    [filters],
  );
  const sampleStats = useMemo(
    () => computeEmployeeStats(filteredSampleRecords),
    [filteredSampleRecords],
  );

  const activeData = useSample ? sampleStats : data;
  const totals = activeData?.totals || { Female: 0, Male: 0, Other: 0, total: 0 };
  const insights = useMemo(() => buildInsights(activeData), [activeData]);
  const showContent = useSample || (!loading && !!data);
  const filterCount = activeFilterCount(filters);

  /* Live profiles mostly have employment_information blank, so the API reports
     them under "Unspecified" — counted here for the coverage warning below. */
  const liveUnspecifiedEmployment = useMemo(() => {
    const row = (data?.byEmploymentStatus || []).find(
      (entry) => entry.status === "Unspecified",
    );
    return row?.total || 0;
  }, [data]);

  const personnelTypeOptions = useSample ? CATEGORY_ORDER : LIVE_PERSONNEL_TYPES;
  const appointmentOptions = useSample
    ? APPOINTMENT_ORDER
    : LIVE_APPOINTMENT_STATUSES;
  const departmentChoices = useMemo(
    () => departmentOptions(SAMPLE_EMPLOYEE_RECORDS, filters.office),
    [filters.office],
  );

  /* Printed on the quick-report PDFs so a filtered report is self-describing. */
  const filterSummary = useMemo(() => {
    const parts = [];
    if (filters.personnelType) parts.push(`Personnel Type: ${filters.personnelType}`);
    if (filters.office) parts.push(`College/Office: ${filters.office}`);
    if (filters.department) parts.push(`Department: ${filters.department}`);
    if (filters.appointmentStatus) {
      parts.push(`Employment Status: ${filters.appointmentStatus}`);
    }
    if (filters.positionLevel) {
      parts.push(`Position Level: ${filters.positionLevel}`);
    }
    return parts.join(" | ");
  }, [filters]);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
          <span className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
            <FaUserTie size={18} />
          </span>
          Employee Gender Statistics
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Explore the distribution of female and male employees by sex, office,
          appointment status, and other demographic indicators.
        </p>
      </div>

      {/* ===== FILTERS ===== */}
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <FilterSelect
            label="Personnel Type"
            value={filters.personnelType}
            allLabel="All personnel types"
            options={personnelTypeOptions}
            onChange={setFilter("personnelType")}
          />
          <FilterSelect
            label="College/Office"
            value={filters.office}
            allLabel="All colleges/offices"
            options={OFFICE_OPTIONS}
            onChange={setFilter("office")}
          />
          <FilterSelect
            label="Department"
            value={filters.department}
            allLabel="All departments"
            options={departmentChoices}
            onChange={setFilter("department")}
            disabled={!useSample}
            hint="sample data only"
          />
          <FilterSelect
            label="Employment Status"
            value={filters.appointmentStatus}
            allLabel="All employment statuses"
            options={appointmentOptions}
            onChange={setFilter("appointmentStatus")}
          />
          <FilterSelect
            label="Position Level"
            value={filters.positionLevel}
            allLabel="All position levels"
            options={POSITION_LEVEL_ORDER}
            onChange={setFilter("positionLevel")}
            disabled={!useSample}
            hint="sample data only"
          />
          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-500 mb-1 block">
              Data source
            </label>
            <button
              type="button"
              onClick={() => setUseSample((prev) => !prev)}
              aria-pressed={useSample}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                useSample
                  ? "border-amber-300 bg-amber-50 text-amber-700"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  useSample ? "bg-amber-500" : "bg-gray-300"
                }`}
              />
              {useSample ? "Sample data: ON" : "Use sample data"}
            </button>
          </div>
          {filterCount > 0 && (
            <button
              type="button"
              onClick={() => setFilters(EMPTY_EMPLOYEE_FILTERS)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
            >
              Clear filters ({filterCount})
            </button>
          )}
        </div>
        <p className="text-[11px] text-gray-400">
          {useSample
            ? `Filters re-aggregate the sample records in your browser — ${filteredSampleRecords.length.toLocaleString()} of ${SAMPLE_EMPLOYEE_COUNT.toLocaleString()} employees match. Department and Position Level exist in the sample dataset only; the live database does not store them.`
            : "Live data can be filtered by personnel type, college/office and employment status. Department and Position Level are available with sample data only."}
        </p>
      </div>

      {useSample && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          Showing synthetic <strong>sample data</strong> built from
          <code className="mx-1">data/sample-employees.json</code>
          (1,026 employees · 612 female / 404 male / 10 non-binary), expanded into
          individual records so the filters compose. Your database is not being
          read and nothing is saved — turn the toggle off to return to live data.
        </div>
      )}

      {!useSample && error && (
        <ErrorState message={error} onRetry={refetch} />
      )}
      {!useSample && loading && <LoadingState />}

      {!useSample &&
        !loading &&
        data &&
        filterCount > 0 &&
        totals.total === 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            No employees match the selected filters.
            {liveUnspecifiedEmployment > 0 && (
              <>
                {" "}
                {liveUnspecifiedEmployment.toLocaleString()} of{" "}
                {(data.totals?.total || 0).toLocaleString()} employee profiles
                have no employment information recorded (personnel type,
                employment status and office are blank), so these filters can
                only match the profiles that do.
              </>
            )}
          </div>
        )}

      {showContent && (
        <>
          <SummaryCards totals={totals} what="Employees" />

          <SexDonut totals={totals} />

          {Array.isArray(activeData.byCategory) &&
            activeData.byCategory.length > 0 && (
              <SexTable
                title="Personnel Category and Sex"
                data={activeData.byCategory}
                nameKey="category"
                nameHeader="Personnel Category"
              />
            )}


          {Array.isArray(activeData.byEmploymentStatus) &&
            activeData.byEmploymentStatus.length > 0 && (
              <SexTable
                title="Personnel Type and Sex"
                data={activeData.byEmploymentStatus}
                nameKey="status"
                nameHeader="Personnel Type"
              />
            )}

          {Array.isArray(activeData.byPositionLevel) &&
            activeData.byPositionLevel.length > 0 && (
              <SexTable
                title="Personnel by Position Level and Sex"
                data={activeData.byPositionLevel}
                nameKey="level"
                nameHeader="Position Level"
              />
            )}

          {Array.isArray(activeData.byAcademicRank) &&
            activeData.byAcademicRank.length > 0 && (
              <SexTable
                title="Personnel by Academic Rank and Sex"
                subtitle="Faculty only"
                data={activeData.byAcademicRank}
                nameKey="rank"
                nameHeader="Academic Rank"
              />
            )}

          <SexTable
            title="Personnel by Appointment Status and Sex"
            data={activeData.byAppointment || []}
            nameKey="status"
            nameHeader="Appointment Status"
          />

          <SexTable
            title="Personnel by College / Office and Sex"
            data={activeData.byOffice || []}
            nameKey="office"
            nameHeader="College / Office"
          />

          <DemographicTable
            rows={activeData.demographics || []}
            total={totals.total}
          />
          <KeyInsightsCard insights={insights} />
          <QuickReportsCard
            data={activeData}
            useSample={useSample}
            filterSummary={filterSummary}
            college={filters.office}
          />
        </>
      )}
    </div>
  );
}

/* Select control for the filter panel. `disabled` marks the sample-only
   dimensions (Department, Position Level) while live data is showing. */
function FilterSelect({
  label,
  value,
  options,
  onChange,
  allLabel,
  disabled = false,
  hint = "",
}) {
  return (
    <div className="flex flex-col">
      <label className="text-xs font-medium text-gray-500 mb-1 block">
        {label}
        {hint && (
          <span className="ml-1 text-[10px] font-normal text-amber-600">
            ({hint})
          </span>
        )}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        title={
          disabled ? `${label} is only available with sample data` : undefined
        }
        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 max-w-[16rem] disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

/* Buttons shared by the quick-report card, so the sample-data and live-data
   variants look identical. */
const QUICK_REPORT_BTN_CLS =
  "inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed";

function QuickReportsCard({ data, useSample, filterSummary, college }) {
  const [busy, setBusy] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [status, setStatus] = useState("");

  const downloadEmployeeReport = async () => {
    setDownloading(true);
    setStatus("");
    try {
      const query = new URLSearchParams({ type: "employees" });
      if (college) query.set("college", college);
      const res = await fetch(
        `/api/analytics/sex-disaggregated-data/report?${query.toString()}`,
        { method: "GET" },
      );
      if (!res.ok) throw new Error("Failed to generate report");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const filename =
        (res.headers.get("content-disposition") || "").split("filename=")[1] ||
        "employee-gender-statistics-report.pdf";
      link.href = url;
      link.download = filename.replace(/"/g, "");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setStatus("Report ready — download started.");
    } catch (err) {
      setStatus("Could not generate the report. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  /* Sample data never reaches the server, so the sample quick reports are built
     in the browser from the JSON already rendered on the page. */
  const downloadSampleReport = async (kind, label) => {
    setBusy(kind);
    setStatus("");
    try {
      await downloadQuickReport(kind, data, {
        isSample: useSample,
        filterSummary,
      });
      setStatus(`${label.replace(" (PDF)", "")} ready — download started.`);
    } catch (err) {
      console.error("Quick report generation failed:", err);
      setStatus("Could not generate the report. Please try again.");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">
        ⬇ Quick Reports
      </h3>
      <div className="flex flex-wrap gap-3">
        {useSample ? (
          QUICK_REPORT_OPTIONS.map((report) => (
            <button
              key={report.kind}
              type="button"
              onClick={() => downloadSampleReport(report.kind, report.label)}
              disabled={Boolean(busy)}
              className={QUICK_REPORT_BTN_CLS}
            >
              {busy === report.kind ? "Generating…" : report.label}
            </button>
          ))
        ) : (
          <button
            type="button"
            onClick={downloadEmployeeReport}
            disabled={downloading}
            className={QUICK_REPORT_BTN_CLS}
          >
            {downloading ? "Generating…" : "Employee Gender Report (PDF)"}
          </button>
        )}
        <a href="/gad-ars" className={QUICK_REPORT_BTN_CLS}>
          GAD Accomplishment Report
        </a>
      </div>
      {useSample && (
        <p className="text-[11px] text-gray-400 mt-2">
          Generated in your browser from the sample dataset — no database reads
          or writes.
        </p>
      )}
      {status && <p className="text-xs text-gray-500 mt-2">{status}</p>}
    </div>
  );
}

function KeyInsightsCard({ insights }) {
  const list = Array.isArray(insights) ? insights : [];
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">
        📌 Key Insights
      </h3>
      {list.length === 0 ? (
        <p className="text-xs text-gray-400 italic">
          No insights available for the current data.
        </p>
      ) : (
        <ul className="space-y-2">
          {list.map((line, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
              {line}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

