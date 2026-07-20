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
import {
  FaEye,
  FaTimes,
  FaUser,
  FaIdCard,
  FaVenusMars,
  FaGraduationCap,
  FaMapMarkerAlt,
} from "react-icons/fa";

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
  const [viewModalUser, setViewModalUser] = useState(null);
  const [viewTab, setViewTab] = useState("personal");
  const [generating, setGenerating] = useState(false);
  const [reportStatus, setReportStatus] = useState("");
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
      const res = await axios.patch(
        `/api/auth/users/toggle-status/${id}`,
        {
          action: isActive ? "deactivate" : "activate",
        },
        { withCredentials: true },
      );
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

  const handleEdit = (id) => {
    // Edit handler placeholder
  };

  const normalizeStr = (s) => (s || "").toString().trim().toLowerCase();

  // Builds the student-only sex-disaggregated report data.
  // NOTE: only exact "Male" / "Female" matches are counted into their bucket.
  // Any record with missing/blank/unexpected sexAtBirth is left out of the
  // Male/Female split (it is no longer silently counted as Female), but is
  // still included in the overall total below.
  const buildReportData = () => {
    const courseYearMap = {};
    let studentMaleTotal = 0;
    let studentFemaleTotal = 0;
    let studentGrandTotal = 0;

    students.forEach((u) => {
      const acad = u.personal_info_id?.affiliation?.academic_information || {};
      const course = acad.course || "Unspecified";
      const yearLevel = acad.year_level || "Unspecified";
      const sex = u.personal_info_id?.gadData?.sexAtBirth || "";

      if (!courseYearMap[course]) courseYearMap[course] = {};
      if (!courseYearMap[course][yearLevel])
        courseYearMap[course][yearLevel] = { Male: 0, Female: 0, Total: 0 };

      if (sex === "Male") {
        courseYearMap[course][yearLevel].Male += 1;
        studentMaleTotal += 1;
      } else if (sex === "Female") {
        courseYearMap[course][yearLevel].Female += 1;
        studentFemaleTotal += 1;
      }

      // every student counts toward the total, regardless of sex data
      courseYearMap[course][yearLevel].Total += 1;
      studentGrandTotal += 1;
    });

    return {
      courseYearMap,
      studentTotals: {
        Male: studentMaleTotal,
        Female: studentFemaleTotal,
        Total: studentGrandTotal,
      },
    };
  };

  const wrapText = (doc, text, x, y, maxWidth, lineHeight) => {
    const lines = doc.splitTextToSize(text, maxWidth);
    lines.forEach((line) => {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, x, y);
      y += lineHeight;
    });
    return y;
  };

  const generatePDF = async () => {
    setGenerating(true);
    setReportStatus("");
    try {
      const jsPDF = (await import("jspdf")).default;
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF();

      const report = buildReportData();
      const collegeLabel = college || "College of Information and Computing Sciences";
      const yearLabel = filterSchoolYear || "AY 2024-2025";
      const semLabel = filterSemester || "2nd Semester";
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 14;
      const maxTextWidth = pageWidth - margin * 2;

      let y = 20;
      doc.setFontSize(14);
      doc.text("College of Information and Computing Sciences (CICS)", margin, y);
      y += 7;
      doc.setFontSize(12);
      doc.text("Sex-disaggregated Data (Students)", margin, y);
      y += 7;
      doc.setFontSize(10);
      doc.text(`${semLabel} ${yearLabel}`, margin, y);
      y += 10;

      // ===== SECTION 1: STUDENT ENROLLMENT BY PROGRAM =====
      doc.setFontSize(11);
      doc.text("1. Student Enrollment by Program", margin, y);
      y += 8;

      const yearOrder = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
      const courses = Object.keys(report.courseYearMap).sort();

      courses.forEach((course) => {
        const yearMap = report.courseYearMap[course];
        const rows = [];
        let courseMale = 0;
        let courseFemale = 0;
        let courseTotal = 0;

        yearOrder.forEach((yr) => {
          if (yearMap[yr]) {
            const m = yearMap[yr].Male || 0;
            const f = yearMap[yr].Female || 0;
            const t = yearMap[yr].Total || m + f;
            rows.push([yr, m, f, t]);
            courseMale += m;
            courseFemale += f;
            courseTotal += t;
          }
        });
        Object.entries(yearMap).forEach(([yr, counts]) => {
          if (!yearOrder.includes(yr)) {
            const m = counts.Male || 0;
            const f = counts.Female || 0;
            const t = counts.Total || m + f;
            rows.push([yr, m, f, t]);
            courseMale += m;
            courseFemale += f;
            courseTotal += t;
          }
        });

        if (y > 240) { doc.addPage(); y = 20; }

        const courseLabel = `Student Enrollment in the ${course} Program`;
        doc.setFontSize(10);
        doc.setFont(undefined, "normal");
        doc.text(courseLabel, margin, y);
        y += 6;

        const tableRows = rows.length ? [...rows] : [["No data", 0, 0, 0]];
        tableRows.push(["TOTAL", courseMale, courseFemale, courseTotal]);

        autoTable(doc, {
          startY: y,
          head: [["Year Level", "Male", "Female", "Total"]],
          body: tableRows,
          styles: { fontSize: 9, halign: "center" },
          headStyles: { fillColor: [33, 150, 243], halign: "center" },
          columnStyles: { 0: { halign: "left" } },
        });
        y = doc.lastAutoTable.finalY + 6;

        // Course interpretation
        doc.setFontSize(9);
        doc.setFont(undefined, "italic");
        y = wrapText(doc, `Interpretation:`, margin, y, maxTextWidth, 5);
        doc.setFont(undefined, "normal");

        const malePct = courseTotal > 0 ? Math.round((courseMale / courseTotal) * 100) : 0;
        const femalePct = courseTotal > 0 ? Math.round((courseFemale / courseTotal) * 100) : 0;
        const firstYr = yearMap["1st Year"] || { Male: 0, Female: 0, Total: 0 };
        const firstYrTotal = firstYr.Total || firstYr.Male + firstYr.Female;
        const fourthYr = yearMap["4th Year"] || { Male: 0, Female: 0, Total: 0 };
        const fourthYrTotal = fourthYr.Total || fourthYr.Male + fourthYr.Female;
        const secondYr = yearMap["2nd Year"] || { Male: 0, Female: 0, Total: 0 };
        const secondYrTotal = secondYr.Total || secondYr.Male + secondYr.Female;

        y = wrapText(doc, `The total student population in the ${course} program is ${courseTotal} students, with ${courseMale} males (${malePct}%) and ${courseFemale} females (${femalePct}%).`, margin, y, maxTextWidth, 4.5);

        if (malePct > femalePct) {
          y = wrapText(doc, `Gender Distribution: The ${course} program remains male-dominated, with males consistently outnumbering females in all year levels.`, margin, y, maxTextWidth, 4.5);
        } else if (femalePct > malePct) {
          y = wrapText(doc, `Gender Distribution: Females outnumber males in this course.`, margin, y, maxTextWidth, 4.5);
        } else {
          y = wrapText(doc, `Gender Distribution: Male and female enrollment is evenly split in this course.`, margin, y, maxTextWidth, 4.5);
        }

        y = wrapText(doc, `The highest enrollment is in 1st Year (${firstYrTotal} students), but the numbers drop as the year level increases (only ${fourthYrTotal} students remain in 4th Year).`, margin, y, maxTextWidth, 4.5);

        if (firstYrTotal > 0 && secondYrTotal < firstYrTotal) {
          const dropPct = Math.round(((firstYrTotal - secondYrTotal) / firstYrTotal) * 100);
          y = wrapText(doc, `Drop in 2nd Year: There is a decrease in enrollment from 1st to 2nd year (from ${firstYrTotal} to ${secondYrTotal} students, a ${dropPct}% drop).`, margin, y, maxTextWidth, 4.5);
          y = wrapText(doc, `This may suggest: Academic challenges or course shifting, financial constraints affecting retention, and students transferring to other institutions.`, margin, y, maxTextWidth, 4.5);
        }

        y += 6;
      });

      // ===== SECTION 2: OVERALL STUDENT SUMMARY =====
      if (y > 240) { doc.addPage(); y = 20; }
      doc.setFontSize(11);
      doc.setFont(undefined, "normal");
      doc.text("2. Overall Student Summary", margin, y);
      y += 8;

      autoTable(doc, {
        startY: y,
        head: [["Category", "Male", "Female", "Total"]],
        body: [
          [
            "Students",
            report.studentTotals.Male,
            report.studentTotals.Female,
            report.studentTotals.Total,
          ],
        ],
        styles: { fontSize: 9, halign: "center" },
        headStyles: { fillColor: [33, 150, 243], halign: "center" },
        columnStyles: { 0: { halign: "left" } },
      });

      doc.save(`cics-sex-disaggregated-report-${filterSchoolYear || "all"}-${filterSemester || "all"}.pdf`);
      setReportStatus("PDF report downloaded successfully!");
    } catch (err) {
      console.error("PDF generation failed:", err);
      setReportStatus("Could not generate the report.");
    } finally {
      setGenerating(false);
    }
  };

  const renderViewModal = () => {
    if (!viewModalUser) return null;
    const p = viewModalUser.personal_info_id || {};
    const personal = p.personal || {};
    const gad = p.gadData || {};
    const contact = p.contact || {};
    const acad = p.affiliation?.academic_information || {};
    const currentAddr = p.contact?.currentAddress || {};
    const permanentAddr = p.contact?.permanentAddress || {};

    const tabs = [
      { id: "personal", label: "Personal Info", icon: FaUser },
      { id: "academic", label: "Academic Info", icon: FaGraduationCap },
      { id: "gad", label: "GAD Data", icon: FaVenusMars },
      { id: "contact", label: "Contact Info", icon: FaMapMarkerAlt },
    ];

    const renderPersonalTab = () => (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {[
          { label: "First Name", value: personal.first_name },
          { label: "Middle Name", value: personal.middle_name },
          { label: "Last Name", value: personal.last_name },
          { label: "Civil Status", value: personal.civil_status },
          { label: "Religion", value: personal.religion },
          { label: "Nationality", value: personal.nationality },
          { label: "Current Status", value: personal.currentStatus },
          {
            label: "Birthday",
            value: personal.birthday
              ? new Date(personal.birthday).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              : null,
          },
          { label: "Blood Type", value: personal.bloodType },
        ].map((field) => (
          <div key={field.label}>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
              {field.label}
            </label>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {field.value || "—"}
            </p>
          </div>
        ))}
      </div>
    );

    const renderContactTab = () => (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div >
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
              Email
            </label>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {contact.email || "—"}
            </p>
          </div>
          <div >
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
              Mobile Number
            </label>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {contact.mobileNumber || "—"}
            </p>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            Permanent Address
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { label: "Region", value: permanentAddr.region?.name },
              { label: "Province", value: permanentAddr.province?.name },
              { label: "City/Municipality", value: permanentAddr.city?.name },
              { label: "Barangay", value: permanentAddr.barangay?.name },
            ].map((field) => (
              <div key={field.label} >
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {field.label}
                </label>
                <p className="mt-1 text-sm font-medium text-gray-900">
                  {field.value || "—"}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            Current Address
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { label: "Region", value: currentAddr.region?.name },
              { label: "Province", value: currentAddr.province?.name },
              { label: "City/Municipality", value: currentAddr.city?.name },
              { label: "Barangay", value: currentAddr.barangay?.name },
            ].map((field) => (
              <div key={field.label} >
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {field.label}
                </label>
                <p className="mt-1 text-sm font-medium text-gray-900">
                  {field.value || "—"}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );

    const renderGadTab = () => (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {[
          { label: "Sex at Birth", value: gad.sexAtBirth },
          { label: "Gender Preference", value: gad.gender_preference },
          { label: "Socio-economic Status", value: gad.socioEconomicStatus },
          {
            label: "Person with Disability",
            value:
              gad.isPWD === true
                ? `Yes${gad.pwd_type ? ` (${gad.pwd_type})` : ""}`
                : gad.isPWD === false
                  ? "No"
                  : null,
          },
          {
            label: "Indigenous Person",
            value:
              gad.isIndigenousPerson === true
                ? "Yes"
                : gad.isIndigenousPerson === false
                  ? "No"
                  : null,
          },
          { label: "Head of Household", value: gad.headOfHousehold },
        ].map((field) => (
          <div key={field.label} >
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
              {field.label}
            </label>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {field.value || "—"}
            </p>
          </div>
        ))}
      </div>
    );

    const renderAcademicTab = () => (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {[
          { label: "Student ID", value: acad.student_id },
          { label: "Campus", value: acad.campus },
          { label: "College", value: acad.college },
          { label: "Course", value: acad.course },
          { label: "Year Level", value: acad.year_level },
          { label: "Scholarship Status", value: acad.isScholar },
        ].map((field) => (
          <div key={field.label}>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
              {field.label}
            </label>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {field.value || "—"}
            </p>
          </div>
        ))}
      </div>
    );

    const tabContent = {
      personal: renderPersonalTab(),
      academic: renderAcademicTab(),
      gad: renderGadTab(),
      contact: renderContactTab(),
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-xs">
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
                setViewModalUser(null);
                setViewTab("personal");
              }}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 transition"
            >
              <FaTimes size={14} />
            </button>
          </div>

          {/* Tabs */}
          <div className="px-6 border-b border-gray-100">
            <div className="flex gap-1 -mb-px">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setViewTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
                      viewTab === tab.id
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


          <div className="px-6 py-5">{tabContent[viewTab]}</div>

  
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
            <button
              onClick={() => {
                setViewModalUser(null);
                setViewTab("personal");
              }}
              className="px-5 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
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
      <div className="flex items-center justify-between mb-3 p-3 bg-white border border-gray-200 rounded-lg">
        <div>
          <p className="text-sm font-medium text-black">
            Generate Sex-Disaggregated Data Report (Students)
          </p>
          <p className="text-xs text-black">
            {college ? `College: ${college}` : "All colleges/offices"}
            {filterSchoolYear ? ` | School Year: ${filterSchoolYear}` : ""}
            {filterSemester ? ` | Semester: ${filterSemester}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {reportStatus && (
            <span className={`text-xs font-medium ${reportStatus.includes("successfully") ? "text-green-600" : "text-red-600"}`}>
              {reportStatus}
            </span>
          )}
          <button
            onClick={generatePDF}
            disabled={generating}
            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition shadow-sm"
          >
            <svg className={`w-4 h-4 mr-2 ${generating ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {generating ? "Generating..." : "Download PDF Report"}
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table className="bg-white" striped={false} color="none">
          <TableHead className="bg-gray-200 text-black">
            <TableRow>
              {role !== "dean" && <TableHeadCell></TableHeadCell>}
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
              <TableHeadCell className="text-center">Action</TableHeadCell>
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
                  <TableCell className="text-black text-xs">{acad.college || "—"}</TableCell>
                  <TableCell className="text-black text-xs">{acad.campus || "—"}</TableCell>
                  <TableCell className="text-black text-xs">{acad.course || "—"}</TableCell>
                  <TableCell className="text-black text-xs">{acad.year_level || "—"}</TableCell>
                  <TableCell className="text-center">
                    <button
                      onClick={() => setViewModalUser(user)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300 transition shadow-sm"
                    >
                      <FaEye size={12} />
                      View
                    </button>
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

      {renderViewModal()}
    </div>
  );
}