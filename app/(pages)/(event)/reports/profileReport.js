/* Gender Profile Report PDF (masterlist or aggregated) built in the browser
   from the sample datasets. Table logic lives in ./profileReportFields.js. */
import {
  loadLogo,
  resolveAutoTable,
} from "../gender-statistics/components/quickReports.js";
import {
  PROFILE_POPULATIONS,
  buildProfileTable,
  profileOrientation,
  profileReportFilename,
  profileReportTitle,
} from "./profileReportFields.js";
import {
  applyProfileFilters,
  profileFilterSummary,
} from "./profileFilters.js";
import {
  sampleReportRecords,
  sampleReportSchoolYear,
  sampleReportSemester,
} from "./sampleGenderProfiles.js";

/* Filtered sample records for a population. Student records follow the year
   and semester filters; employees only carry a year. */
export function profileReportRecords(population, filters = {}, valueFilters = {}) {
  return applyProfileFilters(
    population,
    baseProfileRecords(population, filters),
    valueFilters,
  );
}

/* Population + academic year/semester only, before value filters. The picker
   uses this to compute filter option counts. */
export function baseProfileRecords(population, filters = {}) {
  const schoolYear = sampleReportSchoolYear(filters.schoolYear);
  const semester = sampleReportSemester(filters.semester);
  const records = [];
  if (population !== "employees") {
    sampleReportRecords("students", { schoolYear, semester }).forEach((r) =>
      records.push({ ...r, __type: "Student" }),
    );
  }
  if (population !== "students") {
    sampleReportRecords("employees", { schoolYear }).forEach((r) =>
      records.push({ ...r, __type: "Employee" }),
    );
  }
  return records;
}

export function profileScopeSummary(
  population,
  filters = {},
  count = 0,
  valueFilters = {},
) {
  const label =
    PROFILE_POPULATIONS.find((p) => p.value === population)?.label || population;
  const year = sampleReportSchoolYear(filters.schoolYear);
  const semester = sampleReportSemester(filters.semester);
  const parts = [label, year ? `Academic Year: ${year}` : "All academic years"];
  if (population !== "employees" && semester) {
    parts.push(
      `Semester: ${semester}${population === "both" ? " (students only)" : ""}`,
    );
  }
  const extra = profileFilterSummary(population, valueFilters);
  if (extra) parts.push(extra);
  parts.push(`${count.toLocaleString("en-US")} records`);
  return parts.join(" | ");
}

export async function generateProfileReport(
  population,
  filters = {},
  fields = [],
  valueFilters = {},
) {
  const records = profileReportRecords(population, filters, valueFilters);
  const table = buildProfileTable({ population, fields, records });

  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = resolveAutoTable(autoTableModule);
  if (!autoTable) {
    throw new Error("Could not load the PDF table renderer (jspdf-autotable).");
  }

  const doc = new jsPDF({
    orientation: profileOrientation(table.mode, table.head.length),
  });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;

  const generatedLabel = new Intl.DateTimeFormat("en-PH", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(new Date());

  let y = 10;
  let titleX = margin;
  const logoDataUrl = await loadLogo();
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", margin, 7, 16, 16);
      titleX = margin + 20;
    } catch {
      /* Logo is decorative - fall back to the text-only header. */
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("MARINDUQUE STATE UNIVERSITY", titleX, y + 4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Gender and Development Unit", titleX, y + 9);

  y += 18;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(profileReportTitle(population, table.mode), margin, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const infoLines = [
    `Generated: ${generatedLabel}`,
    "Data source: Sample dataset (synthetic records - demonstration data)",
    `Filters applied: ${profileScopeSummary(population, filters, records.length, valueFilters)}`,
    table.mode === "masterlist"
      ? "Layout: one row per person."
      : `Layout: counts grouped by ${
          table.groupedBy.length ? table.groupedBy.join(", ") : "population only"
        }.`,
  ];
  if (table.ignored.length) {
    infoLines.push(
      `Not used for counts (identifying fields): ${table.ignored.join(", ")}.`,
    );
  }
  infoLines.forEach((line) => {
    const wrapped = doc.splitTextToSize(line, pageW - margin * 2);
    doc.text(wrapped, margin, y);
    y += wrapped.length * 4.2;
  });
  doc.setTextColor(180, 83, 9);
  doc.text(
    "Demonstration output generated in the browser - not official GAD statistics.",
    margin,
    y,
  );
  doc.setTextColor(0);
  y += 6;

  if (!table.body.length) {
    doc.text("No records match the selected filters.", margin, y);
  } else {
    const columnStyles = {};
    for (let i = table.head.length - table.statColumns; i < table.head.length; i += 1) {
      columnStyles[i] = { halign: "right" };
    }
    autoTable(doc, {
      startY: y,
      head: [table.head],
      body: table.body,
      showHead: "everyPage",
      margin: { left: margin, right: margin, top: 16, bottom: 16 },
      styles: { fontSize: 8, cellPadding: 1.5 },
      headStyles: { fillColor: [109, 40, 217], textColor: 255, fontStyle: "bold" },
      columnStyles,
      didParseCell: (hook) => {
        if (
          hook.section === "body" &&
          table.totalRowIndex !== null &&
          hook.row.index === table.totalRowIndex
        ) {
          hook.cell.styles.fontStyle = "bold";
          hook.cell.styles.fillColor = [243, 244, 246];
        }
      },
    });
  }

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`Page ${page} of ${pages}`, pageW - margin, pageH - 8, {
      align: "right",
    });
  }
  doc.setTextColor(0);

  return doc;
}

export async function downloadProfileReport(
  population,
  filters = {},
  fields = [],
  valueFilters = {},
) {
  const doc = await generateProfileReport(
    population,
    filters,
    fields,
    valueFilters,
  );
  const mode = buildProfileTable({
    population,
    fields,
    records: [],
  }).mode;
  doc.save(profileReportFilename(population, mode));
  return doc;
}
