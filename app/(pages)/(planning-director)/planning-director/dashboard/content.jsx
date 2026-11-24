"use client";

import { useState, useMemo, useEffect } from "react";
import useDashboardData from "@/hooks/useDashboardData";
import useDashboardFilters from "@/hooks/useDashboardFilters";
import Snapshot from "../../../(admin)/admin-dashboard/components/snapshot";
import GenderPanel from "../../../(admin)/admin-dashboard/components/genderPanel";
import Demographics from "../../../(admin)/admin-dashboard/components/demographics";
import Filter from "../../../(admin)/admin-dashboard/components/Filter";
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

export default function PlanningDirectorDashboard() {
  const {
    data: filters,
    loading: filtersLoading,
    error: filtersError,
    refresh: refreshFilters,
  } = useDashboardFilters();
  /* Sample mode is the default view; the toggle swaps every panel back to the
     live API (and back) without leaving the page. */
  const [useSample, setUseSample] = useState(true);

  const [filterSex, setFilterSex] = useState("");
  const [filterYearLevel, setFilterYearLevel] = useState("");
  const [filterSchoolYear, setFilterSchoolYear] = useState("");
  const [filterSemester, setFilterSemester] = useState("");
  const [filterPersonType, setFilterPersonType] = useState("");
  const [filterCollege, setFilterCollege] = useState([]);
  const [filterEmployment, setFilterEmployment] = useState("");
  const [filterAppointment, setFilterAppointment] = useState([]);

  /* Filter options follow the data source: in sample mode the dropdowns offer
     the sample dataset's own years, colleges and statuses, so every option can
     actually match records; live mode keeps the API options. */
  const sampleOptions = useMemo(() => sampleDashboardFilterOptions(), []);
  const schoolYearOptions = useMemo(
    () => (useSample ? sampleOptions.schoolYears : filters?.schoolYears || []),
    [useSample, sampleOptions, filters],
  );
  const semesterOptions = useMemo(
    () => (useSample ? sampleOptions.semesters : filters?.semesters || []),
    [useSample, sampleOptions, filters],
  );
  const collegeOptions = useMemo(
    () =>
      useSample ? sampleOptions.collegeOptions : filters?.collegeOptions || [],
    [useSample, sampleOptions, filters],
  );
  const yearLevelOptions = useMemo(
    () =>
      useSample
        ? sampleOptions.yearLevelOptions
        : filters?.yearLevelOptions || [],
    [useSample, sampleOptions, filters],
  );
  const sexOption = useMemo(
    () => (useSample ? sampleOptions.sexOptions : filters?.sexOptions || []),
    [useSample, sampleOptions, filters],
  );
  const employmentOptions = useMemo(
    () =>
      useSample
        ? sampleOptions.employmentStatuses
        : filters?.employmentStatuses || [],
    [useSample, sampleOptions, filters],
  );
  const appointmentOptions = useMemo(
    () =>
      useSample
        ? sampleOptions.appointmentStatuses
        : filters?.appointmentStatuses || [],
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
      college: filterCollege?.length ? filterCollege[0] : "",
      school_year: filterSchoolYear,
      semester: filterSemester,
      sex: filterSex,
      person_type: filterPersonType,
      year_level: filterYearLevel,
      employment: filterEmployment,
      appointment: filterAppointment?.length ? filterAppointment[0] : "",
    }),
    [
      filterCollege,
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
     synthetic dataset instead. */
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
    <div className="py-8 flex flex-col gap-4">
      <h1 className="sr-only">Planning Director Dashboard</h1>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SampleToggle
          useSample={useSample}
          onToggle={() => setUseSample((prev) => !prev)}
        />
        <Filter
          filterSex={filterSex}
          filterPersonType={filterPersonType}
          filterYearLevel={filterYearLevel}
          filterSchoolYear={filterSchoolYear}
          filterSemester={filterSemester}
          filterCollege={filterCollege}
          filterEmployment={filterEmployment}
          filterAppointment={filterAppointment}
          setFilterSex={setFilterSex}
          setFilterPersonType={setFilterPersonType}
          setFilterYearLevel={setFilterYearLevel}
          setFilterSchoolYear={setFilterSchoolYear}
          setFilterSemester={setFilterSemester}
          setFilterCollege={setFilterCollege}
          setFilterEmployment={setFilterEmployment}
          setFilterAppointment={setFilterAppointment}
          sexOption={sexOption}
          personTypeOptions={["Student", "Employee"]}
          yearLevelOptions={yearLevelOptions}
          schoolYearOptions={schoolYearOptions}
          semesterOptions={semesterOptions}
          collegeOptions={collegeOptions}
          employmentOptions={employmentOptions}
          appointmentOptions={appointmentOptions}
        />
      </div>

      {useSample && <SampleDataNotice />}

      {loadError ? (
        <LoadError message={loadError} onRetry={retryLoad} />
      ) : !showDashboard ? (
        <AnalyticsDashboardSkeleton />
      ) : (
        <>
          <Snapshot snapshot={activeData?.snapshot} />
          <GenderPanel genderPanel={activeData?.genderPanel} />
          <Demographics
            personTypeFilter={filterPersonType}
            demographics={activeData?.demographics}
          />
        </>
      )}
    </div>
  );
}