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
import useProfileList from "@/hooks/useProfileList";
import StudentFilterTable from "../components/StudentFilterTable";
import {
  FaEye,
  FaTimes,
  FaUser,
  FaVenusMars,
  FaGraduationCap,
  FaMapMarkerAlt,
  FaIdBadge,
  FaShieldAlt,
} from "react-icons/fa";

export default function StudentsUserListContent({
  users = [],
  total: propTotal = 0,
  totalPages: propTotalPages = 1,
}) {
  const [pageSize, setPageSize] = useState(50);
  const [filterSex, setFilterSex] = useState("");
  const [filterYearLevel, setFilterYearLevel] = useState("");
  const [filterSchoolYear, setFilterSchoolYear] = useState("");
  const [filterSemester, setFilterSemester] = useState("");
  const [filterCollege, setFilterCollege] = useState([]);
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
  const [confirmAction, setConfirmAction] = useState(null);
  const [searchName, setSearchName] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [activeTab, setActiveTab] = useState("personal");


  const filterValues = {
    sex: filterSex,
    yearLevel: filterYearLevel,
    colleges: filterCollege,
    schoolYear: filterSchoolYear,
    semester: filterSemester,
    searchName,
  };
  const [serverFilters, setServerFilters] = useState(filterValues);
  useEffect(() => {
    const t = setTimeout(() => setServerFilters(filterValues), 200);
    return () => clearTimeout(t);
  }, [
    filterSex,
    filterYearLevel,
    filterCollege,
    filterSchoolYear,
    filterSemester,
    searchName,
  ]);

  const {
    data: rawData,
    loading,
    page: serverPage,
    total: serverTotal,
    totalPages: serverTotalPages,
    goToPage: goToServerPage,
  } = useProfileList({
    initialData: users,
    initialTotal: propTotal,
    initialTotalPages: propTotalPages,
    type: "Student",
    limit: pageSize,
    filters: serverFilters,
  });

  const studentsData = useMemo(
    () =>
      rawData.filter(
        (user) =>
          (user.personal_info_id?.personal?.currentStatus || "") === "Student",
      ),
    [rawData],
  );

  const [filterOptions, setFilterOptions] = useState({
    sexOptions: [],
    academicCollegeOptions: [],
    yearLevelOptions: [],
    schoolYears: [],
    semesters: [],
  });
  useEffect(() => {
    let active = true;
    fetch("/api/analytics/filters")
      .then((res) => (res.ok ? res.json() : Promise.resolve({})))
      .then((data) => {
        if (!active) return;
        setFilterOptions({
          sexOptions: data.sexOptions || [],
          academicCollegeOptions: data.academicCollegeOptions || [],
          yearLevelOptions: data.yearLevelOptions || [],
          schoolYears: data.schoolYears || [],
          semesters: data.semesters || [],
        });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const sexOption = filterOptions.sexOptions;
  const collegeOptions = filterOptions.academicCollegeOptions;
  const yearLevelOptions = filterOptions.yearLevelOptions;
  const schoolYearOptions = filterOptions.schoolYears;
  const semesterOptions = filterOptions.semesters;

  const filteredData = useMemo(() => {
    let data = [...studentsData];
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
    nameSort,
    sexSort,
    campusSort,
    courseSort,
    yearSort,
  ]);

  const totalRows = filteredData.length;
  const paginatedData = filteredData;

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

  const tabs = [
    { id: "personal", label: "Personal Info" },
    { id: "academic", label: "Academic" },
    { id: "gad", label: "GAD" },
    { id: "contact", label: "Contact" },
    { id: "account", label: "Account" },
  ];

  const renderTabContent = (user) => {
    const p = user.personal_info_id || {};
    const personal = p.personal || {};
    const gad = p.gadData || {};
    const acad = p.affiliation?.academic_information || {};
    const contact = p.contact || {};

    switch (activeTab) {
      case "personal":
        return (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-semibold text-gray-600">First Name:</span>
              <p className="text-gray-900">{personal.first_name || "—"}</p>
            </div>
            <div>
              <span className="font-semibold text-gray-600">Middle Name:</span>
              <p className="text-gray-900">{personal.middle_name || "—"}</p>
            </div>
            <div>
              <span className="font-semibold text-gray-600">Last Name:</span>
              <p className="text-gray-900">{personal.last_name || "—"}</p>
            </div>
            <div>
              <span className="font-semibold text-gray-600">Date of Birth:</span>
              <p className="text-gray-900">
                {personal.birthday
                  ? new Date(personal.birthday).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "—"}
              </p>
            </div>
            <div>
              <span className="font-semibold text-gray-600">Civil Status:</span>
              <p className="text-gray-900">{personal.civil_status || "—"}</p>
            </div>
            <div>
              <span className="font-semibold text-gray-600">Nationality:</span>
              <p className="text-gray-900">{personal.nationality || "—"}</p>
            </div>
            <div>
              <span className="font-semibold text-gray-600">Religion:</span>
              <p className="text-gray-900">{personal.religion || "—"}</p>
            </div>
            <div>
              <span className="font-semibold text-gray-600">Blood Type:</span>
              <p className="text-gray-900">{personal.bloodType || "—"}</p>
            </div>
          </div>
        );
      case "academic":
        return (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-semibold text-gray-600">College:</span>
              <p className="text-gray-900">{acad.college || "—"}</p>
            </div>
            <div>
              <span className="font-semibold text-gray-600">Course:</span>
              <p className="text-gray-900">{acad.course || "—"}</p>
            </div>
            <div>
              <span className="font-semibold text-gray-600">Major:</span>
              <p className="text-gray-900">{acad.major || "—"}</p>
            </div>
            <div>
              <span className="font-semibold text-gray-600">Year Level:</span>
              <p className="text-gray-900">{acad.year_level || "—"}</p>
            </div>
            <div>
              <span className="font-semibold text-gray-600">Campus:</span>
              <p className="text-gray-900">{acad.campus || "—"}</p>
            </div>
            <div>
              <span className="font-semibold text-gray-600">Student ID:</span>
              <p className="text-gray-900">{acad.student_id || "—"}</p>
            </div>
            <div>
              <span className="font-semibold text-gray-600">Section:</span>
              <p className="text-gray-900">{acad.section || "—"}</p>
            </div>
          </div>
        );
      case "gad":
        return (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-semibold text-gray-600">Sex at Birth:</span>
              <p className="text-gray-900">
                {gad.sexAtBirth
                  ? gad.sexAtBirth.toLowerCase() === "male"
                    ? "Male"
                    : gad.sexAtBirth.toLowerCase() === "female"
                      ? "Female"
                      : gad.sexAtBirth
                  : "—"}
              </p>
            </div>
            <div>
              <span className="font-semibold text-gray-600">Gender Preference:</span>
              <p className="text-gray-900">{gad.gender_preference || "—"}</p>
            </div>
            <div>
              <span className="font-semibold text-gray-600">Indigenous Person:</span>
              <p className="text-gray-900">{gad.isIndigenousPerson ? "Yes" : "No"}</p>
            </div>
            <div>
              <span className="font-semibold text-gray-600">PWD:</span>
              <p className="text-gray-900">{gad.isPWD ? "Yes" : "No"}</p>
            </div>
            <div>
              <span className="font-semibold text-gray-600">PWD Type:</span>
              <p className="text-gray-900">{gad.pwd_type || "—"}</p>
            </div>
            <div>
              <span className="font-semibold text-gray-600">Socio-Economic Status:</span>
              <p className="text-gray-900">{gad.socioEconomicStatus || "—"}</p>
            </div>
            <div>
              <span className="font-semibold text-gray-600">Head of Household:</span>
              <p className="text-gray-900">{gad.headOfHousehold || "—"}</p>
            </div>
          </div>
        );
      case "contact":
        return (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-semibold text-gray-600">Email:</span>
              <p className="text-gray-900">{contact.email || user.email || "—"}</p>
            </div>
 
            <div>
              <span className="font-semibold text-gray-600">Mobile:</span>
              <p className="text-gray-900">{contact.mobileNumber || "—"}</p>
            </div>

            <div className="col-span-2">
              <span className="font-semibold text-gray-600">Current Address:</span>
              <p className="text-gray-900">
                {contact.currentAddress
                  ? [
                      contact.currentAddress.barangay?.name,
                      contact.currentAddress.city?.name,
                      contact.currentAddress.province?.name,
                    ]
                      .filter(Boolean)
                      .join(", ") || "—"
                  : "—"}
              </p>
            </div>
            <div className="col-span-2">
              <span className="font-semibold text-gray-600">Permanent Address:</span>
              <p className="text-gray-900">
                {contact.permanentAddress
                  ? [
                      contact.permanentAddress.barangay?.name,
                      contact.permanentAddress.city?.name,
                      contact.permanentAddress.province?.name,
                    ]
                      .filter(Boolean)
                      .join(", ") || "—"
                  : "—"}
              </p>
            </div>
          </div>
        );
      case "account":
        return (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-semibold text-gray-600">Username:</span>
              <p className="text-gray-900">{user.username || "—"}</p>
            </div>
            <div>
              <span className="font-semibold text-gray-600">Email:</span>
              <p className="text-gray-900">{user.email || "—"}</p>
            </div>
            <div>
              <span className="font-semibold text-gray-600">Role:</span>
              <p className="text-gray-900">{user.role || "—"}</p>
            </div>
            <div>
              <span className="font-semibold text-gray-600">Status:</span>
              <p className={`font-medium ${user.is_active ? "text-green-600" : "text-red-600"}`}>
                {user.is_active ? "Active" : "Inactive"}
              </p>
            </div>
            <div>
              <span className="font-semibold text-gray-600">Created At:</span>
              <p className="text-gray-900">
                {user.createdAt
                  ? new Date(user.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "—"}
              </p>
            </div>
            <div>
              <span className="font-semibold text-gray-600">Last Updated:</span>
              <p className="text-gray-900">
                {user.updatedAt
                  ? new Date(user.updatedAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "—"}
              </p>
            </div>
          </div>
        );
      default:
        return null;
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
            setFilterSex={setFilterSex}
            setFilterYearLevel={setFilterYearLevel}
            setFilterSchoolYear={setFilterSchoolYear}
            setFilterSemester={setFilterSemester}
            setFilterCollege={setFilterCollege}
            sexOption={sexOption}
            yearLevelOptions={yearLevelOptions}
            schoolYearOptions={schoolYearOptions}
            semesterOptions={semesterOptions}
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
      <div className="overflow-x-auto">
        <Table className="bg-white" striped={false} color="none">
          <TableHead className="bg-gray-200 text-black">
            <TableRow>
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
                  <TableCell className="text-black text-xs">
                    {personal.first_name || ""} {personal.last_name || ""}
                  </TableCell>
                  <TableCell className="text-black text-xs">
                    {gad.sexAtBirth
                      ? gad.sexAtBirth.toLowerCase() === "male"
                        ? "Male"
                        : gad.sexAtBirth.toLowerCase() === "female"
                          ? "Female"
                          : gad.sexAtBirth
                      : "—"}
                  </TableCell>
                  <TableCell className="text-black text-xs">
                    {acad.college || "—"}
                  </TableCell>
                  <TableCell className="text-black text-xs">
                    {acad.campus || "—"}
                  </TableCell>
                  <TableCell className="text-black text-xs">
                    {acad.course || "—"}
                  </TableCell>
                  <TableCell className="text-black text-xs">
                    {acad.year_level || "—"}
                  </TableCell>
                  <TableCell className="text-black text-xs">
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
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setActiveTab("personal");
                      }}
                      className="px-3 py-1 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700 transition"
                    >
                      View
                    </button>
                  </TableCell>
                </TableRow>
              );
            })}
            {paginatedData.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-6">
                  No users found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mt-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(parseInt(e.target.value, 10))}
            className="h-9 rounded-lg border border-gray-200 bg-white px-2 text-xs"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
        <span className="text-sm text-gray-600">
          {loading ? "Loading..." : `${serverTotal} total students`}
        </span>
        <div className="flex items-center gap-2">
          <button
            className="px-2 py-1 border rounded disabled:opacity-50"
            onClick={() => goToServerPage(serverPage - 1)}
            disabled={serverPage <= 1 || loading}
          >
            Prev
          </button>
          <span>
            Page {serverPage} of {serverTotalPages}
          </span>
          <button
            className="px-2 py-1 border rounded disabled:opacity-50"
            onClick={() => goToServerPage(serverPage + 1)}
            disabled={serverPage >= serverTotalPages || loading}
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

      {selectedUser && (() => {
        const p = selectedUser.personal_info_id || {};
        const personal = p.personal || {};
        const acad = p.affiliation?.academic_information || {};

        const viewTabs = [
          { id: "personal", label: "Personal Info", icon: FaUser },
          { id: "academic", label: "Academic", icon: FaGraduationCap },
          { id: "gad", label: "GAD Data", icon: FaVenusMars },
          { id: "contact", label: "Contact", icon: FaMapMarkerAlt },
          { id: "account", label: "Account", icon: FaShieldAlt },
        ];

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto mx-4">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10 rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                    {(personal.first_name?.[0] || "").toUpperCase()}
                    {(personal.last_name?.[0] || "").toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {personal.first_name || ""}{" "}
                      {personal.middle_name ? `${personal.middle_name[0]}. ` : ""}
                      {personal.last_name || ""}
                    </h2>
                    <p className="text-xs text-gray-500">
                      {acad.college || ""}
                      {acad.course ? ` • ${acad.course}` : ""}
                      {acad.year_level ? ` • ${acad.year_level}` : ""}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedUser(null);
                    setActiveTab("personal");
                  }}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 transition"
                >
                  <FaTimes size={14} />
                </button>
              </div>

        
              <div className="px-6 border-b border-gray-100">
                <div className="flex gap-1 -mb-px">
                  {viewTabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
                          activeTab === tab.id
                            ? "border-blue-600 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        <Icon size={14} />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

             
              <div className="px-6 py-5">
                {renderTabContent(selectedUser)}
              </div>

    
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-2.5">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                    selectedUser.is_active
                      ? "bg-green-50 text-green-700 ring-1 ring-green-600/20"
                      : "bg-red-50 text-red-700 ring-1 ring-red-600/20"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      selectedUser.is_active ? "bg-green-500" : "bg-red-500"
                    }`} />
                    {selectedUser.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedUser(null);
                      setConfirmAction({
                        type: "toggle",
                        userId: selectedUser._id,
                        isActive: selectedUser.is_active,
                      });
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                      selectedUser.is_active
                        ? "bg-red-50 text-red-700 ring-1 ring-red-600/20 hover:bg-red-100"
                        : "bg-green-50 text-green-700 ring-1 ring-green-600/20 hover:bg-green-100"
                    }`}
                  >
                    {selectedUser.is_active ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedUser(null);
                      setConfirmAction({
                        type: "reset",
                        userId: selectedUser._id,
                      });
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-50 text-amber-700 ring-1 ring-amber-600/20 hover:bg-amber-100 transition"
                  >
                    Reset Password
                  </button>
                  <button
                    onClick={() => {
                      setSelectedUser(null);
                      setActiveTab("personal");
                    }}
                    className="px-4 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}