"use client";
import React, { useState, useMemo, useEffect } from "react";
import Snapshot from "../../components/snapshot";
import GenderPanel from "../../components/genderPanel";
import Demographics from "../../components/demographics";
import useDashboardData from "@/hooks/useDashboardData";
import useDashboardFilters from "@/hooks/useDashboardFilters";
import { useSelector } from "react-redux";

export default function DeanDashboardContent() {
  const college = useSelector((state) => state.auth.college);
  const { data: filters, loading: filtersLoading } = useDashboardFilters();

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

  const { data: dashboardData, loading: dashboardLoading } = useDashboardData(
    dashboardFilters,
    filtersReady,
  );

  return (
    <div>
      <div className="flex flex-wrap gap-4 mb-4 justify-end text-xs">
        <select
          className="border p-2 rounded bg-white"
          value={filterSchoolYear}
          onChange={(e) => setFilterSchoolYear(e.target.value)}
        >
          <option value="" disabled>
            School Year
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
          <option value="" disabled>
            Semester
          </option>
          {semesterOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-4">
        {dashboardLoading || !dashboardData ? (
          <div className="flex justify-center py-10">
            <div className="h-8 w-8 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
          </div>
        ) : (
          <>
            <Snapshot
              snapshot={dashboardData.snapshot}
              serverYearGenderData={dashboardData.studentYearGenderData}
            />
            <GenderPanel genderPanel={dashboardData.employeeGenderPanel} />
            <Demographics
              demographics={dashboardData.demographics}
              serverStudentProgramData={dashboardData.studentProgramData}
              serverStudentYearCourseData={dashboardData.studentYearCourseData}
              serverCourseKeys={dashboardData.courseKeys}
              studentCount={
                (dashboardData.studentProgramData || []).reduce(
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