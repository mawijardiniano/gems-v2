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
  const [filterCollege, setFilterCollege] = useState([]);
  const [filterEmployment, setFilterEmployment] = useState("");
  const [filterAppointment, setFilterAppointment] = useState([]);

  const sexOption = useMemo(
    () => [
      ...new Set(
        rawData.map((d) => d.personal_information?.sex).filter(Boolean)
      ),
    ],
    [rawData]
  );

  const collegeOptions = useMemo(
    () => [
      ...new Set(
        rawData
          .map((d) => d.personal_information?.college_office)
          .filter(Boolean)
      ),
    ],
    [rawData]
  );

  const employmentOptions = useMemo(
    () => [
      ...new Set(
        rawData
          .map((d) => d.personal_information?.employment_status)
          .filter(Boolean)
      ),
    ],
    [rawData]
  );

  const appointmentOptions = useMemo(
    () => [
      ...new Set(
        rawData
          .map((d) => d.personal_information?.employment_appointment_status)
          .filter(Boolean)
      ),
    ],
    [rawData]
  );

  const filteredData = useMemo(() => {
    return rawData.filter((user) => {
      const p = user.personal_information || {};
      return (
        (!filterSex || p.sex === filterSex) &&
        (filterCollege.length === 0 ||
          filterCollege.includes(p.college_office)) &&
        (!filterEmployment || p.employment_status === filterEmployment) &&
        (filterAppointment.length === 0 ||
          filterAppointment.includes(p.employment_appointment_status))
      );
    });
  }, [rawData, filterSex, filterCollege, filterEmployment, filterAppointment]);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">User List</h1>
        <div className="flex">
          <Filter
            filterSex={filterSex}
            filterCollege={filterCollege}
            filterEmployment={filterEmployment}
            filterAppointment={filterAppointment}
            setFilterSex={setFilterSex}
            setFilterCollege={setFilterCollege}
            setFilterEmployment={setFilterEmployment}
            setFilterAppointment={setFilterAppointment}
            sexOption={sexOption}
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
                  <TableCell>{p.college_office || "—"}</TableCell>
                  <TableCell>{p.employment_status || "—"}</TableCell>
                  <TableCell>
                    {p.employment_appointment_status || "—"}
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
