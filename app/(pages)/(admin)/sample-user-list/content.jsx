"use client";

import { useState, useMemo } from "react";
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

export default function UserListPageContent() {
  const { data: rawData, loading } = useFetchData();

  const [filterSex, setFilterSex] = useState("");
  const [filterPersonType, setFilterPersonType] = useState("");
  const [filterYearLevel, setFilterYearLevel] = useState("");
  const [filterCollege, setFilterCollege] = useState([]);
  const [filterEmployment, setFilterEmployment] = useState("");
  const [filterAppointment, setFilterAppointment] = useState([]);

  const sexOption = useMemo(
    () => [
      ...new Set(
        rawData.map((d) => d?.personal_information?.sex).filter(Boolean),
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
              d?.personal_information?.academic_information?.college ||
              d?.personal_information?.employment_information?.office,
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
              d?.personal_information?.employment_information
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
              d?.personal_information?.employment_information
                ?.employment_appointment_status,
          )
          .filter(Boolean),
      ),
    ],
    [rawData],
  );

  const personTypeOptions = useMemo(() => {
    const list = [
      ...new Set(
        rawData
          .map((d) => d?.personal_information?.person_type)
          .filter(Boolean),
      ),
    ];
    return list.length > 0 ? list : ["Student", "Employee"];
  }, [rawData]);

  const yearLevelOptions = useMemo(
    () => [
      ...new Set(
        rawData
          .map((d) => d?.personal_information?.academic_information?.year_level)
          .filter(Boolean),
      ),
    ],
    [rawData],
  );

  const filteredData = useMemo(() => {
    return rawData.filter((user) => {
      const p = user.personal_information || {};
      const acad = p.academic_information || {};
      const emp = p.employment_information || {};
      const collegeOrOffice = acad.college || emp.office || "";
      const empStatus = emp.employment_status || "";
      const empAppointment = emp.employment_appointment_status || "";

      return (
        (!filterSex || p.sex === filterSex) &&
        (!filterPersonType || p.person_type === filterPersonType) &&
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
            <TableHeadCell>College Office</TableHeadCell>
            <TableHeadCell>Year Level</TableHeadCell>
            <TableHeadCell>Employment Status</TableHeadCell>
            <TableHeadCell>Appointment Status</TableHeadCell>
            <TableHeadCell />
          </TableHead>

          <TableBody className="divide-y">
            {filteredData.map((user, index) => {
              const p = user.personal_information || {};
              return (
                <TableRow key={user._id || index} className="hover:bg-gray-50">
                  <TableCell>
                    {p.first_name} {p.last_name}
                  </TableCell>
                  <TableCell>{p.sex || "—"}</TableCell>
                  <TableCell>
                    {p.academic_information?.college ||
                      p.employment_information?.office ||
                      "—"}
                  </TableCell>
                  <TableCell>
                    {p.academic_information?.year_level || "—"}
                  </TableCell>
                  <TableCell>
                    {p.employment_information?.employment_status || "—"}
                  </TableCell>
                  <TableCell>
                    {p.employment_information?.employment_appointment_status ||
                      "—"}
                  </TableCell>
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
                <TableCell colSpan={6} className="text-center py-6">
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
