"use client";

import { useMemo, useState } from "react";
import { FaUserTie } from "react-icons/fa";
import { COLLEGES } from "@/lib/colleges";
import {
  useGenderStats,
  LoadingState,
  ErrorState,
  SummaryCards,
  SexDonut,
  StackedSexBar,
  StackedSexBarVertical,
  DemographicTable,
} from "../components/GenderStatsShared";

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
  const [office, setOffice] = useState("");

  const params = useMemo(
    () => ({ ...(office ? { office } : {}) }),
    [office],
  );

  const { data, loading, error, refetch } = useGenderStats("employees", params);

  const totals = data?.totals || { Female: 0, Male: 0, Other: 0, total: 0 };
  const insights = useMemo(() => buildInsights(data), [data]);

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
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">
            Office / Unit
          </label>
          <select
            value={office}
            onChange={(e) => setOffice(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 max-w-[16rem]"
          >
            <option value="">All Offices</option>
            {COLLEGES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={refetch} />}
      {loading && <LoadingState />}

      {!loading && data && (
        <>
          <SummaryCards totals={totals} what="Employees" />

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <SexDonut totals={totals} />
            <StackedSexBarVertical
              title="Employees by Appointment Status and Sex"
              data={data.byAppointment || []}
              nameKey="status"
            />
          </div>

          <StackedSexBar
            title="Employees by Office / Unit and Sex"
            data={data.byOffice || []}
            nameKey="office"
          />

          <StackedSexBarVertical
            title="Employees by Employment Status and Sex"
            data={data.byEmploymentStatus || []}
            nameKey="status"
          />

          <DemographicTable rows={data.demographics || []} total={totals.total} />
          <KeyInsightsCard insights={insights} />
          <QuickReportsCard />
        </>
      )}
    </div>
  );
}

function QuickReportsCard() {
  const [downloading, setDownloading] = useState(false);
  const [status, setStatus] = useState("");

  const downloadEmployeeReport = async () => {
    setDownloading(true);
    setStatus("");
    try {
      const res = await fetch(
        "/api/analytics/sex-disaggregated-data/report?type=employees",
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

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">
        ⬇ Quick Reports
      </h3>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={downloadEmployeeReport}
          disabled={downloading}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {downloading ? "Generating…" : "Employee Gender Report (PDF)"}
        </button>
        <a
          href="/gad-ars"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600"
        >
          GAD Accomplishment Report
        </a>
      </div>
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

