import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import UserAuth from "@/models/user";
import GemsProfile from "@/models/profile";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export async function GET(req) {
  try {
    await connectDB();

    const url = new URL(req.url);
    const collegeFilter = url.searchParams.get("college")?.trim();

    const users = await UserAuth.find({})
      .populate({
        path: "personal_info_id",
        model: GemsProfile,
        select: "personal gadData affiliation",
      })
      .lean();

    if (!users || users.length === 0) {
      return NextResponse.json(
        { message: "No users found for report" },
        { status: 404 },
      );
    }

    const matchesCollege = (profile) => {
      if (!collegeFilter) return true;
      const academicCollege =
        profile?.affiliation?.academic_information?.college || "";
      const employmentOffice =
        profile?.affiliation?.employment_information?.office || "";
      return (
        academicCollege.toLowerCase() === collegeFilter.toLowerCase() ||
        employmentOffice.toLowerCase() === collegeFilter.toLowerCase()
      );
    };

    const filteredUsers = users.filter((user) =>
      matchesCollege(user.personal_info_id || {}),
    );

    if (!filteredUsers.length) {
      return NextResponse.json(
        {
          message: collegeFilter
            ? `No users found for college/office: ${collegeFilter}`
            : "No users found for report",
        },
        { status: 404 },
      );
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

    const courseOrder = ["Info System", "Info Tech"];
    const dynamicCourses = Object.keys(courseYearCounts)
      .filter((c) => !courseOrder.includes(c))
      .sort((a, b) => a.localeCompare(b));
    const allCourses = [...courseOrder, ...dynamicCourses].filter(
      (c) => courseYearCounts[c],
    );

    const doc = new jsPDF();
    const nowISO = new Date().toISOString();

    doc.setFontSize(12);
    doc.text("Sex Disaggregated Data Report", 14, 15);
    doc.setFontSize(9);
    doc.text(`Generated: ${nowISO}`, 14, 22);
    if (collegeFilter) {
      doc.text(`College/Office: ${collegeFilter}`, 14, 28);
    }

    doc.setFontSize(10);
    doc.text("Faculty Composition in CICS", 14, collegeFilter ? 32 : 28);
    doc.setFontSize(8);
    autoTable(doc, {
      startY: collegeFilter ? 36 : 32,
      head: [employeeHeader],
      body: employeeRows.length ? employeeRows : [["No data", 0]],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [33, 150, 243] },
    });
    let tableStartY =
      (doc.lastAutoTable?.finalY || (collegeFilter ? 36 : 32)) + 8;

    doc.setFontSize(10);
    doc.text("Student Enrollment in CICS", 14, tableStartY);
    doc.setFontSize(8);
    tableStartY += 4;

    const cicsCourses = ["Info System", "Info Tech"];
    const cicsYearMap = {};
    cicsCourses.forEach((course) => {
      const yearMap = courseYearCounts[course] || {};
      Object.entries(yearMap).forEach(([year, counts]) => {
        if (!cicsYearMap[year]) {
          cicsYearMap[year] = { Male: 0, Female: 0, Unspecified: 0 };
        }
        cicsYearMap[year].Male += counts.Male || 0;
        cicsYearMap[year].Female += counts.Female || 0;
        cicsYearMap[year].Unspecified += counts.Unspecified || 0;
      });
    });

    // Arrange year levels in order: 1st, 2nd, 3rd, 4th year, then Total
    const yearOrder = ["1st Year", "2nd Year", "3rd Year", "4th Year", "Total"];
    const cicsRowsUnsorted = Object.entries(cicsYearMap).map(
      ([year, counts]) => {
        const male = counts.Male || 0;
        const female = counts.Female || 0;
        const unspecified = counts.Unspecified || 0;
        const total = male + female + unspecified;
        return [year, male, female, total];
      },
    );
    // Sort rows by yearOrder
    const cicsRows = yearOrder
      .map((orderYear) => cicsRowsUnsorted.find((row) => row[0] === orderYear))
      .filter(Boolean);
    // Add any other years not in the order
    cicsRowsUnsorted.forEach((row) => {
      if (!yearOrder.includes(row[0])) cicsRows.push(row);
    });

    const cicsMaleTotal = Object.values(cicsYearMap).reduce(
      (sum, c) => sum + (c.Male || 0),
      0,
    );
    const cicsFemaleTotal = Object.values(cicsYearMap).reduce(
      (sum, c) => sum + (c.Female || 0),
      0,
    );
    const cicsUnspecifiedTotal = Object.values(cicsYearMap).reduce(
      (sum, c) => sum + (c.Unspecified || 0),
      0,
    );
    const cicsTotal = cicsMaleTotal + cicsFemaleTotal + cicsUnspecifiedTotal;
    if (cicsRows.length) {
      const totalRow = ["Total", cicsMaleTotal, cicsFemaleTotal, cicsTotal];
      const filteredRows = cicsRows.filter((row) => row[0] !== "Total");
      filteredRows.push(totalRow);
      cicsRows.length = 0;
      cicsRows.push(...filteredRows);
    }
    autoTable(doc, {
      startY: tableStartY,
      head: [["Year Level", "Male", "Female", "Total"]],
      body: cicsRows.length ? cicsRows : [["No CICS student data", 0, 0, 0]],
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
        let yearRows;
        if (course === "Info System" || course === "Info Tech") {
          const yearOrder = [
            "1st Year",
            "2nd Year",
            "3rd Year",
            "4th Year",
            "Total",
          ];
          yearRows = yearOrder
            .map((orderYear) =>
              yearRowsUnsorted.find((row) => row[0] === orderYear),
            )
            .filter(Boolean);

          yearRowsUnsorted.forEach((row) => {
            if (!yearOrder.includes(row[0])) yearRows.push(row);
          });
        } else {
          yearRows = yearRowsUnsorted;
        }

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
    const pdfBuffer = Buffer.from(pdfArrayBuffer);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="sex-disaggregated-report-${collegeFilter || "all"}-${nowISO}.pdf"`,
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
