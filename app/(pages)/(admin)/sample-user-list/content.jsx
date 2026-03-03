"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
} from "flowbite-react";
import useFetchData from "@/hooks/useSample";
import Filter from "../sample-dashboard/components/Filter";

export default function UserListPageContent({ defaultType = "" }) {
  const { data: rawData, loading } = useFetchData();

  const [filterSex, setFilterSex] = useState("");
  const [filterPersonType, setFilterPersonType] = useState(defaultType);
  const [filterYearLevel, setFilterYearLevel] = useState("");
  const [filterCollege, setFilterCollege] = useState([]);
  const [filterEmployment, setFilterEmployment] = useState("");
  const [filterAppointment, setFilterAppointment] = useState([]);

  const sexOption = useMemo(
    () => [
      ...new Set(
        rawData
          .map((d) => d?.personal_info_id?.gadData?.sexAtBirth)
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

  useEffect(() => {
    if (defaultType && filterPersonType !== defaultType) {
      setFilterPersonType(defaultType);
    }
  }, [defaultType, filterPersonType]);

  const personTypeOptions = useMemo(() => {
    const list = [
      ...new Set(
        rawData
          .map((d) => d?.personal_info_id?.personal.currentStatus)
          .filter(Boolean),
      ),
    ];
    return list.length > 0 ? list : ["Student", "Employee"];
  }, [rawData]);

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

  const filteredData = useMemo(() => {
    return rawData.filter((user) => {
      const p = user.personal_info_id || {};
      const gad = p.gadData || {};
      const personal = p.personal || {};
      const affiliation = p.affiliation || {};
      const acad = affiliation.academic_information || {};
      const emp = affiliation.employment_information || {};
      const collegeOrOffice = acad.college || emp.office || "";
      const empStatus = emp.employment_status || "";
      const empAppointment = emp.employment_appointment_status || "";

      return (
        (!filterSex || gad.sexAtBirth === filterSex) &&
        (!filterPersonType || personal.currentStatus === filterPersonType) &&
        (!filterYearLevel || acad.year_level === filterYearLevel) &&
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
    filterCollege,
    filterEmployment,
    filterAppointment,
  ]);

  const viewType = (filterPersonType || defaultType || "").toLowerCase();
  const showStudentCols = viewType === "student";
  const showEmployeeCols = viewType === "employee";
  const showAllCols = !showStudentCols && !showEmployeeCols;

  const columnCount =
    3 +
    (showStudentCols || showAllCols ? 3 : 0) + 
    (showEmployeeCols || showAllCols ? 2 : 0) + 
    1;

  return (
    <div className="p-6">
      <div className="flex justify-end">
        <div className="flex">
          <Filter
            filterSex={filterSex}
            filterYearLevel={filterYearLevel}
            filterPersonType={filterPersonType}
            filterCollege={filterCollege}
            filterEmployment={filterEmployment}
            filterAppointment={filterAppointment}
            setFilterSex={setFilterSex}
            setFilterYearLevel={setFilterYearLevel}
            setFilterPersonType={setFilterPersonType}
            setFilterCollege={setFilterCollege}
            setFilterEmployment={setFilterEmployment}
            setFilterAppointment={setFilterAppointment}
            sexOption={sexOption}
            personTypeOptions={personTypeOptions}
            yearLevelOptions={yearLevelOptions}
            collegeOptions={collegeOptions}
            employmentOptions={employmentOptions}
            appointmentOptions={appointmentOptions}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table className="bg-white" striped={false} color="none">
          <TableHead className="bg-gray-200 text-black">
            <TableHeadCell>Name</TableHeadCell>
            <TableHeadCell>Gender</TableHeadCell>
            <TableHeadCell>
              {showStudentCols
                ? "College"
                : showEmployeeCols
                  ? "Office"
                  : "College / Office"}
            </TableHeadCell>
            {(showStudentCols || showAllCols) && (
              <TableHeadCell>Campus</TableHeadCell>
            )}
            {(showStudentCols || showAllCols) && (
              <TableHeadCell>Course</TableHeadCell>
            )}
            {(showStudentCols || showAllCols) && (
              <TableHeadCell>Year Level</TableHeadCell>
            )}
            {(showEmployeeCols || showAllCols) && (
              <>
                <TableHeadCell>Employment Status</TableHeadCell>
                <TableHeadCell>Appointment Status</TableHeadCell>
              </>
            )}
            <TableHeadCell />
          </TableHead>

          <TableBody className="divide-y">
            {filteredData.map((user, index) => {
              const p = user.personal_info_id || {};
              const personal = p.personal || {};
              const gad = p.gadData || {};
              const affiliation = p.affiliation || {};
              const acad =
                affiliation.academic_information ||
                p.academic_information ||
                {};
              const emp =
                affiliation.employment_information ||
                p.employment_information ||
                {};
              return (
                <TableRow key={user._id || index} className="hover:bg-gray-50">
                  <TableCell>
                    {personal.first_name || ""} {personal.last_name || ""}
                  </TableCell>
                  <TableCell>{gad.sexAtBirth || "—"}</TableCell>
                  <TableCell>{acad.college || emp.office || "—"}</TableCell>
                  {(showStudentCols || showAllCols) && (
                    <TableCell>{acad.campus || "—"}</TableCell>
                  )}
                  {(showStudentCols || showAllCols) && (
                    <TableCell>{acad.course || "—"}</TableCell>
                  )}
                  {(showStudentCols || showAllCols) && (
                    <TableCell>{acad.year_level || "—"}</TableCell>
                  )}
                  {(showEmployeeCols || showAllCols) && (
                    <>
                      <TableCell>{emp.employment_status || "—"}</TableCell>
                      <TableCell>
                        {emp.employment_appointment_status || "—"}
                      </TableCell>
                    </>
                  )}
                  <TableCell>
                    <Button
                      size="xs"
                      className="bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}

            {filteredData.length === 0 && (
              <TableRow>
                <TableCell colSpan={columnCount} className="text-center py-6">
                  No users found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
