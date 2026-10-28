"use client";

import { useMemo, useState } from "react";
import { FaUserTie, FaLightbulb, FaFileDownload } from "react-icons/fa";
import { AGE_GROUP_ORDER } from "../components/ageGroups";
import { OFFICE_OPTIONS } from "@/lib/colleges";
import {
  useGenderStats,
  LoadingState,
  ErrorState,
  SummaryCards,
  SexDonut,
  GenderIdentityDonut,
  SexTable,
  DemographicTable,
  MultiSelect,
  YearTotalsTable,
  YearSexDonuts,
  YearGroupedBars,
  YearComparisonTable,
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
  SAMPLE_EMPLOYEE_PROFILE_COUNT as SAMPLE_EMPLOYEE_COUNT,
  SAMPLE_EMPLOYEE_PROFILE_RECORDS as SAMPLE_EMPLOYEE_RECORDS,
} from "../components/sampleProfileRecords";
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

  if (t.lgbtqia > 0) {
    insights.push(
      `${t.lgbtqia.toLocaleString()} employee${t.lgbtqia === 1 ? "" : "s"} (${t.pctLgbtqia}%) identify as LGBTQIA+.`,
    );
  }

  return insights;
}

export default function EmployeeGenderStatsContent() {
  const [filters, setFilters] = useState(EMPTY_EMPLOYEE_FILTERS);
  const [useSample, setUseSample] = useState(true);

  const setFilter = (key) => (value) =>
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      /* The department list depends on the offices, so drop departments that
         no longer belong to any selected office (same as student programs). */
      if (key === "office") {
        const choices = departmentOptions(SAMPLE_EMPLOYEE_RECORDS, value);
        next.department = (next.department || []).filter((d) =>
          choices.includes(d),
        );
      }
      return next;
    });

  /* Live data only supports the filters the database backs: personnel type
     (employment_status), college/office and employment status (appointment). */
  const params = useMemo(
    () => ({
      ...(filters.office.length ? { college: filters.office.join(",") } : {}),
      ...(filters.personnelType.length
        ? { personnel_type: filters.personnelType.join(",") }
        : {}),
      ...(filters.appointmentStatus.length
        ? { appointment_status: filters.appointmentStatus.join(",") }
        : {}),
      ...(filters.ageGroups.length
        ? { age_group: filters.ageGroups.join(",") }
        : {}),
      ...(filters.sexes.length ? { sex: filters.sexes.join(",") } : {}),
      ...(filters.demographics.length
        ? { demographic: filters.demographics.join(",") }
        : {}),
    }),
    [
      filters.office,
      filters.personnelType,
      filters.appointmentStatus,
      filters.ageGroups,
      filters.demographics,
      filters.sexes,
    ],
  );

  const { data, loading, error, refetch } = useGenderStats("employees", params);

  /* Demo dataset: individual records (../components/sampleProfileRecords)
     expanded from the curated totals, so every filter â€” including the
     sample-only Department and Position Level dimensions â€” re-aggregates the
     same way the API would. The JSON snapshot in data/sample-profiles.json
     is only a fixture for tests/scripts; regenerate it with
     `node scripts/generate-sample-profiles.mjs`. */
  const filteredSampleRecords = useMemo(
    () => filterEmployeeRecords(SAMPLE_EMPLOYEE_RECORDS, filters),
    [filters],
  );
  const sampleStats = useMemo(
    () => computeEmployeeStats(filteredSampleRecords, SAMPLE_EMPLOYEE_RECORDS),
    [filteredSampleRecords],
  );

  const activeData = useSample ? sampleStats : data;

  /* Comparison mode (sample-only, since the employee API has no year
     dimension): one stats payload per selected academic year. */
  const selectedYears = useMemo(
    () => [...(filters.schoolYear || [])].sort(),
    [filters.schoolYear],
  );
  const comparing = selectedYears.length >= 2;
  const perYear = useMemo(() => {
    if (!useSample || !comparing) return [];
    return selectedYears.map((year) => ({
      year,
      stats: computeEmployeeStats(
        filterEmployeeRecords(SAMPLE_EMPLOYEE_RECORDS, {
          ...filters,
          schoolYear: [year],
        }),
        SAMPLE_EMPLOYEE_RECORDS,
      ),
    }));
  }, [useSample, comparing, selectedYears, filters]);
  const showComparison = useSample && comparing && perYear.length >= 2;

  const totals = activeData?.totals || { Female: 0, Male: 0, total: 0 };
  const insights = useMemo(() => buildInsights(activeData), [activeData]);
  const showContent = useSample || (!loading && !!data);
  const filterCount = activeFilterCount(filters);

  /* Live profiles mostly have employment_information blank, so the API reports
     them under "Unspecified" â€” counted here for the coverage warning below. */
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

  /* Academic-year options follow the active dataset, so sample mode lists the
     five sample years (2020-2021 to 2024-2025) and live mode lists none, since
     the employee API has no year dimension yet. */
  const schoolYearOptions = activeData?.schoolYears || [];

  /* Printed on the quick-report PDFs so a filtered report is self-describing. */
  const filterSummary = useMemo(() => {
    const parts = [];
    if (filters.personnelType.length)
      parts.push(`Personnel Type: ${filters.personnelType.join(", ")}`);
    if (filters.office.length)
      parts.push(`College/Office: ${filters.office.join(", ")}`);
    if (filters.department.length)
      parts.push(`Department: ${filters.department.join(", ")}`);
    if (filters.appointmentStatus.length) {
      parts.push(
        `Employment Status: ${filters.appointmentStatus.join(", ")}`,
      );
    }
    if (filters.positionLevel.length) {
      parts.push(`Position Level: ${filters.positionLevel.join(", ")}`);
    }
    if (filters.schoolYear.length) {
      parts.push(`Academic Year: ${filters.schoolYear.join(", ")}`);
    }
    if (filters.demographics.length) {
      parts.push(`Demographic Profile: ${filters.demographics.join(", ")}`);
    }
    if (filters.ageGroups.length) {
      parts.push(`Age Group: ${filters.ageGroups.join(", ")}`);
    }
    if (filters.sexes.length) {
      parts.push(`Sex: ${filters.sexes.join(", ")}`);
    }
    return parts.join(" | ");
  }, [filters]);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
          <span className="h-10 w-10 rounded-xl bg-gradient-to-br from-secondary-600 to-secondary-400 flex items-center justify-center text-white shadow-lg shadow-secondary-200">
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
          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-500 mb-1 block">
              Academic Year
            </label>
            <MultiSelect
              label="Academic Year"
              allLabel="All academic years"
              options={schoolYearOptions}
              value={filters.schoolYear}
              onChange={setFilter("schoolYear")}
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-500 mb-1 block">
              Personnel Type
            </label>
            <MultiSelect
              label="Personnel Type"
              allLabel="All personnel types"
              options={personnelTypeOptions}
              value={filters.personnelType}
              onChange={setFilter("personnelType")}
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-500 mb-1 block">
              College/Office
            </label>
            <MultiSelect
              label="College/Office"
              allLabel="All colleges/offices"
              options={OFFICE_OPTIONS}
              value={filters.office}
              onChange={setFilter("office")}
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-500 mb-1 block">
              Department
            </label>
            <MultiSelect
              label="Department"
              allLabel="All departments"
              options={departmentChoices}
              value={filters.department}
              onChange={setFilter("department")}
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-500 mb-1 block">
              Employment Status
            </label>
            <MultiSelect
              label="Employment Status"
              allLabel="All employment statuses"
              options={appointmentOptions}
              value={filters.appointmentStatus}
              onChange={setFilter("appointmentStatus")}
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-500 mb-1 block">
              Position Level
            </label>
            <MultiSelect
              label="Position Level"
              allLabel="All position levels"
              options={POSITION_LEVEL_ORDER}
              value={filters.positionLevel}
              onChange={setFilter("positionLevel")}
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-500 mb-1 block">
              Demographic Profile
            </label>
            <MultiSelect
              label="Demographic Profile"
              allLabel="All demographics"
              options={activeData?.demographicOptions || []}
              value={filters.demographics}
              onChange={setFilter("demographics")}
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-500 mb-1 block">
              Age Group
            </label>
            <MultiSelect
              label="Age Group"
              allLabel="All age groups"
              options={activeData?.ageGroups?.length ? activeData.ageGroups : AGE_GROUP_ORDER}
              value={filters.ageGroups}
              onChange={setFilter("ageGroups")}
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-500 mb-1 block">
              Sex
            </label>
            <MultiSelect
              label="Sex"
              allLabel="All sexes"
              options={activeData?.sexes || ["Female", "Male"]}
              value={filters.sexes}
              onChange={setFilter("sexes")}
            />
          </div>
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
                  ? "border-secondary-300 bg-secondary-50 text-secondary-700"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  useSample ? "bg-secondary-500" : "bg-gray-300"
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
            ? `Filters re-aggregate the sample records in your browser â€” ${filteredSampleRecords.length.toLocaleString()} of ${SAMPLE_EMPLOYEE_COUNT.toLocaleString()} employees match. Department, Position Level and Academic Year exist in the sample dataset only; the live database does not store them.`
            : "Live data can be filtered by personnel type, college/office and employment status. Department, Position Level and Academic Year are available with sample data only."}
        </p>
      </div>

      {useSample && (
        <div className="rounded-lg border border-secondary-200 bg-secondary-50 px-4 py-3 text-xs text-secondary-800">
          Showing synthetic <strong>sample data</strong> built from
          <code className="mx-1">data/sample-profiles.json</code>
          ({SAMPLE_EMPLOYEE_COUNT.toLocaleString()} named employees · 413 female / 272 male / 26 LGBTQIA+), expanded into
          individual records with a five-year appointment history (2020-2021 to
          2024-2025) so the filters compose. Your database is not being read and
          nothing is saved â€” turn the toggle off to return to live data.
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
          <div className="rounded-lg border border-secondary-200 bg-secondary-50 px-4 py-3 text-xs text-secondary-800">
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
          {showComparison ? (
            <>
              <YearTotalsTable perYear={perYear} what="Employees" />
              <YearSexDonuts perYear={perYear} />
              <YearGroupedBars
                title="Personnel by College / Office"
                perYear={perYear}
                rowsOf={(s) => s.byOffice}
                nameKey="office"
                height={320}
              />
              <YearGroupedBars
                title="Personnel by Category"
                perYear={perYear}
                rowsOf={(s) => s.byCategory}
                nameKey="category"
              />
              <YearGroupedBars
                title="Personnel by Appointment Status"
                perYear={perYear}
                rowsOf={(s) => s.byAppointment}
                nameKey="status"
              />
              <YearGroupedBars
                title="Personnel by Position Level"
                perYear={perYear}
                rowsOf={(s) => s.byPositionLevel}
                nameKey="level"
              />
              <YearGroupedBars
                title="Personnel by Age Group"
                perYear={perYear}
                rowsOf={(s) => s.byAgeGroup}
                nameKey="age_group"
              />
              <YearComparisonTable
                title="Demographic Profile (Institutional Data)"
                perYear={perYear}
                rowsOf={(s) => s.demographics}
                nameKey="label"
              />
              <p className="text-xs text-gray-400">
                Insights and quick reports below describe the combined
                selection ({selectedYears.join(", ")}).
              </p>
            </>
          ) : (
            <>
          <SummaryCards totals={totals} what="Employees" />

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <SexDonut totals={totals} />
            <GenderIdentityDonut rows={activeData.byGenderIdentity || []} />
          </div>

          {Array.isArray(activeData.byCategory) &&
            activeData.byCategory.length > 0 && (
              <SexTable
                title="Personnel Category and Sex"
                data={activeData.byCategory}
                nameKey="category"
                nameHeader="Personnel Category"
              />
            )}

          {Array.isArray(activeData.byAcademicYear) &&
            activeData.byAcademicYear.length > 0 && (
              <SexTable
                title="Personnel by Academic Year and Sex"
                subtitle="Headcount on board each sample year"
                data={activeData.byAcademicYear}
                nameKey="school_year"
                nameHeader="Academic Year"
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
                title="Personnel by Age Group and Sex"
                data={activeData.byAgeGroup || []}
                nameKey="age_group"
                nameHeader="Age Group"
              />

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
            </>
          )}
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

/* Buttons shared by the quick-report card, so the sample-data and live-data
   variants look identical. */
const QUICK_REPORT_BTN_CLS =
  "inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-secondary-50 hover:border-secondary-200 hover:text-secondary-600 disabled:opacity-50 disabled:cursor-not-allowed";

function QuickReportsCard({ data, useSample, filterSummary, college }) {
  const [busy, setBusy] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [status, setStatus] = useState("");

  const downloadEmployeeReport = async () => {
    setDownloading(true);
    setStatus("");
    try {
      const query = new URLSearchParams({ type: "employees" });
      /* The PDF endpoint takes a single college — send the first selection and
         let the on-screen stats carry the full multi-select. */
      const colleges = Array.isArray(college)
        ? college.filter(Boolean)
        : college
          ? [college]
          : [];
      if (colleges.length) query.set("college", colleges[0]);
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
      setStatus("Report ready â€” download started.");
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
      setStatus(`${label.replace(" (PDF)", "")} ready â€” download started.`);
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
        <FaFileDownload className="inline-block mr-1.5 align-[-2px] text-secondary-600" /> Quick Reports
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
              {busy === report.kind ? "Generatingâ€¦" : report.label}
            </button>
          ))
        ) : (
          <button
            type="button"
            onClick={downloadEmployeeReport}
            disabled={downloading}
            className={QUICK_REPORT_BTN_CLS}
          >
            {downloading ? "Generatingâ€¦" : "Employee Gender Report (PDF)"}
          </button>
        )}
        <a href="/gad-ars" className={QUICK_REPORT_BTN_CLS}>
          GAD Accomplishment Report
        </a>
      </div>
      {useSample && (
        <p className="text-[11px] text-gray-400 mt-2">
          Generated in your browser from the sample dataset â€” no database reads
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
        <FaLightbulb className="inline-block mr-1.5 align-[-2px] text-secondary-500" /> Key Insights
      </h3>
      {list.length === 0 ? (
        <p className="text-xs text-gray-400 italic">
          No insights available for the current data.
        </p>
      ) : (
        <ul className="space-y-2">
          {list.map((line, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-secondary-500 shrink-0" />
              {line}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

