"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  SAMPLE_EMPLOYEE_LIST_ROWS,
  SAMPLE_SCHOOL_YEARS,
  SAMPLE_STUDENT_LIST_ROWS,
} from "@/app/(pages)/(event)/gender-statistics/components/sampleProfileRecords";

const DEFAULT_LIMIT = 50;

const asList = (value) => (Array.isArray(value) ? value : []);

/* Client-side counterpart of /api/profile/list over the named sample
   profiles. Same filters and return shape as useProfileList. */
export default function useSampleProfileList({
  type = "Student",
  limit = DEFAULT_LIMIT,
  filters = {},
} = {}) {
  const [page, setPage] = useState(1);

  const rows =
    type === "Employee" ? SAMPLE_EMPLOYEE_LIST_ROWS : SAMPLE_STUDENT_LIST_ROWS;

  const filtersKey = JSON.stringify({
    sex: filters.sex || "",
    yearLevel: filters.yearLevel || "",
    colleges: asList(filters.colleges),
    offices: asList(filters.offices),
    employmentStatus: filters.employmentStatus || "",
    appointmentStatus: asList(filters.appointmentStatus),
    schoolYear: filters.schoolYear || "",
    semester: filters.semester || "",
    searchName: String(filters.searchName || "").trim().toLowerCase(),
  });

  const filtered = useMemo(() => {
    const f = JSON.parse(filtersKey);
    return rows.filter((row) => {
      const info = row.personal_info_id;
      const acad = info.affiliation?.academic_information;
      const emp = info.affiliation?.employment_information;
      if (f.sex && info.gadData?.sexAtBirth !== f.sex) return false;
      if (f.yearLevel && acad?.year_level !== f.yearLevel) return false;
      if (f.colleges.length && !f.colleges.includes(acad?.college)) {
        return false;
      }
      if (f.offices.length && !f.offices.includes(emp?.office)) return false;
      if (f.employmentStatus && emp?.employment_status !== f.employmentStatus) {
        return false;
      }
      if (
        f.appointmentStatus.length &&
        !f.appointmentStatus.includes(emp?.employment_appointment_status)
      ) {
        return false;
      }
      if (f.schoolYear || f.semester) {
        const enrolled = row.profile_terms.some(
          (term) =>
            (!f.schoolYear || term.school_year === f.schoolYear) &&
            (!f.semester || term.semester === f.semester),
        );
        if (!enrolled) return false;
      }
      if (f.searchName && !row.fullName.toLowerCase().includes(f.searchName)) {
        return false;
      }
      return true;
    });
  }, [rows, filtersKey]);

  useEffect(() => {
    setPage(1);
  }, [filtersKey, limit, type]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
  const current = Math.min(page, totalPages);
  const data = useMemo(
    () => filtered.slice((current - 1) * limit, current * limit),
    [filtered, current, limit],
  );

  const goToPage = useCallback(
    (pageNum) => setPage(Math.min(Math.max(1, pageNum), totalPages)),
    [totalPages],
  );

  return {
    data,
    total: filtered.length,
    totalPages,
    page: current,
    loading: false,
    goToPage,
  };
}

/* Filter dropdown options for sample mode (live mode reads them from
   /api/analytics/filters). */
export function sampleListFilterOptions() {
  const unique = (rows, pick) =>
    [...new Set(rows.map(pick).filter(Boolean))].sort();
  const students = SAMPLE_STUDENT_LIST_ROWS;
  const employees = SAMPLE_EMPLOYEE_LIST_ROWS;
  const acad = (r) => r.personal_info_id.affiliation.academic_information;
  const emp = (r) => r.personal_info_id.affiliation.employment_information;
  return {
    sexOptions: ["Female", "Male"],
    academicCollegeOptions: unique(students, (r) => acad(r).college),
    yearLevelOptions: unique(students, (r) => acad(r).year_level),
    officeOptions: unique(employees, (r) => emp(r).office),
    employmentStatuses: unique(employees, (r) => emp(r).employment_status),
    appointmentStatuses: unique(
      employees,
      (r) => emp(r).employment_appointment_status,
    ),
    schoolYears: [...SAMPLE_SCHOOL_YEARS].reverse(),
    semesters: ["1st", "2nd", "Summer"],
  };
}
