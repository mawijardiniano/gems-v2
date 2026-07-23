"use client";

import { useState, useMemo } from "react";
import useFetchData from "@/hooks/useSample";
import Snapshot from "../../../(admin)/admin-dashboard/components/snapshot";
import GenderPanel from "../../../(admin)/admin-dashboard/components/genderPanel";
import Demographics from "../../../(admin)/admin-dashboard/components/demographics";
import Filter from "../../../(admin)/admin-dashboard/components/Filter";

export default function PlanningDirectorDashboard() {
  const { data: rawData, loading } = useFetchData();

  const [filterSex, setFilterSex] = useState("");
  const [filterYearLevel, setFilterYearLevel] = useState("");
  const [filterSchoolYear, setFilterSchoolYear] = useState("");
  const [filterSemester, setFilterSemester] = useState("");
  const [filterPersonType, setFilterPersonType] = useState("");
  const [filterCollege, setFilterCollege] = useState([]);
  const [filterEmployment, setFilterEmployment] = useState("");
  const [filterAppointment, setFilterAppointment] = useState([]);

  const sexOption = useMemo(
    () => [
      ...new Set(
        rawData
          .map((d) => d?.personal_info_id?.gadData?.sexAtBirth ?? "Unknown")
          .filter(Boolean),
      ),
    ],
    [rawData],
  );

  const collegeOptions = useMemo(
    () => [
      ...new Set(
        rawData
          .map(
            (d) =>
              d?.personal_info_id?.affiliation.academic_information?.college ||
              d?.personal_info_id?.affiliation.employment_information?.office,
          )
          .filter(Boolean),
      ),
    ],
    [rawData],
  );

  const employmentOptions = useMemo(
    () => [
      ...new Set(
        rawData
          .map(
            (d) =>
              d?.personal_info_id?.affiliation.employment_information
                ?.employment_status,
          )
          .filter(Boolean),
      ),
    ],
    [rawData],
  );

  const appointmentOptions = useMemo(
    () => [
      ...new Set(
        rawData
          .map(
            (d) =>
              d?.personal_info_id?.affiliation.employment_information
                ?.employment_appointment_status,
          )
          .filter(Boolean),
      ),
    ],
    [rawData],
  );

  const yearLevelOptions = useMemo(
    () => [
      ...new Set(
        rawData
          .map(
            (d) =>
              d?.personal_info_id?.affiliation.academic_information?.year_level,
          )
          .filter(Boolean),
      ),
    ],
    [rawData],
  );

  const schoolYearOptions = useMemo(
    () => [
      ...new Set(
        rawData.flatMap((d) =>
          Array.isArray(d?.profile_terms)
            ? d.profile_terms.map((term) => term?.school_year).filter(Boolean)
            : d?.school_year
              ? [d.school_year]
              : [],
        ),
      ),
    ],
    [rawData],
  );

  const semesterOptions = useMemo(
    () => [
      ...new Set(
        rawData.flatMap((d) =>
          Array.isArray(d?.profile_terms)
            ? d.profile_terms.map((term) => term?.semester).filter(Boolean)
            : d?.semester
              ? [d.semester]
              : [],
        ),
      ),
    ],
    [rawData],
  );

  const filteredData = useMemo(() => {
    return rawData.filter((d) => {
      const p = d?.personal_info_id || {};
      if (!p || Object.keys(p).length === 0) return false;

      const acad = p.affiliation?.academic_information || {};
      const emp = p.affiliation?.employment_information || {};
      const collegeOrOffice = acad.college || emp.office || "";
      const empStatus = emp.employment_status || "";
      const empAppointment = emp.employment_appointment_status || "";
      const terms = Array.isArray(d?.profile_terms) ? d.profile_terms : [];
      const schoolYearMatches =
        !filterSchoolYear ||
        terms.some((term) => term?.school_year === filterSchoolYear) ||
        d?.school_year === filterSchoolYear;
      const semesterMatches =
        !filterSemester ||
        terms.some((term) => term?.semester === filterSemester) ||
        d?.semester === filterSemester;

      return (
        (!filterSex || (p.gadData?.sexAtBirth ?? "Unknown") === filterSex) &&
        (!filterPersonType || p.personal.currentStatus === filterPersonType) &&
        (!filterYearLevel || acad.year_level === filterYearLevel) &&
        schoolYearMatches &&
        semesterMatches &&
        (filterCollege.length === 0 ||
          filterCollege.includes(collegeOrOffice)) &&
        (!filterEmployment || empStatus === filterEmployment) &&
        (filterAppointment.length === 0 ||
          filterAppointment.includes(empAppointment))
      );
    });
  }, [
    rawData,
    filterSex,
    filterPersonType,
    filterYearLevel,
    filterSchoolYear,
    filterSemester,
    filterCollege,
    filterEmployment,
    filterAppointment,
  ]);

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
          personTypeOptions={["Student", "Employee"]}
          yearLevelOptions={yearLevelOptions}
          schoolYearOptions={schoolYearOptions}
          semesterOptions={semesterOptions}
          collegeOptions={collegeOptions}
          employmentOptions={employmentOptions}
          appointmentOptions={appointmentOptions}
        />
      </div>

      <Snapshot data={filteredData} />
      <GenderPanel data={filteredData} />
      <Demographics data={filteredData} personTypeFilter={filterPersonType} />
    </div>
  );
}