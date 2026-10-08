"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useDashboardData from "@/hooks/useDashboardData";
import useDashboardFilters from "@/hooks/useDashboardFilters";
import {
  buildSampleDashboardData,
  sampleDashboardFilterOptions,
  SAMPLE_SEMESTERS,
} from "@/app/(pages)/(event)/gender-statistics/components/sampleDashboardData";
import {
  SAMPLE_SCHOOL_YEARS,
  SAMPLE_STUDENT_PROFILE_RECORDS,
  SAMPLE_EMPLOYEE_PROFILE_RECORDS,
} from "@/app/(pages)/(event)/gender-statistics/components/sampleProfileRecords";
import {
  computeStudentStats,
  filterStudentRecords,
} from "@/app/(pages)/(event)/gender-statistics/components/studentStats";
import {
  computeEmployeeStats,
  filterEmployeeRecords,
} from "@/app/(pages)/(event)/gender-statistics/components/employeeStats";

/* Derives the calendar year the GAD / budget APIs expect from a
   school-year string like "2024-2025". Falls back to this year. */
export function yearFromSchoolYear(schoolYear) {
  const match = String(schoolYear || "").match(/(\d{4})/);
  if (match) return Number(match[1]);
  return new Date().getFullYear();
}

/* 5-year enrollment / workforce history from the sample profile records.
   Used by the President trend card — live mode has no equivalent endpoint. */
function buildSampleTrend() {
  return SAMPLE_SCHOOL_YEARS.map((year) => {
    const students = SAMPLE_STUDENT_PROFILE_RECORDS.filter((r) =>
      (r.terms || []).some((t) => t.school_year === year)
    ).length;
    const employees = SAMPLE_EMPLOYEE_PROFILE_RECORDS.filter((r) =>
      (r.years || []).includes(year)
    ).length;
    return { year, students, employees };
  });
}

/* Executive data for the SUC President dashboard.
   Sample-first: people stats default to the synthetic sample profile records
   (same source as Planning Director + gender-statistics pages) because there
   is no real profile data yet. Live project/budget/GPB sections are removed
   from this view — no sample exists for them, and the live counts were
   misleading (48 "New", 50 with no actuals, placeholder GPB text). */
export default function usePresidentOverview() {
  const { data: filters, loading: filtersLoading } = useDashboardFilters();
  /* Sample mode is the default view; the toggle swaps the people stats back
     to the live API (and back) without leaving the page. */
  const [useSample, setUseSample] = useState(true);
  const [schoolYear, setSchoolYear] = useState("");
  const [semester, setSemester] = useState("");

  /* Filter options follow the data source: in sample mode the dropdowns offer
     the sample dataset's own years/semesters so every option can actually
     match records; live mode keeps the API options. */
  const sampleOptions = useMemo(() => sampleDashboardFilterOptions(), []);
  const schoolYearOptions = useMemo(
    () => (useSample ? sampleOptions.schoolYears : filters?.schoolYears || []),
    [useSample, sampleOptions, filters]
  );
  const semesterOptions = useMemo(
    () => (useSample ? sampleOptions.semesters : filters?.semesters || []),
    [useSample, sampleOptions, filters]
  );

  /* Re-seed the selected school year whenever the option list changes —
     including when the toggle switches datasets — so the page is never
     pinned to a year the current dataset does not contain. */
  useEffect(() => {
    if (schoolYearOptions.length > 0 && !schoolYearOptions.includes(schoolYear)) {
      setSchoolYear(schoolYearOptions[0]);
    }
  }, [schoolYearOptions, schoolYear]);

  /* Reset the semester when switching datasets: the sample semesters
     ("1st"/"2nd"/"Summer") differ from live values. */
  useEffect(() => {
    if (!useSample) return;
    if (semester && !SAMPLE_SEMESTERS.includes(semester)) setSemester("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useSample]);

  const filtersReady =
    useSample ||
    (!filtersLoading &&
      (schoolYearOptions.length === 0 || schoolYear !== ""));

  const dashboardFilters = useMemo(
    () => ({
      ...(schoolYear ? { school_year: schoolYear } : {}),
      ...(semester ? { semester } : {}),
    }),
    [schoolYear, semester]
  );

  /* Live fetching stays parked while sample mode is on — the panels read the
     synthetic dataset instead. */
  const { data: dashboardData, loading: dashboardLoading } = useDashboardData(
    dashboardFilters,
    filtersReady && !useSample
  );

  const sampleData = useMemo(
    () => (useSample ? buildSampleDashboardData(dashboardFilters) : null),
    [useSample, dashboardFilters]
  );
  const activeDashboard = useSample ? sampleData : dashboardData;

  /* College/office + trend breakdowns from the sample profile records.
     Computed only in sample mode; live mode already returns these shapes
     from /api/analytics/gender-statistics. */
  const sampleBreakdowns = useMemo(() => {
    if (!useSample) return null;
    const students = filterStudentRecords(SAMPLE_STUDENT_PROFILE_RECORDS, {
      schoolYear,
      semester,
    });
    const employees = filterEmployeeRecords(SAMPLE_EMPLOYEE_PROFILE_RECORDS, {
      schoolYear,
    });
    return {
      students: computeStudentStats(students),
      employees: computeEmployeeStats(employees),
      trend: buildSampleTrend(),
    };
  }, [useSample, schoolYear, semester]);


  /* Live-only people breakdowns (gender-statistics API). Parked in sample
     mode — the sampleBreakdowns above already cover this. */
  const [extra, setExtra] = useState({
    studentStats: null,
    employeeStats: null,
  });
  const [extraLoading, setExtraLoading] = useState(true);
  const [extraError, setExtraError] = useState("");
  const year = useMemo(() => yearFromSchoolYear(schoolYear), [schoolYear]);


  const fetchAll = useCallback(async () => {
    /* Sample mode never hits the network for people stats. */
    if (useSample) {
      setExtra({ studentStats: null, employeeStats: null });
      setExtraError("");
      setExtraLoading(false);
      return;
    }
    setExtraLoading(true);
    setExtraError("");
    const withYear = schoolYear
      ? `school_year=${encodeURIComponent(schoolYear)}`
      : "";
    const sem = semester ? `semester=${encodeURIComponent(semester)}` : "";
    const studentQs = [withYear, sem].filter(Boolean).join("&");
    try {
      const [studentStats, employeeStats] = await Promise.all([
        fetchJson(`/api/analytics/gender-statistics?type=students${studentQs ? `&${studentQs}` : ""}`).catch(() => null),
        fetchJson(`/api/analytics/gender-statistics?type=employees${withYear ? `&${withYear}` : ""}`).catch(() => null),
      ]);
      setExtra({ studentStats, employeeStats });
    } catch (err) {
      setExtraError("Some overview sections could not be loaded.");
    } finally {
      setExtraLoading(false);
    }
  }, [useSample, schoolYear, semester]);

  useEffect(() => {
    if (!filtersReady) return;
    fetchAll();
  }, [fetchAll, filtersReady]);
  const overview = useMemo(() => {
    const snapshot = activeDashboard?.snapshot || {};
    const total = Number(snapshot.total) || 0;
    const femaleCount = Number(snapshot.femaleCount) || 0;
    const maleCount = Number(snapshot.maleCount) || 0;
    const pwdCount = Number(snapshot.pwdCount) || 0;
    const ipCount = Number(snapshot.ipCount) || 0;
    /* Sample breakdowns already carry totals + byCollege/byOffice in the
       gender-statistics shape; live mode reads the same shape from the API. */
    const sStats = useSample ? sampleBreakdowns?.students : extra.studentStats;
    const eStats = useSample ? sampleBreakdowns?.employees : extra.employeeStats;
    const sT = sStats?.totals || null;
    const eT = eStats?.totals || null;
    const byCollege = sStats?.byCollege || [];
    const byOffice = eStats?.byOffice || [];
    const gaps = [
      ...byCollege.filter((r) => (r.total || 0) >= 10).map((r) => ({
        unit: r.college, kind: "College",
        malePct: Math.round(((r.Male || 0) / (r.total || 1)) * 1000) / 10,
        total: r.total,
      })),
      ...byOffice.filter((r) => (r.total || 0) >= 5).map((r) => ({
        unit: r.office, kind: "Office",
        malePct: Math.round(((r.Male || 0) / (r.total || 1)) * 1000) / 10,
        total: r.total,
      })),
    ].sort((a, b) => b.malePct - a.malePct).slice(0, 3);
    /* Largest colleges/offices by headcount — feeds the ranking card. */
    const collegeRanking = [
      ...byCollege.map((r) => ({
        unit: r.college, kind: "College",
        total: r.total || 0,
        female: r.Female || 0, male: r.Male || 0,
        pctFemale: r.pctFemale ?? 0,
      })),
      ...byOffice.map((r) => ({
        unit: r.office, kind: "Office",
        total: r.total || 0,
        female: r.Female || 0, male: r.Male || 0,
        pctFemale: r.pctFemale ?? 0,
      })),
    ].sort((a, b) => b.total - a.total).slice(0, 6);
    return {
      year,
      useSample,
      snapshot: {
        total, femaleCount, maleCount, pwdCount, ipCount,
        totalStudents: sT?.total ?? null, totalEmployees: eT?.total ?? null,
        femaleStudentsPct: sT?.pctFemale ?? null, femaleEmployeesPct: eT?.pctFemale ?? null,
        lgbtqia: (Number(sT?.lgbtqia) || 0) + (Number(eT?.lgbtqia) || 0),
      },
      parityGaps: gaps,
      collegeRanking,
      trend: useSample ? sampleBreakdowns?.trend || [] : [],
      /* Sex-data completeness is computable in both modes (sample snapshot
         covers it); budget/GPB/project rows are live-only and have no sample,
         so the tracker shows them as live-only placeholders. */
      compliance: {
        sexCompletePct: total > 0 ? Math.round(((femaleCount + maleCount) / total) * 100) : null,
      },
    };
  }, [activeDashboard, extra, sampleBreakdowns, useSample, year]);

  return {
    useSample, setUseSample,
    filters: { schoolYear, setSchoolYear, semester, setSemester, schoolYearOptions, semesterOptions },
    filtersLoading, filtersReady,
    loading: (useSample ? false : dashboardLoading || extraLoading) || !filtersReady,
    extraError, overview, refresh: fetchAll, updatedAt: new Date(),
  };
}


