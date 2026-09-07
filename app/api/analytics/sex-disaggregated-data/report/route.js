import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { cacheOrSet } from "@/lib/cache";
import { runAnalyticsAggregation } from "@/lib/analytics";
import { requireAuth } from "@/lib/auth";
import { SCOPED_ROLES } from "@/lib/colleges";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { readFile } from "fs/promises";
import path from "path";

const REPORT_CACHE_TTL = 60 * 1000; // 60 seconds

const YEAR_ORDER = [
  "Grade 11",
  "Grade 12",
  "1st Year",
  "2nd Year",
  "3rd Year",
  "4th Year",
  "5th Year",
  "Graduates",
  "Unspecified",
];

function sumCounts(counts = {}) {
  return Object.values(counts).reduce((sum, n) => sum + (n || 0), 0);
}

function orderKeys(map) {
  const keys = Object.keys(map);
  const ordered = keys
    .filter((k) => k !== "Unspecified")
    .sort((a, b) => String(a).localeCompare(String(b)));
  if (keys.includes("Unspecified")) ordered.push("Unspecified");
  return ordered;
}

function sortYearKeys(yearMap) {
  const years = Object.keys(yearMap);
  const known = years
    .filter((y) => YEAR_ORDER.includes(y))
    .sort((a, b) => YEAR_ORDER.indexOf(a) - YEAR_ORDER.indexOf(b));
  const unknown = years
    .filter((y) => !YEAR_ORDER.includes(y))
    .sort((a, b) => String(a).localeCompare(String(b)));
  return [...known, ...unknown];
}

function appendTotalRow(rows, map, orderedKeys) {
  if (!rows.length) return rows;
  let male = 0;
  let female = 0;
  let total = 0;
  orderedKeys.forEach((key) => {
    const counts = map[key] || {};
    male += counts.Male || 0;
    female += counts.Female || 0;
    total += sumCounts(counts);
  });
  rows.push(["Total", male, female, total]);
  return rows;
}

function rowsFromYearMap(yearMap) {
  const keys = sortYearKeys(yearMap);
  const rows = keys.map((year) => {
    const counts = yearMap[year] || {};
    return [year, counts.Male || 0, counts.Female || 0, sumCounts(counts)];
  });
  return appendTotalRow(rows, yearMap, keys);
}

function rowsFromGroupMap(groupMap) {
  const keys = orderKeys(groupMap);
  const rows = keys.map((key) => {
    const counts = groupMap[key] || {};
    return [key, counts.Male || 0, counts.Female || 0, sumCounts(counts)];
  });
  return appendTotalRow(rows, groupMap, keys);
}

export async function GET(req) {
  try {
    const { error, status, user } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });

    await connectDB();

    const url = new URL(req.url);
    const requestedCollege = url.searchParams.get("college")?.trim();
    const courseFilter = url.searchParams.get("course")?.trim();
    const schoolYear = url.searchParams.get("school_year")?.trim();
    const semester = url.searchParams.get("semester")?.trim();

    const collegeFilter =
      user?.role && SCOPED_ROLES.includes(user.role)
        ? user.assignedCollege || "__no_college__"
        : requestedCollege;

    const cacheKey = `analytics:report:${collegeFilter || "all"}:${courseFilter || "all"}:${schoolYear || "all"}:${semester || "all"}`;

    const result = await cacheOrSet(
      cacheKey,
      async () => {
        const filteredUsers = await runAnalyticsAggregation({
          collegeFilter,
          courseFilter,
          schoolYear,
          semester,
        });

        if (!filteredUsers || filteredUsers.length === 0) {
          return {
            __empty: true,
            message:
              collegeFilter || schoolYear || semester
                ? "No users found for selected filters"
                : "No users found for report",
          };
        }

        const employees = filteredUsers.filter(
          (u) => u.personal_info_id?.personal?.currentStatus === "Employee",
        );
        const students = filteredUsers.filter(
          (u) => u.personal_info_id?.personal?.currentStatus === "Student",
        );

        const getSex = (user) =>
          user.personal_info_id?.gadData?.sexAtBirth || "Unspecified";

        const employeeStatusCounts = {};
        const employeeByOffice = {};

        employees.forEach((user) => {
          const sex = getSex(user);
          const employment =
            user.personal_info_id?.affiliation?.employment_information || {};
          const status =
            employment.employment_appointment_status || "Unspecified";
          const office = employment.office || "Unspecified";

          if (!employeeStatusCounts[status]) {
            employeeStatusCounts[status] = {
              Male: 0,
              Female: 0,
              Unspecified: 0,
            };
          }
          employeeStatusCounts[status][sex] =
            (employeeStatusCounts[status][sex] || 0) + 1;

          if (!employeeByOffice[office]) employeeByOffice[office] = {};
          if (!employeeByOffice[office][status]) {
            employeeByOffice[office][status] = {
              Male: 0,
              Female: 0,
              Unspecified: 0,
            };
          }
          employeeByOffice[office][status][sex] =
            (employeeByOffice[office][status][sex] || 0) + 1;
        });


        const employeeOfficeSexTotals = {};
        Object.entries(employeeByOffice).forEach(([office, statuses]) => {
          const totals = { Male: 0, Female: 0, Unspecified: 0 };
          Object.values(statuses).forEach((counts) => {
            Object.entries(counts).forEach(([sex, n]) => {
              totals[sex] = (totals[sex] || 0) + (n || 0);
            });
          });
          employeeOfficeSexTotals[office] = totals;
        });


        const courseYearCounts = {};
        const studentByCollege = {};

        students.forEach((user) => {
          const sex = getSex(user);
          const academic =
            user.personal_info_id?.affiliation?.academic_information || {};
          const course = academic.course || "Unspecified";
          const yearLevel = academic.year_level || "Unspecified";
          const college = academic.college || "Unspecified";

          if (!courseYearCounts[course]) {
            courseYearCounts[course] = {};
          }
          if (!courseYearCounts[course][yearLevel]) {
            courseYearCounts[course][yearLevel] = {
              Male: 0,
              Female: 0,
              Unspecified: 0,
            };
          }
          courseYearCounts[course][yearLevel][sex] =
            (courseYearCounts[course][yearLevel][sex] || 0) + 1;

          if (!studentByCollege[college]) {
            studentByCollege[college] = {};
          }
          if (!studentByCollege[college][yearLevel]) {
            studentByCollege[college][yearLevel] = {
              Male: 0,
              Female: 0,
              Unspecified: 0,
            };
          }
          studentByCollege[college][yearLevel][sex] =
            (studentByCollege[college][yearLevel][sex] || 0) + 1;
        });

        const studentCollegeSexTotals = {};
        Object.entries(studentByCollege).forEach(([college, yearMap]) => {
          const totals = { Male: 0, Female: 0, Unspecified: 0 };
          Object.values(yearMap).forEach((counts) => {
            Object.entries(counts).forEach(([sex, n]) => {
              totals[sex] = (totals[sex] || 0) + (n || 0);
            });
          });
          studentCollegeSexTotals[college] = totals;
        });

        const allYearMap = {};
        Object.values(studentByCollege).forEach((yearMap) => {
          Object.entries(yearMap).forEach(([year, counts]) => {
            if (!allYearMap[year]) {
              allYearMap[year] = { Male: 0, Female: 0, Unspecified: 0 };
            }
            ["Male", "Female", "Unspecified"].forEach((sex) => {
              allYearMap[year][sex] += counts[sex] || 0;
            });
          });
        });

        const doc = new jsPDF();
        const generatedAt = new Date();
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        const contentBottom = pageH - 16;
        const continuationStartY = 24;

        const generatedLabel = new Intl.DateTimeFormat("en-PH", {
          dateStyle: "long",
          timeStyle: "short",
          timeZone: "Asia/Manila",
        }).format(generatedAt);

        let y = 12;
        let titleX = 14;
        try {
          const logoBuffer = await readFile(
            path.join(process.cwd(), "public", "getThemePhoto.png"),
          );
          doc.addImage(
            `data:image/png;base64,${logoBuffer.toString("base64")}`,
            "PNG",
            14,
            8,
            16,
            16,
          );
          titleX = 34;
        } catch {
         
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text("Sex Disaggregated Data Report", titleX, y + 3);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text(generatedLabel, titleX, y + 9);
        let metaY = y + 15;
        if (collegeFilter) {
          doc.text(`College/Office: ${collegeFilter}`, titleX, metaY);
          metaY += 5.5;
        }
        if (schoolYear || semester) {
          const termLabel = [
            schoolYear || "All school years",
            semester || "All semesters",
          ].join(" - ");
          doc.text(`School Year/Semester: ${termLabel}`, titleX, metaY);
          metaY += 5.5;
        }
        y = Math.max(metaY + 2, 30);

        function startNewPage() {
          doc.addPage();
          y = continuationStartY;
        }

        function ensureSpace(needed) {
          if (y + needed > contentBottom) startNewPage();
        }

        function drawSectionHeading(text, size = 10) {
          ensureSpace(size + 34);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(size);
          const lines = doc.splitTextToSize(text, pageW - 28);
          doc.text(lines, 14, y);
          doc.setFont("helvetica", "normal");
          y += lines.length * (size * 0.42) + 2.5;
        }

        function drawTable(head, body) {
          autoTable(doc, {
            startY: y,
            head: [head],
            body: body.length ? body : [["No data", 0, 0, 0]],
            styles: { fontSize: 8, cellPadding: 1.5 },
            headStyles: {
              fillColor: [33, 150, 243],
              textColor: 255,
              fontStyle: "bold",
            },
            alternateRowStyles: { fillColor: [244, 246, 250] },
            margin: { top: 20, bottom: 20, left: 14, right: 14 },
            didParseCell: (data) => {
              if (data.section !== "body") return;
              const rowLabel = Array.isArray(data.row.raw)
                ? String(data.row.raw[0])
                : "";
              if (rowLabel.toLowerCase() === "total") {
                data.cell.styles.fontStyle = "bold";
                data.cell.styles.fillColor = [228, 232, 238];
              }
              if (data.column.index > 0) {
                data.cell.styles.halign = "center";
              }
            },
          });
          y = (doc.lastAutoTable?.finalY || y) + 7;
        }

        const sectionLabel = collegeFilter || "All Colleges/Offices";

        drawSectionHeading(`Faculty Composition in ${sectionLabel}`);
        drawTable(
          ["Appointment Status", "Male", "Female", "Total"],
          rowsFromGroupMap(employeeStatusCounts),
        );

        drawSectionHeading(`Student Enrollment in ${sectionLabel}`);
        drawTable(
          ["Year Level", "Male", "Female", "Total"],
          rowsFromYearMap(allYearMap),
        );

        if (!collegeFilter) {
          drawSectionHeading("Students by College/Office");
          drawTable(
            ["College/Office", "Male", "Female", "Total"],
            rowsFromGroupMap(studentCollegeSexTotals),
          );

          drawSectionHeading("Employees by College/Office");
          drawTable(
            ["College/Office", "Male", "Female", "Total"],
            rowsFromGroupMap(employeeOfficeSexTotals),
          );

          const orderedColleges = [
            ...new Set([
              ...Object.keys(studentByCollege),
              ...Object.keys(employeeByOffice),
            ]),
          ].sort((a, b) => String(a).localeCompare(String(b)));

          orderedColleges.forEach((college) => {
            const studentTotal = sumCounts(studentCollegeSexTotals[college]);
            const employeeTotal = sumCounts(employeeOfficeSexTotals[college]);

            drawSectionHeading(
              `${college}  (Students: ${studentTotal.toLocaleString()} | Employees: ${employeeTotal.toLocaleString()})`,
            );

            drawSectionHeading(`Faculty Composition in ${college}`, 9);
            drawTable(
              ["Appointment Status", "Male", "Female", "Total"],
              rowsFromGroupMap(employeeByOffice[college] || {}),
            );

            drawSectionHeading(`Student Enrollment in ${college}`, 9);
            drawTable(
              ["Year Level", "Male", "Female", "Total"],
              rowsFromYearMap(studentByCollege[college] || {}),
            );
          });
        }

        drawSectionHeading(`Student Enrollment by Course (${sectionLabel})`);
        Object.keys(courseYearCounts)
          .sort((a, b) => String(a).localeCompare(String(b)))
          .forEach((course) => {
            drawSectionHeading(`Course: ${course}`, 9);
            drawTable(
              ["Year Level", "Male", "Female", "Total"],
              rowsFromYearMap(courseYearCounts[course] || {}),
            );
          });

        const totalPages = doc.getNumberOfPages();
        for (let page = 1; page <= totalPages; page++) {
          doc.setPage(page);
          if (page > 1) {
            doc.setFontSize(8);
            doc.setFont("helvetica", "bold");
            doc.text("Sex Disaggregated Data Report", 14, 9);
            doc.setFont("helvetica", "normal");
            const contextParts = [];
            if (collegeFilter) {
              contextParts.push(`College/Office: ${collegeFilter}`);
            }
            if (schoolYear || semester) {
              contextParts.push(
                `${schoolYear || "All school years"} - ${
                  semester || "All semesters"
                }`,
              );
            }
            if (contextParts.length) {
              doc.text(contextParts.join(" | "), 14, 13);
            }
            doc.setDrawColor(203, 213, 225);
            doc.setLineWidth(0.2);
            doc.line(14, 15.5, pageW - 14, 15.5);
          }
          doc.setFontSize(7.5);
          doc.setTextColor(110);
          doc.text(generatedLabel, 14, pageH - 8);
          doc.text(`Page ${page} of ${totalPages}`, pageW - 14, pageH - 8, {
            align: "right",
          });
          doc.setTextColor(0);
          doc.setDrawColor(0);
        }

        const pdfArrayBuffer = doc.output("arraybuffer");
        return {
          buffer: Buffer.from(pdfArrayBuffer),
          generatedAt: generatedAt.toISOString(),
        };
      },
      REPORT_CACHE_TTL,
    );

    if (result?.__empty) {
      return NextResponse.json({ message: result.message }, { status: 404 });
    }

    return new NextResponse(result.buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="sex-disaggregated-report-${collegeFilter || "all"}-${schoolYear || "all-years"}-${semester || "all-semesters"}-${result.generatedAt}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Report generation failed:", err);
    return NextResponse.json(
      { message: "Failed to generate report" },
      { status: 500 },
    );
  }
}