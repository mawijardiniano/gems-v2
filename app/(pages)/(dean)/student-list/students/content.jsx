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
import { useSelector } from "react-redux";

export default function StudentsUserListContent({ college }) {
  const { data: rawData, loading } = useFetchData();
  const [filterSex, setFilterSex] = useState("");
  const [filterYearLevel, setFilterYearLevel] = useState("");
  const [filterSchoolYear, setFilterSchoolYear] = useState("");
  const [filterSemester, setFilterSemester] = useState("");
  const [filterCollege, setFilterCollege] = useState([]);
  const [filterCourse, setFilterCourse] = useState([]);
  const [selected, setSelected] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [nameSort, setNameSort] = useState(null);
  const [sexSort, setSexSort] = useState(null);
  const [collegeSort, setCollegeSort] = useState(null);
  const [campusSort, setCampusSort] = useState(null);
  const [courseSort, setCourseSort] = useState(null);
  const [yearSort, setYearSort] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pageSizeInput, setPageSizeInput] = useState("10");
  const [confirmAction, setConfirmAction] = useState(null);
  const [searchName, setSearchName] = useState("");
  const role = useSelector((state) => state.auth.role);

  const studentsData = useMemo(
    () =>
      rawData.filter(
        (user) =>
          (user.personal_info_id?.personal?.currentStatus || "") === "Student",
      ),
    [rawData],
  );

  const students = studentsData.filter((d) => {
    const acad = d?.personal_info_id?.affiliation?.academic_information;
    return !college || acad?.college === college;
  });

  const sexOption = useMemo(
    () => [
      ...new Set(
        students
          .map((d) => d?.personal_info_id?.gadData?.sexAtBirth)
          .filter(Boolean),
      ),
    ],
    [students],
  );
    const courseOptions = useMemo(
    () => [
      ...new Set(
        students
          .map(
            (d) =>
              d?.personal_info_id?.affiliation.academic_information?.course,
          )
          .filter(Boolean),
      ),
    ],
    [students],
  );
  const collegeOptions = useMemo(
    () => [
      ...new Set(
        students
          .map(
            (d) =>
              d?.personal_info_id?.affiliation.academic_information?.college,
          )
          .filter(Boolean),
      ),
    ],
    [students],
  );
  const yearLevelOptions = useMemo(
    () => [
      ...new Set(
        students
          .map(
            (d) =>
              d?.personal_info_id?.affiliation.academic_information?.year_level,
          )
          .filter(Boolean),
      ),
    ],
    [students],
  );

  const schoolYearOptions = useMemo(
    () => [
      ...new Set(
        students.flatMap((d) =>
          Array.isArray(d?.profile_terms)
            ? d.profile_terms.map((term) => term?.school_year).filter(Boolean)
            : d?.school_year
              ? [d.school_year]
              : [],
        ),
      ),
    ],
    [students],
  );

  const semesterOptions = useMemo(
    () => [
      ...new Set(
        students.flatMap((d) =>
          Array.isArray(d?.profile_terms)
            ? d.profile_terms.map((term) => term?.semester).filter(Boolean)
            : d?.semester
              ? [d.semester]
              : [],
        ),
      ),
    ],
    [students],
  );

  const filteredData = useMemo(() => {
    let data = students.filter((user) => {
      const p = user.personal_info_id || {};
      const gad = p.gadData || {};
      const acad = p.affiliation?.academic_information || {};
      const personal = p.personal || {};
      console.log("Role", role);

      const fullName =
        `${personal.first_name || ""} ${personal.last_name || ""}`
          .trim()
          .toLowerCase();

      const matchesSearch =
        !searchName || fullName.includes(searchName.toLowerCase());
      const terms = Array.isArray(user?.profile_terms)
        ? user.profile_terms
        : [];
      const schoolYearMatches =
        !filterSchoolYear ||
        terms.some((term) => term?.school_year === filterSchoolYear) ||
        user?.school_year === filterSchoolYear;
      const semesterMatches =
        !filterSemester ||
        terms.some((term) => term?.semester === filterSemester) ||
        user?.semester === filterSemester;

      return (
        matchesSearch &&
        (!filterSex || gad.sexAtBirth === filterSex) &&
        (!filterYearLevel || acad.year_level === filterYearLevel) &&
        schoolYearMatches &&
        semesterMatches &&
        (filterCourse.length === 0 || filterCourse.includes(acad.course))
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
    if (campusSort) {
      data = [...data].sort((a, b) => {
        const acadA =
          a.personal_info_id?.affiliation?.academic_information || {};
        const acadB =
          b.personal_info_id?.affiliation?.academic_information || {};
        const campusA = (acadA.campus || "").toLowerCase();
        const campusB = (acadB.campus || "").toLowerCase();
        if (campusA < campusB) return campusSort === "asc" ? -1 : 1;
        if (campusA > campusB) return campusSort === "asc" ? 1 : -1;
        return 0;
      });
    }
    if (courseSort) {
      data = [...data].sort((a, b) => {
        const acadA =
          a.personal_info_id?.affiliation?.academic_information || {};
        const acadB =
          b.personal_info_id?.affiliation?.academic_information || {};
        const courseA = (acadA.course || "").toLowerCase();
        const courseB = (acadB.course || "").toLowerCase();
        if (courseA < courseB) return courseSort === "asc" ? -1 : 1;
        if (courseA > courseB) return courseSort === "asc" ? 1 : -1;
        return 0;
      });
    }
    if (yearSort) {
      data = [...data].sort((a, b) => {
        const acadA =
          a.personal_info_id?.affiliation?.academic_information || {};
        const acadB =
          b.personal_info_id?.affiliation?.academic_information || {};

        const parseYear = (val) => {
          if (!val) return 999;
          const match = String(val).match(/\d+/);
          return match ? parseInt(match[0], 10) : 999;
        };
        const yearA = parseYear(acadA.year_level);
        const yearB = parseYear(acadB.year_level);
        if (yearA !== 999 && yearB !== 999) {
          if (yearA < yearB) return yearSort === "asc" ? -1 : 1;
          if (yearA > yearB) return yearSort === "asc" ? 1 : -1;
          return 0;
        }

        const strA = (acadA.year_level || "").toLowerCase();
        const strB = (acadB.year_level || "").toLowerCase();
        if (strA < strB) return yearSort === "asc" ? -1 : 1;
        if (strA > strB) return yearSort === "asc" ? 1 : -1;
        return 0;
      });
    }
    return data;
  }, [
    studentsData,
    students,
    filterSex,
    filterYearLevel,
    filterSchoolYear,
    filterSemester,
    filterCollege,
    filterCourse,
    nameSort,
    sexSort,
    campusSort,
    courseSort,
    yearSort,
    searchName,
  ]);

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

  const handleToggleStatus = async (id, isActive) => {
    try {
      console.log("Toggle ID:", id);

      const res = await axios.patch(
        `/api/auth/users/toggle-status/${id}`,
        {
          action: isActive ? "deactivate" : "activate",
        },
        { withCredentials: true },
      );

      console.log("Toggle response:", res.data);
      window.location.reload();
    } catch (err) {
      console.error("Toggle error:", err.response?.data || err);
    }
  };

  const handleResetPassword = async (id) => {
    try {
      await axios.patch(
        `/api/auth/users/reset-password/${id}`,
        {},
        { withCredentials: true },
      );
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-end">
        <div className="flex">
          <StudentFilterTable
            filterSex={filterSex}
            filterYearLevel={filterYearLevel}
            filterSchoolYear={filterSchoolYear}
            filterSemester={filterSemester}
            filterCollege={filterCollege}
            filterCourse={filterCourse}
            setFilterSex={setFilterSex}
            setFilterYearLevel={setFilterYearLevel}
            setFilterSchoolYear={setFilterSchoolYear}
            setFilterSemester={setFilterSemester}
            setFilterCourse={setFilterCourse}
            sexOption={sexOption}
            yearLevelOptions={yearLevelOptions}
            schoolYearOptions={schoolYearOptions}
            semesterOptions={semesterOptions}
            collegeOptions={collegeOptions}
            courseOptions={courseOptions}
          />
        </div>
      </div>
      {role !== "dean" && (
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
          <div className="flex felex-row gap-4">
            <div>
              <input
                type="text"
                placeholder="Search by name..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="border px-3 py-2 rounded w-full max-w-sm"
              />
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
        </div>
      )}
      <div className="overflow-x-auto">
        <Table className="bg-white" striped={false} color="none">
          <TableHead className="bg-gray-200 text-black">
            <TableRow>
                  {role !== "dean" && (
              <TableHeadCell></TableHeadCell>
                  )}
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
                  setCollegeSort((prev) => (prev === "asc" ? "desc" : "asc"))
                }
              >
                College
                <span className="ml-1">
                  <span
                    className={
                      collegeSort === "asc"
                        ? "text-blue-600 font-bold"
                        : "text-gray-400"
                    }
                  >
                    ▲
                  </span>
                  <span
                    className={
                      collegeSort === "desc"
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
                  setCampusSort((prev) => (prev === "asc" ? "desc" : "asc"))
                }
              >
                Campus
                <span className="ml-1">
                  <span
                    className={
                      campusSort === "asc"
                        ? "text-blue-600 font-bold"
                        : "text-gray-400"
                    }
                  >
                    ▲
                  </span>
                  <span
                    className={
                      campusSort === "desc"
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
                  setCourseSort((prev) => (prev === "asc" ? "desc" : "asc"))
                }
              >
                Course
                <span className="ml-1">
                  <span
                    className={
                      courseSort === "asc"
                        ? "text-blue-600 font-bold"
                        : "text-gray-400"
                    }
                  >
                    ▲
                  </span>
                  <span
                    className={
                      courseSort === "desc"
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
                  setYearSort((prev) => (prev === "asc" ? "desc" : "asc"))
                }
              >
                Year Level
                <span className="ml-1">
                  <span
                    className={
                      yearSort === "asc"
                        ? "text-blue-600 font-bold"
                        : "text-gray-400"
                    }
                  >
                    ▲
                  </span>
                  <span
                    className={
                      yearSort === "desc"
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
            </TableRow>
          </TableHead>
          <TableBody className="divide-y">
            {paginatedData.map((user, index) => {
              const p = user.personal_info_id || {};
              const personal = p.personal || {};
              const gad = p.gadData || {};
              const acad = p.affiliation?.academic_information || {};
              return (
                <TableRow key={user._id || index} className="hover:bg-gray-50">
                      {role !== "dean" && (
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
                      )}
                  <TableCell>
                    {personal.first_name || ""} {personal.last_name || ""}
                  </TableCell>
                  <TableCell>
                    {gad.sexAtBirth
                      ? gad.sexAtBirth.toLowerCase() === "male"
                        ? "Male"
                        : gad.sexAtBirth.toLowerCase() === "female"
                          ? "Female"
                          : gad.sexAtBirth
                      : "—"}
                  </TableCell>
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
                  {role !== "dean" && (
                    <TableCell className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(user._id)}
                        className="px-3 py-1 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700 transition"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() =>
                          setConfirmAction({
                            type: "toggle",
                            userId: user._id,
                            isActive: user.is_active,
                          })
                        }
                        className={`px-3 py-1 text-xs rounded-md text-white transition ${
                          user.is_active
                            ? "bg-red-500 hover:bg-red-600"
                            : "bg-green-600 hover:bg-green-700"
                        }`}
                      >
                        {user.is_active ? "Deactivate" : "Activate"}
                      </button>

                      <button
                        onClick={() =>
                          setConfirmAction({
                            type: "reset",
                            userId: user._id,
                          })
                        }
                        className="px-3 py-1 text-xs rounded-md bg-yellow-500 text-white hover:bg-yellow-600 transition"
                      >
                        Reset
                      </button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
            {paginatedData.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-6">
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

      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-3">
              {confirmAction.type === "reset"
                ? "Reset Password"
                : "Change User Status"}
            </h2>

            <p className="text-sm text-gray-600 mb-6">
              {confirmAction.type === "reset"
                ? "This will reset password to default."
                : confirmAction.isActive
                  ? "This will deactivate the user."
                  : "This will activate the user."}
            </p>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 text-sm rounded bg-gray-300 hover:bg-gray-400"
              >
                Cancel
              </button>

              <button
                onClick={async () => {
                  try {
                    if (confirmAction.type === "reset") {
                      await handleResetPassword(confirmAction.userId);
                    } else {
                      await handleToggleStatus(
                        confirmAction.userId,
                        confirmAction.isActive,
                      );
                    }
                  } finally {
                    setConfirmAction(null);
                  }
                }}
                className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
