"use client";

import { useState, useMemo } from "react";
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
import StudentFilterTable from "../components/StudentFilterTable";

export default function StudentsUserListContent() {
  const { data: rawData, loading } = useFetchData();
  const [filterSex, setFilterSex] = useState("");
  const [filterYearLevel, setFilterYearLevel] = useState("");
  const [filterCollege, setFilterCollege] = useState([]);
  const [selected, setSelected] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);

  const studentsData = useMemo(
    () =>
      rawData.filter(
        (user) =>
          (user.personal_info_id?.personal?.currentStatus || "") === "Student",
      ),
    [rawData],
  );

  const sexOption = useMemo(
    () => [
      ...new Set(
        studentsData
          .map((d) => d?.personal_info_id?.gadData?.sexAtBirth)
          .filter(Boolean),
      ),
    ],
    [studentsData],
  );
  const collegeOptions = useMemo(
    () => [
      ...new Set(
        studentsData
          .map(
            (d) =>
              d?.personal_info_id?.affiliation.academic_information?.college,
          )
          .filter(Boolean),
      ),
    ],
    [studentsData],
  );
  const yearLevelOptions = useMemo(
    () => [
      ...new Set(
        studentsData
          .map(
            (d) =>
              d?.personal_info_id?.affiliation.academic_information?.year_level,
          )
          .filter(Boolean),
      ),
    ],
    [studentsData],
  );

  const filteredData = useMemo(() => {
    return studentsData.filter((user) => {
      const p = user.personal_info_id || {};
      const gad = p.gadData || {};
      const acad = p.affiliation?.academic_information || {};
      return (
        (!filterSex || gad.sexAtBirth === filterSex) &&
        (!filterYearLevel || acad.year_level === filterYearLevel) &&
        (filterCollege.length === 0 || filterCollege.includes(acad.college))
      );
    });
  }, [studentsData, filterSex, filterYearLevel, filterCollege]);

  const allIds = useMemo(
    () =>
      filteredData.map(
        (user) => user._id || user.personal_info_id?._id || user,
      ),
    [filteredData],
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

  return (
    <div className="p-6">
      <div className="flex justify-end">
        <div className="flex">
          <StudentFilterTable
            filterSex={filterSex}
            filterYearLevel={filterYearLevel}
            filterCollege={filterCollege}
            setFilterSex={setFilterSex}
            setFilterYearLevel={setFilterYearLevel}
            setFilterCollege={setFilterCollege}
            sexOption={sexOption}
            yearLevelOptions={yearLevelOptions}
            collegeOptions={collegeOptions}
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
            <TableRow>
              <TableHeadCell></TableHeadCell>
              <TableHeadCell>Name</TableHeadCell>
              <TableHeadCell>Gender</TableHeadCell>
              <TableHeadCell>College</TableHeadCell>
              <TableHeadCell>Campus</TableHeadCell>
              <TableHeadCell>Course</TableHeadCell>
              <TableHeadCell>Year Level</TableHeadCell>
              <TableHeadCell>Created At</TableHeadCell>
              <TableHeadCell />
            </TableRow>
          </TableHead>
          <TableBody className="divide-y">
            {filteredData.map((user, index) => {
              const p = user.personal_info_id || {};
              const personal = p.personal || {};
              const gad = p.gadData || {};
              const acad = p.affiliation?.academic_information || {};
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
                  <TableCell>{acad.college || "—"}</TableCell>
                  <TableCell>{acad.campus || "—"}</TableCell>
                  <TableCell>{acad.course || "—"}</TableCell>
                  <TableCell>{acad.year_level || "—"}</TableCell>
                  <TableCell>
                    {p.createdAt
                      ? new Date(p.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : user.createdAt
                        ? new Date(user.createdAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                        : "—"}
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
                <TableCell colSpan={8} className="text-center py-6">
                  No users found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
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
      {/* Custom Error Modal
      {showErrorModal && (
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
