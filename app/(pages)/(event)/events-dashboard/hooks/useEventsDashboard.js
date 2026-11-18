"use client";

import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { academicYearLabel, eventAcademicYearStart, sampleImpactStats } from "../lib/dashboardData";
import { effectiveStatus } from "@/data/lib/eventStatus";
import { SAMPLE_EMPLOYEE_PROFILE_RECORDS, SAMPLE_SCHOOL_YEARS, SAMPLE_STUDENT_PROFILE_RECORDS } from "../../gender-statistics/components/sampleProfileRecords";
import { buildSampleDashboardData } from "../../gender-statistics/components/sampleDashboardData";
import { computeStudentStats, filterStudentRecords } from "../../gender-statistics/components/studentStats";
import { computeEmployeeStats, filterEmployeeRecords } from "../../gender-statistics/components/employeeStats";

/* Everything the events dashboard loads and derives: GPBs (with their
   attached budgets), events, upcoming events, report readiness and gender
   statistics, plus the selected academic year and sample-data toggle. */
export function useEventsDashboard() {
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState("");

  const [GPB, setGPB] = useState([]);
  const [gpbLoading, setGpbLoading] = useState(true);
  const [gpbError, setGpbError] = useState("");


  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [upcomingLoading, setUpcomingLoading] = useState(true);

  const [selectedYear, setSelectedYear] = useState("");

  const [readiness, setReadiness] = useState(null);
  const [readinessLoading, setReadinessLoading] = useState(false);
  const [readinessError, setReadinessError] = useState("");

  const [genderStats, setGenderStats] = useState({
    students: null,
    employees: null,
  });
  const [genderLoading, setGenderLoading] = useState(true);
  const [genderError, setGenderError] = useState("");

  // Sample-data mode (default ON, mirrors gender-statistics pages): the two
  // gender hero cards read the synthetic profile dataset client-side, while
  // budget/completion stay on live GPB data. Each card carries a SAMPLE/LIVE tag.
  const [useSample, setUseSample] = useState(true);


  const yearEvents = useMemo(() => {
    const y = Number(selectedYear);
    if (!y) return events;
    return events.filter((event) => eventAcademicYearStart(event) === y);
  }, [events, selectedYear]);

  const eventStats = useMemo(() => {
    /* By the dates, not the stored flag: past events that were never marked
       completed counted as "active" and "completed" stayed near zero. */
    const statusOf = (e) => effectiveStatus(e);
    const active = yearEvents.filter((e) =>
      ["ongoing", "upcoming"].includes(statusOf(e)),
    ).length;
    const completed = yearEvents.filter((e) => statusOf(e) === "completed").length;
    return { active, completed };
  }, [yearEvents]);


  const yearOptions = useMemo(() => {
    const years = new Set();
    GPB.forEach((g) => {
      const y = Number(g?.year);
      if (y) years.add(y);
    });
    years.add(new Date().getFullYear());
    return [...years].sort((a, b) => b - a);
  }, [GPB]);


  useEffect(() => {
    if (yearOptions.length === 0) return;
    if (!yearOptions.some((y) => String(y) === String(selectedYear))) {
      setSelectedYear(String(yearOptions[0]));
    }
  }, [yearOptions, selectedYear]);

  const selectedYearLabel = useMemo(
    () => (selectedYear ? `AY ${academicYearLabel(selectedYear)}` : "all years"),
    [selectedYear],
  );

  const selectedGpb = useMemo(
    () => GPB.find((g) => String(g?.year) === String(selectedYear)) || null,
    [GPB, selectedYear],
  );

  // Sample hero data: same AY filter the dashboard year picker produces.
  const sampleImpact = useMemo(() => {
    const ay = academicYearLabel(selectedYear);
    if (!SAMPLE_SCHOOL_YEARS.includes(ay)) return null;
    try {
      return sampleImpactStats(buildSampleDashboardData({ school_year: ay }));
    } catch {
      return null;
    }
  }, [selectedYear]);

  /* Sample Gender Statistics card: same school-year scoping as the live API
     (students narrowed by AY, employees unfiltered), built with the same
     filter/compute helpers the gender-statistics pages use so both views
     stay in sync. */
  const sampleGenderStats = useMemo(() => {
    try {
      const ay = academicYearLabel(selectedYear);
      const studentTotals = SAMPLE_SCHOOL_YEARS.includes(ay)
        ? computeStudentStats(
            filterStudentRecords(SAMPLE_STUDENT_PROFILE_RECORDS, {
              schoolYear: ay,
            }),
            SAMPLE_STUDENT_PROFILE_RECORDS,
          ).totals
        : null;
      const employeeTotals = computeEmployeeStats(
        filterEmployeeRecords(SAMPLE_EMPLOYEE_PROFILE_RECORDS, {}),
        SAMPLE_EMPLOYEE_PROFILE_RECORDS,
      ).totals;
      return {
        students: studentTotals ? { totals: studentTotals } : null,
        employees: employeeTotals ? { totals: employeeTotals } : null,
      };
    } catch {
      return null;
    }
  }, [selectedYear]);

  /* What the Gender Statistics card renders: sample totals while the toggle
     is on (no database reads), live API totals once it is off. */
  const activeGenderStats = useSample ? sampleGenderStats : genderStats;
  const showGenderLoading = useSample ? false : genderLoading;
  const showGenderError = useSample
    ? !sampleGenderStats?.students && !sampleGenderStats?.employees
      ? "Sample data is unavailable for the selected year."
      : ""
    : genderError;

  const projectsSnapshot = useMemo(() => {
    const projects = (Array.isArray(selectedGpb?.projects)
      ? selectedGpb.projects
      : []
    ).filter(Boolean);
    const total = projects.length;

    const countByStatus = (status) =>
      projects.filter((p) => p?.project_status === status).length;

    const milestones = projects.flatMap((p) =>
      (Array.isArray(p?.milestones) ? p.milestones : []).filter((m) =>
        String(m?.title || "").trim(),
      ),
    );

    const allotted = projects.reduce(
      (sum, p) => sum + (Number(p?.gad_budget?.value) || 0),
      0,
    );
    const spent = projects.reduce(
      (sum, p) => sum + (Number(p?.actual_expenditures) || 0),
      0,
    );

    return {
      total,
      completed: countByStatus("completed"),
      ongoing: countByStatus("ongoing"),
      forReview: countByStatus("for-review"),
      completionPct: total ? Math.round((countByStatus("completed") / total) * 100) : 0,
      milestones: milestones.length,
      milestonesDone: milestones.filter((m) => m?.status === "completed").length,
      allotted,
      spent,
      utilizationPct: allotted > 0 ? Math.round((spent / allotted) * 100) : 0,
    };
  }, [selectedGpb]);

  /* The budget each year's plan uses: the one attached to that year's GPB,
     as on the GPB page, its print and the matrix PDF. A GPB with no budget
     attached reads "To follow" there, so it shows no bars here either. The
     GPB list comes back newest-first; the five latest plans are shown. */
  const planBudgets = useMemo(
    () =>
      GPB.slice(0, 5).map((g) => {
        const budget =
          g?.gaaBudgetId && typeof g.gaaBudgetId === "object"
            ? g.gaaBudgetId
            : null;
        return { _id: g._id, year: g.year, budget };
      }),
    [GPB],
  );

  const gaaChartData = useMemo(
    () =>
      [...planBudgets]
        .sort((a, b) => a.year - b.year)
        .map(({ year, budget }) => ({
          year,
          gaa: budget ? budget.totalGAA : null,
          gad: budget ? budget.gadAnnualBudget : null,
        })),
    [planBudgets],
  );

  useEffect(() => {
    const load = async () => {
      setGpbLoading(true);
      setGpbError("");
      try {
        const res = await axios.get("/api/gpb");
        const list = Array.isArray(res.data?.data) ? res.data.data : [];
        setGPB(list);
        /* The GPB list comes back newest-first, so it seeds the year selector. */
        setSelectedYear((prev) => String(prev || list[0]?.year || ""));
      } catch (err) {
        setGpbError(err.response?.data?.message || "Unable to load GPB.");
      } finally {
        setGpbLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const load = async () => {
      setEventsLoading(true);
      setEventsError("");
      try {
        const res = await axios.get("/api/events");
        setEvents(res.data?.data || []);
      } catch (err) {
        setEventsError(
          err.response?.data?.message || "Unable to load events.",
        );
      } finally {
        setEventsLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const load = async () => {
      setUpcomingLoading(true);
      try {
        const res = await axios.get("/api/events/upcoming?limit=5");
        setUpcomingEvents(res.data?.data || []);
      } catch {
        setUpcomingEvents([]);
      } finally {
        setUpcomingLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!selectedYear) return;
    const load = async () => {
      setReadinessLoading(true);
      setReadinessError("");
      try {
        const res = await axios.get(
          `/api/analytics/report-readiness?year=${encodeURIComponent(selectedYear)}`,
        );
        setReadiness(res.data || null);
      } catch (err) {
        setReadiness(null);
        setReadinessError(
          err.response?.data?.message || "Unable to load report readiness.",
        );
      } finally {
        setReadinessLoading(false);
      }
    };
    load();
  }, [selectedYear]);

  useEffect(() => {
    /* Sample mode renders from the bundled dataset, so skip the live
       gender-statistics reads entirely (mirrors the hero cards above). */
    if (useSample) {
      setGenderLoading(false);
      setGenderError("");
      return;
    }
    let mounted = true;
    const load = async () => {
      setGenderLoading(true);
      setGenderError("");
      const studentQuery = selectedYear
        ? `?type=students&school_year=${encodeURIComponent(
            academicYearLabel(selectedYear),
          )}`
        : "?type=students";
      const [students, employees] = await Promise.allSettled([
        axios.get(`/api/analytics/gender-statistics${studentQuery}`),
        axios.get("/api/analytics/gender-statistics?type=employees"),
      ]);
      if (!mounted) return;
      const pick = (result) =>
        result.status === "fulfilled" ? result.value.data || null : null;
      const studentData = pick(students);
      const employeeData = pick(employees);
      setGenderStats({ students: studentData, employees: employeeData });
      if (!studentData && !employeeData) {
        setGenderError("Unable to load gender statistics.");
      }
      setGenderLoading(false);
    };
    load();
    return () => {
      mounted = false;
    };
  }, [selectedYear, useSample]);


  return {
    events,
    setEvents,
    eventsLoading,
    setEventsLoading,
    eventsError,
    setEventsError,
    GPB,
    setGPB,
    gpbLoading,
    setGpbLoading,
    gpbError,
    setGpbError,
    upcomingEvents,
    setUpcomingEvents,
    upcomingLoading,
    setUpcomingLoading,
    selectedYear,
    setSelectedYear,
    readiness,
    setReadiness,
    readinessLoading,
    setReadinessLoading,
    readinessError,
    setReadinessError,
    genderStats,
    setGenderStats,
    genderLoading,
    setGenderLoading,
    genderError,
    setGenderError,
    useSample,
    setUseSample,
    yearEvents,
    eventStats,
    yearOptions,
    selectedYearLabel,
    selectedGpb,
    sampleImpact,
    sampleGenderStats,
    activeGenderStats,
    showGenderLoading,
    showGenderError,
    projectsSnapshot,
    planBudgets,
    gaaChartData,
  };
}
