"use client";

import { useState, useMemo, useEffect } from "react";
import useDashboardData from "@/hooks/useDashboardData";
import useDashboardFilters from "@/hooks/useDashboardFilters";
import { AnalyticsDashboardSkeleton } from "@/components/Skeleton";
import Snapshot from "./components/snapshot";
import GenderPanel from "./components/genderPanel";
import Demographics from "./components/demographics";
import Filter from "./components/Filter";

const PERSON_TYPE_OPTIONS = ["Student", "Employee"];

export default function Page() {
  const { data: filters, loading: filtersLoading } = useDashboardFilters();

  const [filterSex, setFilterSex] = useState("");
  const [filterYearLevel, setFilterYearLevel] = useState("");
  const [filterSchoolYear, setFilterSchoolYear] = useState("");
  const [filterSemester, setFilterSemester] = useState("");
  const [filterPersonType, setFilterPersonType] = useState("");
  const [filterCollege, setFilterCollege] = useState([]);
  const [filterEmployment, setFilterEmployment] = useState("");
  const [filterAppointment, setFilterAppointment] = useState([]);

  const schoolYearOptions = useMemo(() => filters?.schoolYears || [], [filters]);
  const semesterOptions = useMemo(() => filters?.semesters || [], [filters]);
  const collegeOptions = useMemo(() => filters?.collegeOptions || [], [filters]);
  const yearLevelOptions = useMemo(() => filters?.yearLevelOptions || [], [filters]);
  const sexOption = useMemo(() => filters?.sexOptions || [], [filters]);
  const employmentOptions = useMemo(() => filters?.employmentStatuses || [], [filters]);
  const appointmentOptions = useMemo(() => filters?.appointmentStatuses || [], [filters]);

  useEffect(() => {
    if (schoolYearOptions.length > 0 && !filterSchoolYear) {
      setFilterSchoolYear(schoolYearOptions[0]);
    }
  }, [schoolYearOptions, filterSchoolYear]);

  const filtersReady =
    !filtersLoading && (schoolYearOptions.length === 0 || filterSchoolYear !== "");

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

  const { data: dashboardData, loading: dashboardLoading } = useDashboardData(
    dashboardFilters,
    filtersReady,
  );

  return (
    <div className="py-8 flex flex-col gap-4">
      <div className="flex justify-end">
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
          personTypeOptions={PERSON_TYPE_OPTIONS}
          yearLevelOptions={yearLevelOptions}
          schoolYearOptions={schoolYearOptions}
          semesterOptions={semesterOptions}
          collegeOptions={collegeOptions}
          employmentOptions={employmentOptions}
          appointmentOptions={appointmentOptions}
        />
      </div>

      {dashboardLoading || !dashboardData ? (
        <AnalyticsDashboardSkeleton />
      ) : (
        <>
          <Snapshot snapshot={dashboardData?.snapshot} />
          <GenderPanel genderPanel={dashboardData?.genderPanel} />
          <Demographics
            personTypeFilter={filterPersonType}
            demographics={dashboardData?.demographics}
          />
        </>
      )}
    </div>
  );
}