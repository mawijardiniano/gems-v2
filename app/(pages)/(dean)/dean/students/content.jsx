"use client";

import { useState, useMemo, useEffect } from "react";

import axios from "axios";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
} from "flowbite-react";
import useFetchData from "@/hooks/useSample";
import StudentFilterTable from "./components/StudentFilterTable";
import { useSelector } from "react-redux";
import {
  FaEye,
  FaTimes,
  FaUser,
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
    () =>
      [
        ...new Set(
          students.flatMap((d) =>
            Array.isArray(d?.profile_terms)
              ? d.profile_terms.map((term) => term?.school_year).filter(Boolean)
              : d?.school_year
                ? [d.school_year]
                : [],
          ),
        ),
      ].sort((a, b) => String(b).localeCompare(String(a))),
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

  useEffect(() => {
    if (schoolYearOptions.length > 0 && !filterSchoolYear) {
      setFilterSchoolYear(schoolYearOptions[0]);
    }
  }, [schoolYearOptions, filterSchoolYear]);

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
        terms.some((term) => {
          const yearOk = !filterSchoolYear || term?.school_year === filterSchoolYear;
          return yearOk && term?.semester === filterSemester;
        }) ||
        (!filterSchoolYear && user?.semester === filterSemester);
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

  const handleEdit = (id) => {};

  const normalizeStr = (s) => (s || "").toString().trim().toLowerCase();

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

  const generatePDF = () => {
    setGenerating(true);
    setReportStatus("");
    try {
      const report = buildReportData();
      const collegeLabel =
        college || "College of Information and Computing Sciences (CICS)";
      const yearLabel = filterSchoolYear || "AY 2024-2025";
      const semLabel = filterSemester || "2nd Semester";
      const yearOrder = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
      const courses = Object.keys(report.courseYearMap).sort();

      const buildCourseSection = (course) => {
        const yearMap = report.courseYearMap[course];
        let courseMale = 0;
        let courseFemale = 0;
        let courseTotal = 0;
        let bodyRows = "";

        yearOrder.forEach((yr) => {
          if (yearMap[yr]) {
            const m = yearMap[yr].Male || 0;
            const f = yearMap[yr].Female || 0;
            const t = yearMap[yr].Total || m + f;
            bodyRows += `<tr><td style="text-align:left">${yr}</td><td>${m}</td><td>${f}</td><td>${t}</td></tr>`;
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
            bodyRows += `<tr><td style="text-align:left">${yr}</td><td>${m}</td><td>${f}</td><td>${t}</td></tr>`;
            courseMale += m;
            courseFemale += f;
            courseTotal += t;
          }
        });

        bodyRows += `<tr class="total-row"><td style="text-align:left">TOTAL</td><td>${courseMale}</td><td>${courseFemale}</td><td>${courseTotal}</td></tr>`;

        const malePct =
          courseTotal > 0 ? Math.round((courseMale / courseTotal) * 100) : 0;
        const femalePct =
          courseTotal > 0 ? Math.round((courseFemale / courseTotal) * 100) : 0;
        const firstYr = yearMap["1st Year"] || { Male: 0, Female: 0, Total: 0 };
        const firstYrTotal = firstYr.Total || firstYr.Male + firstYr.Female;
        const fourthYr = yearMap["4th Year"] || {
          Male: 0,
          Female: 0,
          Total: 0,
        };
        const fourthYrTotal = fourthYr.Total || fourthYr.Male + fourthYr.Female;
        const secondYr = yearMap["2nd Year"] || {
          Male: 0,
          Female: 0,
          Total: 0,
        };
        const secondYrTotal = secondYr.Total || secondYr.Male + secondYr.Female;

        let genderStatement = "";
        if (malePct > femalePct) {
          genderStatement = `Gender Distribution: The ${course} program remains male-dominated, with males consistently outnumbering females in all year levels.`;
        } else if (femalePct > malePct) {
          genderStatement = `Gender Distribution: Females outnumber males in this course.`;
        } else {
          genderStatement = `Gender Distribution: Male and female enrollment is evenly split in this course.`;
        }

        let dropStatement = "";
        if (firstYrTotal > 0 && secondYrTotal < firstYrTotal) {
          const dropPct = Math.round(
            ((firstYrTotal - secondYrTotal) / firstYrTotal) * 100,
          );
          dropStatement = `
            <p><strong>Drop in 2nd Year:</strong> There is a decrease in enrollment from 1st to 2nd year (from ${firstYrTotal} to ${secondYrTotal} students, a ${dropPct}% drop).</p>
            <p>This may suggest: Academic challenges or course shifting, financial constraints affecting retention, and students transferring to other institutions.</p>
          `;
        }

        return `
          <h3>Student Enrollment in the ${course} Program</h3>
          <table>
            <thead><tr><th style="text-align:left">Year Level</th><th>Male</th><th>Female</th><th>Total</th></tr></thead>
            <tbody>${bodyRows}</tbody>
          </table>
          <div class="interpretation">
            <p><strong>Interpretation:</strong></p>
            <p>The total student population in the ${course} program is ${courseTotal} students, with ${courseMale} males (${malePct}%) and ${courseFemale} females (${femalePct}%).</p>
            <p>${genderStatement}</p>
            <p>The highest enrollment is in 1st Year (${firstYrTotal} students), but the numbers drop as the year level increases (only ${fourthYrTotal} students remain in 4th Year).</p>
            ${dropStatement}
          </div>
        `;
      };

      let courseSections = "";
      courses.forEach((course) => {
        courseSections += buildCourseSection(course);
      });

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>CICS Sex-Disaggregated Data Report - Students</title>
          <style>
            @page { margin: 15mm; }
            body { font-family: 'Segoe UI', Arial, sans-serif; color: #000; line-height: 1.5; font-size: 11pt; }
            .report-container { max-width: 1100px; margin: 0 auto; padding: 10px; }
            h1 { font-size: 14pt; color: #000; margin-bottom: 4px; text-align: center; }
            .subtitle { text-align: center; font-size: 11pt; color: #000; margin-bottom: 20px; }
            h2 { font-size: 12pt; color: #000; margin-top: 24px; margin-bottom: 8px; border-bottom: 2px solid #1a237e; padding-bottom: 4px; }
            h3 { font-size: 11pt; color: #000; margin-top: 18px; margin-bottom: 6px; }
            table { width: 100%; border-collapse: collapse; margin: 8px 0 12px 0; }
            th { background-color: #1565c0; color: #000; padding: 6px 8px; text-align: center; font-weight: 600; font-size: 10pt; }
            td { padding: 5px 8px; text-align: center; border: 1px solid #b0bec5; font-size: 10pt; color: #000; }
            tr:nth-child(even) { background-color: #f5f5f5; }
            .total-row { background-color: #e3f2fd !important; font-weight: bold; }
            .interpretation { margin-top: 6px; padding: 8px 10px; background: #f5f5f5; border-left: 4px solid #1565c0; border-radius: 4px; }
            .interpretation p { margin: 3px 0; font-size: 10pt; color: #000; }
            .interpretation strong { color: #000; }
            .summary-section { margin-top: 24px; }
            .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #ccc; font-size: 9pt; color: #000; text-align: center; }
            .college-label { color: #000; }
          </style>
        </head>
        <body>
          <div class="report-container">
            <h1 class="college-label">${collegeLabel}</h1>
            <h1 style="font-size:12pt;margin-top:0">Sex-Disaggregated Data (Students)</h1>
            <div class="subtitle">${semLabel} ${yearLabel}</div>

            <h2>1. Student Enrollment by Program</h2>
            ${courseSections}

            <h2 class="summary-section">2. Overall Student Summary</h2>
            <table>
              <thead><tr><th style="text-align:left">Category</th><th>Male</th><th>Female</th><th>Total</th></tr></thead>
              <tbody>
                <tr>
                  <td style="text-align:left">Students</td>
                  <td>${report.studentTotals.Male}</td>
                  <td>${report.studentTotals.Female}</td>
                  <td>${report.studentTotals.Total}</td>
                </tr>
              </tbody>
            </table>

            <div class="footer">
              Generated on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} |
              College of Information and Computing Sciences
            </div>
          </div>
        </body>
        </html>
      `;

      const iframe = document.createElement("iframe");
      Object.assign(iframe.style, {
        position: "fixed",
        right: "0",
        bottom: "0",
        width: "0",
        height: "0",
        border: "0",
      });
      document.body.appendChild(iframe);
      const frameDoc = iframe.contentWindow?.document;
      if (!frameDoc) return;
      frameDoc.open();
      frameDoc.write(html);
      frameDoc.close();
      iframe.onload = () => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      };
      setReportStatus(
        "Print dialog opened. Save as PDF using the Print dialog.",
      );
    } catch (err) {
      console.error("HTML report generation failed:", err);
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
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
              Email
            </label>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {contact.email || "—"}
            </p>
          </div>
          <div>
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
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-gray-500">
          <span className="font-medium text-gray-700">{totalRows}</span> student
          {totalRows !== 1 ? "s" : ""}
        </div>
        <div className="relative w-full max-w-xs">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search by name..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder-gray-400 bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
          />
        </div>
      </div>
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
          <button
            onClick={generatePDF}
            disabled={generating}
            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition shadow-sm"
          >
            <svg
              className={`w-4 h-4 mr-2 ${generating ? "animate-spin" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            {generating ? "Generating..." : "Download PDF Report"}
          </button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <Table className="bg-white" striped={false} color="none">
          <TableHead className="bg-white text-gray-500 border-b border-gray-200">
            <TableRow>
              <TableHeadCell
                className="cursor-pointer select-none px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                onClick={() =>
                  setNameSort((prev) => (prev === "asc" ? "desc" : "asc"))
                }
              >
                Name
                <span className="ml-1.5 text-[10px]">
                  <span
                    className={
                      nameSort === "asc" ? "text-blue-600" : "text-gray-300"
                    }
                  >
                    ▲
                  </span>
                  <span
                    className={
                      nameSort === "desc" ? "text-blue-600" : "text-gray-300"
                    }
                  >
                    ▼
                  </span>
                </span>
              </TableHeadCell>
              <TableHeadCell
                className="cursor-pointer select-none px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                onClick={() =>
                  setSexSort((prev) => (prev === "asc" ? "desc" : "asc"))
                }
              >
                Sex
                <span className="ml-1.5 text-[10px]">
                  <span
                    className={
                      sexSort === "asc" ? "text-blue-600" : "text-gray-300"
                    }
                  >
                    ▲
                  </span>
                  <span
                    className={
                      sexSort === "desc" ? "text-blue-600" : "text-gray-300"
                    }
                  >
                    ▼
                  </span>
                </span>
              </TableHeadCell>
              <TableHeadCell
                className="cursor-pointer select-none px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                onClick={() =>
                  setCollegeSort((prev) => (prev === "asc" ? "desc" : "asc"))
                }
              >
                College
                <span className="ml-1.5 text-[10px]">
                  <span
                    className={
                      collegeSort === "asc" ? "text-blue-600" : "text-gray-300"
                    }
                  >
                    ▲
                  </span>
                  <span
                    className={
                      collegeSort === "desc" ? "text-blue-600" : "text-gray-300"
                    }
                  >
                    ▼
                  </span>
                </span>
              </TableHeadCell>
              <TableHeadCell
                className="cursor-pointer select-none px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                onClick={() =>
                  setCampusSort((prev) => (prev === "asc" ? "desc" : "asc"))
                }
              >
                Campus
                <span className="ml-1.5 text-[10px]">
                  <span
                    className={
                      campusSort === "asc" ? "text-blue-600" : "text-gray-300"
                    }
                  >
                    ▲
                  </span>
                  <span
                    className={
                      campusSort === "desc" ? "text-blue-600" : "text-gray-300"
                    }
                  >
                    ▼
                  </span>
                </span>
              </TableHeadCell>
              <TableHeadCell
                className="cursor-pointer select-none px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                onClick={() =>
                  setCourseSort((prev) => (prev === "asc" ? "desc" : "asc"))
                }
              >
                Course
                <span className="ml-1.5 text-[10px]">
                  <span
                    className={
                      courseSort === "asc" ? "text-blue-600" : "text-gray-300"
                    }
                  >
                    ▲
                  </span>
                  <span
                    className={
                      courseSort === "desc" ? "text-blue-600" : "text-gray-300"
                    }
                  >
                    ▼
                  </span>
                </span>
              </TableHeadCell>
              <TableHeadCell
                className="cursor-pointer select-none px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                onClick={() =>
                  setYearSort((prev) => (prev === "asc" ? "desc" : "asc"))
                }
              >
                Year Level
                <span className="ml-1.5 text-[10px]">
                  <span
                    className={
                      yearSort === "asc" ? "text-blue-600" : "text-gray-300"
                    }
                  >
                    ▲
                  </span>
                  <span
                    className={
                      yearSort === "desc" ? "text-blue-600" : "text-gray-300"
                    }
                  >
                    ▼
                  </span>
                </span>
              </TableHeadCell>
              <TableHeadCell className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-center">
                Action
              </TableHeadCell>
              {role !== "dean" && (
                <TableHeadCell className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-center">
                  Manage
                </TableHeadCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody className="divide-y divide-gray-100">
            {paginatedData.map((user, index) => {
              const p = user.personal_info_id || {};
              const personal = p.personal || {};
              const gad = p.gadData || {};
              const acad = p.affiliation?.academic_information || {};
              return (
                <TableRow
                  key={user._id || index}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <TableCell className="px-4 py-3 text-sm text-gray-800">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center text-xs font-semibold text-blue-600 shrink-0">
                        {(personal.first_name?.[0] || "?").toUpperCase()}
                        {(personal.last_name?.[0] || "").toUpperCase()}
                      </div>
                      <span>
                        {personal.first_name || ""} {personal.last_name || ""}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-600">
                    {gad.sexAtBirth
                      ? gad.sexAtBirth.toLowerCase() === "male"
                        ? "Male"
                        : gad.sexAtBirth.toLowerCase() === "female"
                          ? "Female"
                          : gad.sexAtBirth
                      : "—"}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-600 max-w-[160px] truncate">
                    {acad.college || "—"}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-600">
                    {acad.campus || "—"}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-600 max-w-[180px] truncate">
                    {acad.course || "—"}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-600">
                    {acad.year_level || "—"}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-center">
                    <button
                      onClick={() => setViewModalUser(user)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all"
                    >
                      <FaEye size={12} />
                      View
                    </button>
                  </TableCell>
                  {role !== "dean" && (
                    <TableCell className="px-4 py-3">
                      <div className="flex items-center gap-1.5 justify-center">
                        <button
                          onClick={() => handleEdit(user._id)}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 transition-all"
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
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                            user.is_active
                              ? "bg-white text-red-600 border-red-200 hover:bg-red-50"
                              : "bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50"
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
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white text-amber-600 border border-amber-200 hover:bg-amber-50 transition-all"
                        >
                          Reset
                        </button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
            {paginatedData.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={role !== "dean" ? 8 : 7}
                  className="text-center py-12"
                >
                  <div className="flex flex-col items-center gap-2">
                    <svg
                      className="w-10 h-10 text-gray-200"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <p className="text-sm text-gray-500">No students found</p>
                    <p className="text-xs text-gray-400">
                      Try adjusting your search or filters
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mt-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Rows per page:</span>
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
              if (e.key === "Enter") e.target.blur();
            }}
            className="w-16 border border-gray-200 rounded px-2 py-1 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-all"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Prev
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-all"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </button>
        </div>
      </div>

      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold mb-3">
              {confirmAction.type === "reset"
                ? "Reset Password"
                : confirmAction.isActive
                  ? "Deactivate User"
                  : "Activate User"}
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              {confirmAction.type === "reset"
                ? "This will reset the user's password to the default value."
                : confirmAction.isActive
                  ? "This will deactivate the user account."
                  : "This will activate the user account."}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    if (confirmAction.type === "reset")
                      await handleResetPassword(confirmAction.userId);
                    else
                      await handleToggleStatus(
                        confirmAction.userId,
                        confirmAction.isActive,
                      );
                  } finally {
                    setConfirmAction(null);
                  }
                }}
                className={`px-4 py-2 text-sm font-medium rounded-lg text-white transition shadow-sm ${
                  confirmAction.type === "reset"
                    ? "bg-amber-500 hover:bg-amber-600"
                    : confirmAction.isActive
                      ? "bg-red-500 hover:bg-red-600"
                      : "bg-emerald-500 hover:bg-emerald-600"
                }`}
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
