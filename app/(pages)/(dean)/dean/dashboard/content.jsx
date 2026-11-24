"use client";
import React, { useState, useMemo, useEffect } from "react";
import Snapshot from "../../components/snapshot";
import GenderPanel from "../../components/genderPanel";
import Demographics from "../../components/demographics";
import useDashboardData from "@/hooks/useDashboardData";
import useDashboardFilters from "@/hooks/useDashboardFilters";
import {
  buildSampleDashboardData,
  sampleDashboardFilterOptions,
} from "../../../(event)/gender-statistics/components/sampleDashboardData";
import {
  SampleDataNotice,
  SampleToggle,
} from "../../../(event)/gender-statistics/components/SampleToggle";
import { AnalyticsDashboardSkeleton } from "@/components/Skeleton";
import LoadError from "@/components/LoadError";
import { useSelector } from "react-redux";

export default function DeanDashboardContent() {
  const college = useSelector((state) => state.auth.college);
  const {
    data: filters,
    loading: filtersLoading,
    error: filtersError,
    refresh: refreshFilters,
  } = useDashboardFilters();
  /* Sample mode is the default view; the toggle swaps every panel back to the
     live API (and back) without leaving the page. The dean's college scope is
     applied to both sources. */
  const [useSample, setUseSample] = useState(true);

  const [filterSex, setFilterSex] = useState("");
  const [filterYearLevel, setFilterYearLevel] = useState("");
  const [filterPersonType, setFilterPersonType] = useState("");
  const [filterCollege, setFilterCollege] = useState([]);
  const [filterEmployment, setFilterEmployment] = useState("");
  const [filterAppointment, setFilterAppointment] = useState([]);
  const [filterSchoolYear, setFilterSchoolYear] = useState("");
  const [filterSemester, setFilterSemester] = useState("");

  const effectiveCollege =
    college || (filterCollege?.length ? filterCollege[0] : "");

  /* Filter options follow the data source: the sample dataset's own five years
     and semesters in sample mode, the live options otherwise. */
  const sampleOptions = useMemo(() => sampleDashboardFilterOptions(), []);
  const schoolYearOptions = useMemo(
    () => (useSample ? sampleOptions.schoolYears : filters?.schoolYears || []),
    [useSample, sampleOptions, filters],
  );
  const semesterOptions = useMemo(
    () => (useSample ? sampleOptions.semesters : filters?.semesters || []),
    [useSample, sampleOptions, filters],
  );

  /* "" is "All school years" and is the default. The year used to be forced
     to the newest option, so "All" could never be chosen and the dashboard
     opened on the newest term alone (a few hundred people out of ~10k). A
     year is only cleared when the current dataset does not have it, e.g.
     after switching between sample and live data. */
  useEffect(() => {
    if (
      filterSchoolYear &&
      schoolYearOptions.length > 0 &&
      !schoolYearOptions.includes(filterSchoolYear)
    ) {
      setFilterSchoolYear("");
    }
  }, [schoolYearOptions, filterSchoolYear]);

  const filtersReady = useSample || !filtersLoading;

  const dashboardFilters = useMemo(
    () => ({
      college: effectiveCollege,
      school_year: filterSchoolYear,
      semester: filterSemester,
      sex: filterSex,
      person_type: filterPersonType,
      year_level: filterYearLevel,
      employment: filterEmployment,
      appointment: filterAppointment?.length ? filterAppointment[0] : "",
    }),
    [
      effectiveCollege,
      filterSchoolYear,
      filterSemester,
      filterSex,
      filterPersonType,
      filterYearLevel,
      filterEmployment,
      filterAppointment,
    ],
  );

  /* Live fetching stays parked while sample mode is on - the panels read the
     synthetic dataset instead, scoped to the dean's own college. */
  const {
    data: dashboardData,
    loading: dashboardLoading,
    error: dashboardError,
    refresh: refreshDashboard,
  } = useDashboardData(
    dashboardFilters,
    filtersReady && !useSample,
  );

  const sampleData = useMemo(
    () => (useSample ? buildSampleDashboardData(dashboardFilters) : null),
    [useSample, dashboardFilters],
  );
  const activeData = useSample ? sampleData : dashboardData;
  const showDashboard = useSample || (!dashboardLoading && !!dashboardData);
  /* Live data only: a failed request used to leave the skeleton up for good. */
  const loadError = !useSample && (dashboardError || filtersError);
  const retryLoad = () => {
    if (filtersError) refreshFilters();
    if (dashboardError) refreshDashboard();
  };

  return (
    <div>
      <h1 className="sr-only">Dean Dashboard</h1>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4 text-xs">
        <SampleToggle
          useSample={useSample}
          onToggle={() => setUseSample((prev) => !prev)}
        />
        <div className="flex flex-wrap gap-4">
          <select
          className="border p-2 rounded bg-white"
          value={filterSchoolYear}
          onChange={(e) => setFilterSchoolYear(e.target.value)}
        >
          <option value="">
            All School Years
          </option>
          {schoolYearOptions.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        <select
          className="border p-2 rounded bg-white"
          value={filterSemester}
          onChange={(e) => setFilterSemester(e.target.value)}
        >
          <option value="">
            All Semesters
          </option>
          {semesterOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
          </select>
        </div>
      </div>
      <div className="flex flex-col gap-4">
        {useSample && <SampleDataNotice />}

        {loadError ? (
          <LoadError message={loadError} onRetry={retryLoad} />
        ) : !showDashboard ? (
          <AnalyticsDashboardSkeleton />
        ) : (
          <>
            <Snapshot
              snapshot={activeData?.snapshot}
              serverYearGenderData={activeData?.studentYearGenderData}
            />
            <GenderPanel genderPanel={activeData?.genderPanel} />
            <Demographics
              demographics={activeData?.demographics}
              serverStudentProgramData={activeData?.studentProgramData}
              serverStudentYearCourseData={activeData?.studentYearCourseData}
              serverCourseKeys={activeData?.courseKeys}
              studentCount={
                (activeData?.studentProgramData || []).reduce(
                  (s, r) => s + r.value,
                  0,
                ) || 0
              }
            />
          </>
        )}
      </div>
    </div>
  );
}