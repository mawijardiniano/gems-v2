"use client";

import { useState, useMemo, useEffect } from "react";
import axios from "axios";
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
import EmployeeFilterTable from "../components/EmployeeFilterTable";

export default function EmployeeListPageContent({ defaultType = "" }) {
  const { data: rawData, loading } = useFetchData();

  const [filterSex, setFilterSex] = useState("");
  const [filterPersonType, setFilterPersonType] = useState(defaultType);
  const [filterYearLevel, setFilterYearLevel] = useState("");
  const [filterCollege, setFilterCollege] = useState([]);
  const [filterEmployment, setFilterEmployment] = useState("");
  const [filterAppointment, setFilterAppointment] = useState([]);

  const [selected, setSelected] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [nameSort, setNameSort] = useState(null);
  const [sexSort, setSexSort] = useState(null);
  const [officeSort, setOfficeSort] = useState(null);
  const [employmentSort, setEmploymentSort] = useState(null);
  const [appointmentSort, setAppointmentSort] = useState(null);

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
    let data = rawData.filter((user) => {
      const p = user.personal_info_id || {};
      const gad = p.gadData || {};
      const personal = p.personal || {};
      const affiliation = p.affiliation || {};
      const acad = affiliation.academic_information || {};
      const emp = affiliation.employment_information || {};
      const collegeOrOffice = acad.college || emp.office || "";
      const empStatus = emp.employment_status || "";
      const empAppointment = emp.employment_appointment_status || "";

      if (personal.currentStatus !== "Employee") return false;

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
    if (nameSort) {
      data = [...data].sort((a, b) => {
        const pa = a.personal_info_id?.personal || {};
        const pb = b.personal_info_id?.personal || {};
        const nameA = `${pa.first_name || ""} ${pa.last_name || ""}`
          .trim()
          .toLowerCase();
        const nameB = `${pb.first_name || ""} ${pb.last_name || ""}`
          .trim()
          .toLowerCase();
        if (nameA < nameB) return nameSort === "asc" ? -1 : 1;
        if (nameA > nameB) return nameSort === "asc" ? 1 : -1;
        return 0;
      });
    }
    if (sexSort) {
      data = [...data].sort((a, b) => {
        const ga = a.personal_info_id?.gadData || {};
        const gb = b.personal_info_id?.gadData || {};
        const normalizeSex = (val) => {
          if (!val) return "zzz";
          const v = val.toLowerCase();
          if (v === "male") return "a";
          if (v === "female") return "b";
          return "c" + v;
        };
        const sexA = normalizeSex(ga.sexAtBirth);
        const sexB = normalizeSex(gb.sexAtBirth);
        if (sexA < sexB) return sexSort === "asc" ? -1 : 1;
        if (sexA > sexB) return sexSort === "asc" ? 1 : -1;
        return 0;
      });
    }
    if (officeSort) {
      data = [...data].sort((a, b) => {
        const officeA =
          a.personal_info_id?.affiliation?.employment_information || {};
        const officeB =
          b.personal_info_id?.affiliation?.employment_information || {};
        const offA = (officeA.office || "").toLowerCase();
        const offB = (officeB.office || "").toLowerCase();
        if (offA < offB) return officeSort === "asc" ? -1 : 1;
        if (offA > offB) return officeSort === "asc" ? 1 : -1;
        return 0;
      });
    }
    if (employmentSort) {
      data = [...data].sort((a, b) => {
        const empA =
          a.personal_info_id?.affiliation?.employment_information || {};
        const empB =
          b.personal_info_id?.affiliation?.employment_information || {};
        const employmentA = (empA.employment_status || "").toLowerCase();
        const employmentB = (empB.employment_status || "").toLowerCase();
        if (employmentA < employmentB) return employmentSort === "asc" ? -1 : 1;
        if (employmentA > employmentB) return employmentSort === "asc" ? 1 : -1;
        return 0;
      });
    }
    if (appointmentSort) {
      data = [...data].sort((a, b) => {
        const appA =
          a.personal_info_id?.affiliation?.employment_information || {};
        const appB =
          b.personal_info_id?.affiliation?.employment_information || {};
        const appointmentA = (
          appA.employment_appointment_status || ""
        ).toLowerCase();
        const appointmentB = (
          appB.employment_appointment_status || ""
        ).toLowerCase();
        if (appointmentA < appointmentB)
          return appointmentSort === "asc" ? -1 : 1;
        if (appointmentA > appointmentB)
          return appointmentSort === "asc" ? 1 : -1;
        return 0;
      });
    }
    return data;
  }, [
    rawData,
    filterSex,
    filterPersonType,
    filterYearLevel,
    filterCollege,
    filterEmployment,
    filterAppointment,
    nameSort,
    sexSort,
    officeSort,
    employmentSort,
    appointmentSort,
  ]);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pageSizeInput, setPageSizeInput] = useState("10");
  const totalRows = filteredData.length;
  const totalPages = Math.ceil(totalRows / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, page, pageSize]);

  const allIds = useMemo(
    () =>
      paginatedData.map(
        (user) => user._id || user.personal_info_id?._id || user,
      ),
    [paginatedData],
  );
  const isAllSelected = selected.length === allIds.length && allIds.length > 0;
  const toggleSelectAll = () => {
    if (isAllSelected) setSelected([]);
    else setSelected(allIds);
  };
  const toggleSelect = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };
  const handleBulkDelete = () => {
    setShowConfirmModal(true);
  };

  const confirmBulkDelete = async () => {
    try {
      await axios.delete("/api/profile/delete-bulk", {
        data: { ids: selected },
      });
      setSelected([]);
      setShowConfirmModal(false);
      window.location.reload();
    } catch (err) {
      setShowConfirmModal(false);
      setShowErrorModal(true);
    }
  };

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
          <EmployeeFilterTable
            filterSex={filterSex}
            filterPersonType={filterPersonType}
            filterCollege={filterCollege}
            filterEmployment={filterEmployment}
            filterAppointment={filterAppointment}
            setFilterSex={setFilterSex}
            setFilterPersonType={setFilterPersonType}
            setFilterCollege={setFilterCollege}
            setFilterEmployment={setFilterEmployment}
            setFilterAppointment={setFilterAppointment}
            sexOption={sexOption}
            personTypeOptions={personTypeOptions}
            collegeOptions={collegeOptions}
            employmentOptions={employmentOptions}
            appointmentOptions={appointmentOptions}
          />
        </div>
      </div>

      <div className="flex justify-between mb-2">
        <div>
          <input
            type="checkbox"
            checked={isAllSelected}
            onChange={toggleSelectAll}
            aria-label="Select all"
          />
          <span className="ml-2">Select All</span>
        </div>
        {selected.length > 0 && (
          <button
            className="bg-red-500 px-4 py-1 text-white rounded-md"
            onClick={handleBulkDelete}
          >
            Delete
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <Table className="bg-white" striped={false} color="none">
          <TableHead className="bg-gray-200 text-black">
            <TableHeadCell></TableHeadCell>
            <TableHeadCell
              className="cursor-pointer select-none"
              onClick={() =>
                setNameSort((prev) => (prev === "asc" ? "desc" : "asc"))
              }
            >
              Name
              <span className="ml-1 align-middle inline-block">
                <span
                  className={
                    nameSort === "asc"
                      ? "text-blue-600 font-bold"
                      : "text-gray-400"
                  }
                >
                  ▲
                </span>
                <span
                  className={
                    nameSort === "desc"
                      ? "text-blue-600 font-bold"
                      : "text-gray-400"
                  }
                >
                  ▼
                </span>
              </span>
            </TableHeadCell>
            <TableHeadCell
              className="cursor-pointer select-none"
              onClick={() =>
                setSexSort((prev) => (prev === "asc" ? "desc" : "asc"))
              }
            >
              Sex
              <span className="ml-1">
                <span
                  className={
                    sexSort === "asc"
                      ? "text-blue-600 font-bold"
                      : "text-gray-400"
                  }
                >
                  ▲
                </span>
                <span
                  className={
                    sexSort === "desc"
                      ? "text-blue-600 font-bold"
                      : "text-gray-400"
                  }
                >
                  ▼
                </span>
              </span>
            </TableHeadCell>
            <TableHeadCell
              className="cursor-pointer select-none"
              onClick={() =>
                setOfficeSort((prev) => (prev === "asc" ? "desc" : "asc"))
              }
            >
              Office
              <span className="ml-1">
                <span
                  className={
                    officeSort === "asc"
                      ? "text-blue-600 font-bold"
                      : "text-gray-400"
                  }
                >
                  ▲
                </span>
                <span
                  className={
                    officeSort === "desc"
                      ? "text-blue-600 font-bold"
                      : "text-gray-400"
                  }
                >
                  ▼
                </span>
              </span>
            </TableHeadCell>
            <TableHeadCell
              className="cursor-pointer select-none"
              onClick={() =>
                setEmploymentSort((prev) => (prev === "asc" ? "desc" : "asc"))
              }
            >
              Employment Status
              <span className="ml-1">
                <span
                  className={
                    employmentSort === "asc"
                      ? "text-blue-600 font-bold"
                      : "text-gray-400"
                  }
                >
                  ▲
                </span>
                <span
                  className={
                    employmentSort === "desc"
                      ? "text-blue-600 font-bold"
                      : "text-gray-400"
                  }
                >
                  ▼
                </span>
              </span>
            </TableHeadCell>
            <TableHeadCell
              className="cursor-pointer select-none"
              onClick={() =>
                setAppointmentSort((prev) => (prev === "asc" ? "desc" : "asc"))
              }
            >
              Appointment Status
              <span className="ml-1">
                <span
                  className={
                    appointmentSort === "asc"
                      ? "text-blue-600 font-bold"
                      : "text-gray-400"
                  }
                >
                  ▲
                </span>
                <span
                  className={
                    appointmentSort === "desc"
                      ? "text-blue-600 font-bold"
                      : "text-gray-400"
                  }
                >
                  ▼
                </span>
              </span>
            </TableHeadCell>
            <TableHeadCell>Created At</TableHeadCell>
            <TableHeadCell />
          </TableHead>

          <TableBody className="divide-y">
            {paginatedData.map((user, index) => {
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
                    <input
                      type="checkbox"
                      checked={selected.includes(
                        user._id || user.personal_info_id?._id || user,
                      )}
                      onChange={() =>
                        toggleSelect(
                          user._id || user.personal_info_id?._id || user,
                        )
                      }
                    />
                  </TableCell>
                  <TableCell>
                    {personal.first_name || ""} {personal.last_name || ""}
                  </TableCell>
                  <TableCell>{gad.sexAtBirth || "—"}</TableCell>
                  <TableCell>{emp.office || "—"}</TableCell>
                  <TableCell>{emp.employment_status || "—"}</TableCell>
                  <TableCell>
                    {emp.employment_appointment_status || "—"}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const dateStr =
                        p.createdAt || emp.created_at || user.createdAt;
                      if (!dateStr) return "—";
                      const date = new Date(dateStr);
                      return date.toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      });
                    })()}
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

            {paginatedData.length === 0 && (
              <TableRow>
                <TableCell colSpan={columnCount} className="text-center py-6">
                  No users found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mt-4">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <input
            type="number"
            min={1}
            max={100}
            value={pageSizeInput}
            onChange={(e) => setPageSizeInput(e.target.value)}
            onBlur={() => {
              let val = parseInt(pageSizeInput, 10);
              if (isNaN(val) || val < 1) val = 1;
              if (val > 100) val = 100;
              setPageSize(val);
              setPage(1);
              setPageSizeInput(String(val));
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.target.blur();
              }
            }}
            className="w-16 border rounded px-2 py-1"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-2 py-1 border rounded disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Prev
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            className="px-2 py-1 border rounded disabled:opacity-50"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </button>
        </div>
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Confirm Delete</h2>
            <div className="text-center text-red-600 mb-6">
              Are you sure you want to delete the selected users?
            </div>
            <div className="flex justify-end gap-2">
              <button
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                onClick={confirmBulkDelete}
              >
                Yes, Delete
              </button>
              <button
                className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400"
                onClick={() => setShowConfirmModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* {showErrorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Error</h2>
            <div className="text-center text-red-600 mb-6">
              Failed to delete selected users.
            </div>
            <div className="flex justify-end">
              <button
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                onClick={() => setShowErrorModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )} */}
    </div>
  );
}
