import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { cacheOrSet } from "@/lib/cache";
import { runAnalyticsAggregation } from "@/lib/analytics";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const REPORT_CACHE_TTL = 60 * 1000; // 60 seconds

export async function GET(req) {
  try {
    await connectDB();

    const url = new URL(req.url);
    const collegeFilter = url.searchParams.get("college")?.trim();
    const schoolYear = url.searchParams.get("school_year")?.trim();
    const semester = url.searchParams.get("semester")?.trim();

    const cacheKey = `analytics:report:${collegeFilter || "all"}:${schoolYear || "all"}:${semester || "all"}`;

    const result = await cacheOrSet(
      cacheKey,
      async () => {
        const filteredUsers = await runAnalyticsAggregation({
          collegeFilter,
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

        const employeeCounts = {};
        const employeeTotals = { Male: 0, Female: 0, Unspecified: 0 };

        employees.forEach((user) => {
          const status =
            user.personal_info_id?.affiliation?.employment_information
              ?.employment_appointment_status || "Unspecified";
          const sex = user.personal_info_id?.gadData?.sexAtBirth || "Unspecified";

          if (!employeeCounts[status]) {
            employeeCounts[status] = { Male: 0, Female: 0, Unspecified: 0 };
          }

          employeeCounts[status][sex] = (employeeCounts[status][sex] || 0) + 1;

          if (!employeeTotals[sex]) employeeTotals[sex] = 0;
          employeeTotals[sex] += 1;
        });

        const employeeRows = Object.entries(employeeCounts).map(
          ([status, counts]) => {
            const male = counts.Male || 0;
            const female = counts.Female || 0;
            const unspecified = counts.Unspecified || 0;
            const total = male + female + unspecified;
            return [status, male, female, total];
          },
        );

        if (employeeRows.length) {
          const total =
            (employeeTotals.Male || 0) +
            (employeeTotals.Female || 0) +
            (employeeTotals.Unspecified || 0);
          employeeRows.push([
            "Total",
            employeeTotals.Male || 0,
            employeeTotals.Female || 0,
            total,
          ]);
        }

        const employeeHeader = ["Appointment Status", "Male", "Female", "Total"];

        const courseYearCounts = {};
        const studentTotals = { Male: 0, Female: 0, Unspecified: 0 };

        students.forEach((user) => {
          const course =
            user.personal_info_id?.affiliation?.academic_information?.course ||
            "Unspecified";
          const yearLevel =
            user.personal_info_id?.affiliation?.academic_information?.year_level ||
            "Unspecified";
          const sex = user.personal_info_id?.gadData?.sexAtBirth || "Unspecified";

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

          if (!studentTotals[sex]) studentTotals[sex] = 0;
          studentTotals[sex] += 1;
        });

        const totalStudents =
          (studentTotals.Male || 0) +
          (studentTotals.Female || 0) +
          (studentTotals.Unspecified || 0);

        const allCourses = Object.keys(courseYearCounts)
          .sort((a, b) => a.localeCompare(b))
          .filter((c) => courseYearCounts[c]);

        const doc = new jsPDF();
        const nowISO = new Date().toISOString();

        doc.setFontSize(12);
        doc.text("Sex Disaggregated Data Report", 14, 15);
        doc.setFontSize(9);
        doc.text(`Generated: ${nowISO}`, 14, 22);
        if (collegeFilter) {
          doc.text(`College/Office: ${collegeFilter}`, 14, 28);
        }
        if (schoolYear || semester) {
          const termLabel = [
            schoolYear || "All school years",
            semester || "All semesters",
          ].join(" - ");
          doc.text(`School Year/Semester: ${termLabel}`, 14, 34);
        }

        const sectionLabel = collegeFilter || "All Colleges/Offices";
        doc.setFontSize(10);
        doc.text(
          `Faculty Composition in ${sectionLabel}`,
          14,
          schoolYear || semester ? 38 : collegeFilter ? 32 : 28,
        );
        doc.setFontSize(8);
        autoTable(doc, {
          startY: schoolYear || semester ? 42 : collegeFilter ? 36 : 32,
          head: [employeeHeader],
          body: employeeRows.length ? employeeRows : [["No data", 0]],
          styles: { fontSize: 8 },
          headStyles: { fillColor: [33, 150, 243] },
        });
        let tableStartY =
          (doc.lastAutoTable?.finalY ||
            (schoolYear || semester ? 42 : collegeFilter ? 36 : 32)) + 8;

        const summaryLabel = collegeFilter || "All Colleges/Offices";

        doc.setFontSize(10);
        doc.text(`Student Enrollment in ${summaryLabel}`, 14, tableStartY);
        doc.setFontSize(8);
        tableStartY += 4;

        const allYearMap = {};
        Object.values(courseYearCounts).forEach((yearMap) => {
          Object.entries(yearMap).forEach(([year, counts]) => {
            if (!allYearMap[year]) {
              allYearMap[year] = { Male: 0, Female: 0, Unspecified: 0 };
            }
            allYearMap[year].Male += counts.Male || 0;
            allYearMap[year].Female += counts.Female || 0;
            allYearMap[year].Unspecified += counts.Unspecified || 0;
          });
        });

        const yearOrder = ["1st Year", "2nd Year", "3rd Year", "4th Year", "Total"];
        const allRowsUnsorted = Object.entries(allYearMap).map(([year, counts]) => {
          const male = counts.Male || 0;
          const female = counts.Female || 0;
          const unspecified = counts.Unspecified || 0;
          const total = male + female + unspecified;
          return [year, male, female, total];
        });
        const allRows = yearOrder
          .map((orderYear) => allRowsUnsorted.find((row) => row[0] === orderYear))
          .filter(Boolean);

        allRowsUnsorted.forEach((row) => {
          if (!yearOrder.includes(row[0])) allRows.push(row);
        });

        const allMaleTotal = Object.values(allYearMap).reduce(
          (sum, c) => sum + (c.Male || 0),
          0,
        );
        const allFemaleTotal = Object.values(allYearMap).reduce(
          (sum, c) => sum + (c.Female || 0),
          0,
        );
        const allUnspecifiedTotal = Object.values(allYearMap).reduce(
          (sum, c) => sum + (c.Unspecified || 0),
          0,
        );
        const allTotal = allMaleTotal + allFemaleTotal + allUnspecifiedTotal;
        if (allRows.length) {
          const totalRow = ["Total", allMaleTotal, allFemaleTotal, allTotal];
          const filteredRows = allRows.filter((row) => row[0] !== "Total");
          filteredRows.push(totalRow);
          allRows.length = 0;
          allRows.push(...filteredRows);
        }
        autoTable(doc, {
          startY: tableStartY,
          head: [["Year Level", "Male", "Female", "Total"]],
          body: allRows.length ? allRows : [["No student data", 0, 0, 0]],
          styles: { fontSize: 8 },
          headStyles: { fillColor: [33, 150, 243] },
        });
        tableStartY = (doc.lastAutoTable?.finalY || tableStartY) + 8;

        if (!allCourses.length) {
          autoTable(doc, {
            startY: tableStartY,
            head: [["Course", "Year Level", "Male", "Female", "Total"]],
            body: [["No student data", "", 0, 0, 0]],
            styles: { fontSize: 8 },
            headStyles: { fillColor: [33, 150, 243] },
          });
          tableStartY = (doc.lastAutoTable?.finalY || tableStartY) + 8;
        } else {
          allCourses.forEach((course) => {
            const yearMap = courseYearCounts[course] || {};

            doc.text(`Course: ${course}`, 14, tableStartY);
            const tableY = tableStartY + 4;

            let yearRowsUnsorted = Object.entries(yearMap).map(([year, counts]) => {
              const male = counts.Male || 0;
              const female = counts.Female || 0;
              const unspecified = counts.Unspecified || 0;
              const total = male + female + unspecified;
              return [year, male, female, total];
            });
            const yearOrder = [
              "1st Year",
              "2nd Year",
              "3rd Year",
              "4th Year",
              "Total",
            ];
            let yearRows = yearOrder
              .map((orderYear) =>
                yearRowsUnsorted.find((row) => row[0] === orderYear),
              )
              .filter(Boolean);
            yearRowsUnsorted.forEach((row) => {
              if (!yearOrder.includes(row[0])) yearRows.push(row);
            });

            if (yearRows.length) {
              const maleTotal = Object.values(yearMap).reduce(
                (sum, c) => sum + (c.Male || 0),
                0,
              );
              const femaleTotal = Object.values(yearMap).reduce(
                (sum, c) => sum + (c.Female || 0),
                0,
              );
              const unspecifiedTotal = Object.values(yearMap).reduce(
                (sum, c) => sum + (c.Unspecified || 0),
                0,
              );
              const total = maleTotal + femaleTotal + unspecifiedTotal;
              const totalRow = ["Total", maleTotal, femaleTotal, total];
              const filteredRows = yearRows.filter((row) => row[0] !== "Total");
              filteredRows.push(totalRow);
              yearRows.length = 0;
              yearRows.push(...filteredRows);
            }

            autoTable(doc, {
              startY: tableY,
              head: [["Year Level", "Male", "Female", "Total"]],
              body: yearRows.length ? yearRows : [["No data", 0, 0, 0]],
              styles: { fontSize: 8 },
              headStyles: { fillColor: [33, 150, 243] },
            });

            tableStartY = (doc.lastAutoTable?.finalY || tableY) + 8;
          });
        }

        const pdfArrayBuffer = doc.output("arraybuffer");
        return Buffer.from(pdfArrayBuffer);
      },
      REPORT_CACHE_TTL,
    );

    if (result?.__empty) {
      return NextResponse.json({ message: result.message }, { status: 404 });
    }

    const nowISO = new Date().toISOString();

    return new NextResponse(result, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="sex-disaggregated-report-${collegeFilter || "all"}-${schoolYear || "all-years"}-${semester || "all-semesters"}-${nowISO}.pdf"`,
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