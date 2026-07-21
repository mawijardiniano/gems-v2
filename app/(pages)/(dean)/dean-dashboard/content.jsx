"use client";
import React from "react";
import Snapshot from "../components/snapshot";
import GenderPanel from "../components/genderPanel";
import Demographics from "../components/demographics";
import useFetchData from "@/hooks/useSample";
import { useState, useMemo } from "react";
import { useSelector } from "react-redux";

export default function DeanDashboardContent() {
  const { data: rawData, loading } = useFetchData();
  const college = useSelector((state) => state.auth.college);
  console.log("College", college)

  const [filterSex, setFilterSex] = useState("");
  const [filterYearLevel, setFilterYearLevel] = useState("");
  const [filterPersonType, setFilterPersonType] = useState("");
  const [filterCollege, setFilterCollege] = useState([]);
  const [filterEmployment, setFilterEmployment] = useState("");
  const [filterAppointment, setFilterAppointment] = useState([]);
  const [filterSchoolYear, setFilterSchoolYear] = useState("");
  const [filterSemester, setFilterSemester] = useState("");

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
            ? d.profile_terms.map((t) => t?.school_year).filter(Boolean)
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
            ? d.profile_terms.map((t) => t?.semester).filter(Boolean)
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
        terms.some((t) => t?.school_year === filterSchoolYear) ||
        d?.school_year === filterSchoolYear;
      const semesterMatches =
        !filterSemester ||
        terms.some((t) => t?.semester === filterSemester) ||
        d?.semester === filterSemester;

      return (
        (!filterSex || (p.gadData?.sexAtBirth ?? "Unknown") === filterSex) &&
        (!filterPersonType || p.personal.currentStatus === filterPersonType) &&
        (!filterYearLevel || acad.year_level === filterYearLevel) &&
        (filterCollege.length === 0 ||
          filterCollege.includes(collegeOrOffice)) &&
        (!filterEmployment || empStatus === filterEmployment) &&
        (filterAppointment.length === 0 ||
          filterAppointment.includes(empAppointment)) &&
        schoolYearMatches &&
        semesterMatches
      );
    });
  }, [
    rawData,
    filterSex,
    filterPersonType,
    filterYearLevel,
    filterCollege,
    filterEmployment,
    filterAppointment,
    filterSchoolYear,
    filterSemester,
  ]);
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
        <Snapshot
          data={filteredData}
          college={college}
        />
        <GenderPanel
          data={filteredData}
          college={college}
        />
        <Demographics
          data={filteredData}
          college={college}
        />
      </div>
    </div>
  );
}
