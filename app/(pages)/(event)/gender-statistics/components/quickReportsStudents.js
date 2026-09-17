/* Quick Reports for the Student Gender Statistics page.

   The server-side endpoint (/api/analytics/sex-disaggregated-data/report) only
   reads live MongoDB records, so it cannot report on the client-side sample
   dataset (data/sample-students.json). Like the personnel quick reports
   (./quickReports.js), these reports are rendered in the browser with the same
   jsPDF/jspdf-autotable stack, from the breakdown the students page already
   has on screen. One export per report kind, one button per report kind - each
   button produces its own separate PDF.

   Everything is derived from the `data` object the page already holds, so the
   helpers work for both the sample dataset and the live API response (they
   share the same shape: totals + byCollege / byProgram / byLevel /
   byYearLevel / byStudentType / demographics / byAcademicYear). No network or
   database access. */

import {
  MIN_GROUP_FOR_FINDINGS,
  buildGapEntries,
  buildGapFindings,
  buildSexSummaryTable,
  buildSexTable,
  fmtGap,
  fmtPct,
  gapTableFromEntries,
  loadLogo,
  pctOf,
  resolveAutoTable,
} from "./quickReports.js";

export const STUDENT_REPORT_KINDS = {
  STUDENT_PROFILE: "student-gender-profile",
  ENROLLMENT_PROGRAM: "student-enrollment-by-program",
  GENDER_GAP: "student-gender-gap",
  INTERSECTIONAL: "student-intersectional-analysis",
  MULTI_YEAR: "student-multi-year-comparison",
};

const KIND_SLUGS = {
  [STUDENT_REPORT_KINDS.STUDENT_PROFILE]: "student-gender-profile",
  [STUDENT_REPORT_KINDS.ENROLLMENT_PROGRAM]: "enrollment-by-program",
  [STUDENT_REPORT_KINDS.GENDER_GAP]: "gender-gap-analysis-students",
  [STUDENT_REPORT_KINDS.INTERSECTIONAL]: "intersectional-analysis-students",
  [STUDENT_REPORT_KINDS.MULTI_YEAR]: "comparative-multi-year-enrollment",
};

const REPORT_META = {
  [STUDENT_REPORT_KINDS.STUDENT_PROFILE]: {
    title: "Student Gender Profile",
    label: "Student Gender Profile",
  },
  [STUDENT_REPORT_KINDS.ENROLLMENT_PROGRAM]: {
    title: "Enrollment by Program",
    label: "Enrollment by Program",
  },
  [STUDENT_REPORT_KINDS.GENDER_GAP]: {
    title: "Gender Gap Analysis (Students)",
    label: "Gender Gap Analysis",
  },
  [STUDENT_REPORT_KINDS.INTERSECTIONAL]: {
    title: "Intersectional Analysis Report (Sex and Equity Group)",
    label: "Intersectional Analysis",
  },
  [STUDENT_REPORT_KINDS.MULTI_YEAR]: {
    title: "Comparative Multi-Year Enrollment Report",
    label: "Comparative Multi-Year",
  },
};

/* One quick-report button per report kind, in display order. Labelled from
   REPORT_META so the button and the PDF title never drift apart. */
export const STUDENT_QUICK_REPORT_OPTIONS = [
  STUDENT_REPORT_KINDS.STUDENT_PROFILE,
  STUDENT_REPORT_KINDS.ENROLLMENT_PROGRAM,
  STUDENT_REPORT_KINDS.GENDER_GAP,
  STUDENT_REPORT_KINDS.INTERSECTIONAL,
  STUDENT_REPORT_KINDS.MULTI_YEAR,
].map((kind) => ({
  kind,
  title: REPORT_META[kind].title,
  label: `${REPORT_META[kind].label} (PDF)`,
}));

export function studentReportMeta(kind) {
  return (
    REPORT_META[kind] || {
      title: "Student Gender Statistics Quick Report",
      label: "Quick Report",
    }
  );
}

export function studentReportFilename(kind, isSample = false) {
  const stamp = new Date().toISOString().slice(0, 10);
  const slug = KIND_SLUGS[kind] || "student-quick-report";
  return `${slug}${isSample ? "-sample" : ""}-${stamp}.pdf`;
}
/* ── Table builders ────────────────────────────────────────────────────────── */

function rows(items) {
  return Array.isArray(items) ? items : [];
}

function rowTotal(row) {
  if (typeof row?.total === "number") return row.total;
  return (row?.Female || 0) + (row?.Male || 0) + (row?.Other || 0);
}

/** The equity-group breakdown, under whichever key the data source used. */
export function equityRows(dataset = {}) {
  if (rows(dataset.demographics).length) {
    return { items: dataset.demographics, nameKey: "label" };
  }
  return { items: dataset.byStudentType, nameKey: "type" };
}

/**
 * Intersection table: one row per group with each sex's share OF that group
 * (the within-group balance) plus the group's share OF all female students
 * (the between-group representation). The two columns together are what makes
 * the cross-tab an intersection view rather than a plain count.
 */
export function buildIntersectionTable(groups, totals = {}, nameKey = "label") {
  const entries = buildGapEntries(groups, nameKey);
  const allFemale = totals.Female || 0;

  const head = [
    nameKey === "type" ? "Equity Group" : "Group",
    "Female",
    "% Female in Group",
    "Male",
    "% Male in Group",
    "Gap (pp)",
    "% of All Female Students",
    "Interpretation",
  ];

  const body = entries.map((e) => [
    e.label,
    e.Female,
    fmtPct(e.pctFemale),
    e.Male,
    fmtPct(e.pctMale),
    fmtGap(e.gapPp),
    allFemale ? fmtPct(pctOf(e.Female, allFemale)) : "0%",
    e.interpretation,
  ]);

  return { head, body };
}

/**
 * Year-over-year enrollment table built from the byAcademicYear breakdown.
 * Adds the % female per year plus the change in total and in female headcount
 * against the previous academic year, so the trend is readable without a chart.
 */
export function buildYearOverYearTable(years) {
  const sorted = [...rows(years)].sort((a, b) =>
    String(a?.school_year || "").localeCompare(String(b?.school_year || "")),
  );

  const head = [
    "Academic Year",
    "Female",
    "Male",
    "Other",
    "Total",
    "% Female",
    "Change in Total",
    "Change in Female",
  ];

  let prev = null;
  const body = sorted.map((row) => {
    const total = rowTotal(row);
    const female = row?.Female || 0;
    const totalChange = prev === null ? null : total - prev.total;
    const femaleChange = prev === null ? null : female - prev.Female;

    const cells = [
      row?.school_year ?? "Unspecified",
      female,
      row?.Male || 0,
      row?.Other || 0,
      total,
      fmtPct(row?.pctFemale != null ? row.pctFemale : pctOf(female, total)),
      totalChange === null
        ? "-"
        : `${totalChange > 0 ? "+" : ""}${totalChange.toLocaleString()}`,
      femaleChange === null
        ? "-"
        : `${femaleChange > 0 ? "+" : ""}${femaleChange.toLocaleString()}`,
    ];
    prev = { total, Female: female };
    return cells;
  });

  /* Headcounts repeat across years (a student is counted once per year they
     enrolled), so a grand total would double-count. An average row is the
     honest summary instead. */
  if (body.length > 1) {
    const avgOf = (key) =>
      Math.round(
        sorted.reduce((sum, row) => sum + (row?.[key] || 0), 0) / sorted.length,
      );
    const avg = Math.round(
      sorted.reduce((sum, row) => sum + rowTotal(row), 0) / sorted.length,
    );
    const avgFemale = avgOf("Female");
    body.push([
      "Average per academic year",
      avgFemale,
      avgOf("Male"),
      avgOf("Other"),
      avg,
      fmtPct(pctOf(avgFemale, avg)),
      "-",
      "-",
    ]);
  }

  return { head, body };
}

/* ─ PDF rendering ─────────────────────────────────────────────────────────── */

/**
 * Build one student quick-report PDF from the data already rendered on the
 * page. Returns the jsPDF document so the caller can preview or save it.
 */
export async function generateStudentQuickReport(kind, data, options = {}) {
  const dataset = data || {};
  const isSample = Boolean(options.isSample);
  const meta = studentReportMeta(kind);
  const totals = dataset.totals || { Female: 0, Male: 0, Other: 0, total: 0 };

  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = resolveAutoTable(autoTableModule);
  if (!autoTable) {
    throw new Error("Could not load the PDF table renderer (jspdf-autotable).");
  }

  const doc = new jsPDF();
  const generatedAt = new Date();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentBottom = pageH - 16;
  const continuationStartY = 26;

  const generatedLabel = new Intl.DateTimeFormat("en-PH", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(generatedAt);

  const sourceLabel = isSample
    ? "Sample dataset (synthetic student records - demonstration data)"
    : "Live student records";
  const scopeLabel = isSample ? "the sample dataset" : "the current records";
  const filterSummary = options.filterSummary || "";

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
  const titleLines = doc.splitTextToSize(meta.title, pageW - margin * 2);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 5.5 + 0.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(`Generated: ${generatedLabel}`, margin, y);
  y += 4.2;
  doc.text(`Data source: ${sourceLabel}`, margin, y);
  y += 4.2;
  if (filterSummary) {
    doc.setFont("helvetica", "bold");
    const filterLines = doc.splitTextToSize(
      `Filters applied: ${filterSummary}`,
      pageW - margin * 2,
    );
    doc.text(filterLines, margin, y);
    doc.setFont("helvetica", "normal");
    y += filterLines.length * 4.2;
  }
  if (isSample) {
    doc.setTextColor(180, 83, 9);
    doc.text(
      "Demonstration output generated in the browser - not official GAD statistics.",
      margin,
      y,
    );
    doc.setTextColor(0);
    y += 4.2;
  }
  y += 2;

  function startNewPage() {
    doc.addPage();
    y = continuationStartY;
  }

  function ensureSpace(needed) {
    if (y + needed > contentBottom) startNewPage();
  }

  function drawSectionHeading(text, size = 10) {
    ensureSpace(size + 26);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, pageW - margin * 2);
    doc.text(lines, margin, y);
    doc.setFont("helvetica", "normal");
    y += lines.length * (size * 0.42) + 2.5;
  }

  function drawParagraph(text, size = 8.5) {
    ensureSpace(size + 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, pageW - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * (size * 0.42) + 3;
  }

  function drawBullets(items) {
    items.forEach((item) => {
      const lines = doc.splitTextToSize(item, pageW - margin * 2 - 5);
      ensureSpace(lines.length * 4.2 + 2);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text("-", margin, y);
      doc.text(lines, margin + 4, y);
      y += lines.length * 4.2 + 1.2;
    });
    y += 2;
  }

  function drawTable({ head, body }, emptyLabel = "No data available.") {
    if (!body || !body.length) {
      drawParagraph(emptyLabel);
      return;
    }
    autoTable(doc, {
      startY: y,
      head: [head],
      body,
      styles: { fontSize: 8, cellPadding: 1.5 },
      headStyles: {
        fillColor: [33, 150, 243],
        textColor: 255,
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [244, 246, 250] },
      margin: { top: continuationStartY, bottom: 18, left: margin, right: margin },
      didParseCell: (cellData) => {
        if (cellData.section !== "body") return;
        const rowLabel = Array.isArray(cellData.row.raw)
          ? String(cellData.row.raw[0])
          : "";
        if (/^(total|average)/i.test(rowLabel)) {
          cellData.cell.styles.fontStyle = "bold";
          cellData.cell.styles.fillColor = [228, 232, 238];
        }
        if (cellData.column.index > 0) cellData.cell.styles.halign = "center";
      },
    });
    y = (doc.lastAutoTable?.finalY || y) + 7;
  }

  function drawSection(title, table) {
    drawSectionHeading(title);
    drawTable(table);
  }

  const equity = equityRows(dataset);
  const overallPctFemale =
    totals.pctFemale != null
      ? totals.pctFemale
      : pctOf(totals.Female || 0, totals.total || 0);
  const gapContext = {
    overallPctFemale,
    overallTotal: totals.total || 0,
    scopeLabel,
  };

  /* ─ Report 1: student gender profile ──────────────────────────────────── */
  function drawStudentProfileReport() {
    drawSectionHeading("Student Population Summary");
    drawTable(buildSexSummaryTable(totals));

    drawSection(
      "Students by Academic Level and Sex",
      buildSexTable(dataset.byLevel, "level", "Academic Level"),
    );
    drawSection(
      "Students by Year Level and Sex",
      buildSexTable(dataset.byYearLevel, "year_level", "Year Level"),
    );
    drawSection(
      "Students by College / Unit and Sex",
      buildSexTable(dataset.byCollege, "college", "College / Unit"),
    );
    drawSection(
      "Equity Group / Student Type Profile",
      buildSexTable(equity.items, equity.nameKey, "Equity Group"),
    );

    drawSectionHeading("Key Observations");
    const observations = [
      `Women make up ${fmtPct(overallPctFemale)} of the ${(totals.total || 0).toLocaleString()} students in ${scopeLabel}.`,
    ];
    const colleges = rows(dataset.byCollege).filter(
      (row) => rowTotal(row) >= MIN_GROUP_FOR_FINDINGS,
    );
    if (colleges.length) {
      const largest = [...colleges].sort((a, b) => rowTotal(b) - rowTotal(a))[0];
      observations.push(
        `Largest college by enrollment: ${largest.college} with ${rowTotal(largest).toLocaleString()} students (${fmtPct(largest.pctFemale != null ? largest.pctFemale : pctOf(largest.Female || 0, rowTotal(largest)))} female).`,
      );
      const mostFemale = [...colleges].sort((a, b) => b.pctFemale - a.pctFemale)[0];
      const mostMale = [...colleges].sort((a, b) => a.pctFemale - b.pctFemale)[0];
      observations.push(
        `Highest female share: ${mostFemale.college} (${fmtPct(mostFemale.pctFemale)}).`,
      );
      observations.push(
        `Lowest female share: ${mostMale.college} (${fmtPct(mostMale.pctFemale)}).`,
      );
    }
    const programs = rows(dataset.byProgram);
    if (programs.length) {
      const biggest = [...programs].sort((a, b) => rowTotal(b) - rowTotal(a))[0];
      observations.push(
        `Largest program: ${biggest.program} with ${rowTotal(biggest).toLocaleString()} students (${fmtPct(biggest.pctFemale != null ? biggest.pctFemale : pctOf(biggest.Female || 0, rowTotal(biggest)))} female).`,
      );
    }
    if ((totals.Other || 0) > 0) {
      observations.push(
        `${(totals.Other || 0).toLocaleString()} student(s) (${fmtPct(totals.pctOther != null ? totals.pctOther : pctOf(totals.Other || 0, totals.total || 0))}) are recorded as non-binary / other gender identity.`,
      );
    }
    drawBullets(observations);
  }

  /* ─ Report 2: enrollment by program ───────────────────────────────────── */
  function drawEnrollmentByProgramReport() {
    drawParagraph(
      "Enrollment headcounts are disaggregated by sex. The programs table lists the ten largest programs in the current dataset; college and year-level tables give the full distribution.",
    );

    drawSectionHeading("Student Population Summary");
    drawTable(buildSexSummaryTable(totals));

    drawSection(
      "Enrollment by Program and Sex (top 10)",
      buildSexTable(dataset.byProgram, "program", "Program"),
    );
    drawSection(
      "Enrollment by College / Unit and Sex",
      buildSexTable(dataset.byCollege, "college", "College / Unit"),
    );
    drawSection(
      "Enrollment by Year Level and Sex",
      buildSexTable(dataset.byYearLevel, "year_level", "Year Level"),
    );
    drawSection(
      "Enrollment by Academic Level and Sex",
      buildSexTable(dataset.byLevel, "level", "Academic Level"),
    );

    drawSectionHeading("Program Findings");
    const programs = buildGapEntries(dataset.byProgram, "program");
    const findings = [];
    const substantive = programs.filter((e) => e.total >= MIN_GROUP_FOR_FINDINGS);
    if (substantive.length) {
      const largest = [...substantive].sort((a, b) => b.total - a.total)[0];
      findings.push(
        `Largest program: ${largest.label} with ${largest.total.toLocaleString()} students (${fmtPct(largest.pctFemale)} female, ${fmtGap(largest.gapPp)}).`,
      );
      const widest = [...substantive].sort(
        (a, b) => Math.abs(b.gapPp) - Math.abs(a.gapPp),
      )[0];
      findings.push(
        `Most sex-segregated program: ${widest.label} at ${fmtGap(widest.gapPp)} (${widest.interpretation.toLowerCase()}).`,
      );
      const closest = [...substantive].sort(
        (a, b) => Math.abs(a.gapPp) - Math.abs(b.gapPp),
      )[0];
      findings.push(
        `Closest to parity: ${closest.label} at ${fmtGap(closest.gapPp)}.`,
      );
      const femalePrograms = substantive.filter((e) => e.pctFemale >= 60);
      const malePrograms = substantive.filter((e) => e.pctFemale <= 40);
      findings.push(
        `Of the ${substantive.length} programs with ${MIN_GROUP_FOR_FINDINGS}+ students, ${femalePrograms.length} are at least 60% female and ${malePrograms.length} are at least 60% male.`,
      );
    }
    const collegeEntries = buildGapEntries(dataset.byCollege, "college");
    const collegeSpread = collegeEntries.filter(
      (e) => e.total >= MIN_GROUP_FOR_FINDINGS,
    );
    if (collegeSpread.length > 1) {
      const sorted = [...collegeSpread].sort((a, b) => b.pctFemale - a.pctFemale);
      findings.push(
        `Across colleges, the female share ranges from ${fmtPct(sorted[sorted.length - 1].pctFemale)} in ${sorted[sorted.length - 1].label} to ${fmtPct(sorted[0].pctFemale)} in ${sorted[0].label}.`,
      );
    }
    drawBullets(
      findings.length ? findings : ["No program breakdown available for this filter."],
    );
  }

  /* ─ Report 3: gender gap analysis ─────────────────────────────────────── */
  function drawGenderGapReport() {
    const collegeEntries = buildGapEntries(dataset.byCollege, "college");
    const programEntries = buildGapEntries(dataset.byProgram, "program");
    const yearEntries = buildGapEntries(dataset.byYearLevel, "year_level");
    const equityEntries = buildGapEntries(equity.items, equity.nameKey);

    drawParagraph(
      "The gender gap is measured in percentage points (pp) as % Female minus % Male. " +
        "A positive value means women are the larger group; a gap within 5 pp is treated as near parity. " +
        `Groups with fewer than ${MIN_GROUP_FOR_FINDINGS} students are listed but excluded from the findings below, since small groups swing wildly.`,
    );

    drawSection(
      "Gender Gap by College / Unit",
      gapTableFromEntries(collegeEntries, "College / Unit"),
    );
    drawSection(
      "Gender Gap by Program (top 10)",
      gapTableFromEntries(programEntries, "Program"),
    );
    drawSection(
      "Gender Gap by Year Level",
      gapTableFromEntries(yearEntries, "Year Level"),
    );
    drawSection(
      "Gender Gap by Equity Group",
      gapTableFromEntries(equityEntries, "Equity Group"),
    );

    drawSectionHeading("Key Findings");
    const findings = buildGapFindings(collegeEntries, {
      ...gapContext,
      categories: collegeEntries,
    });
    const widestProgram = [...programEntries]
      .filter((e) => e.total >= MIN_GROUP_FOR_FINDINGS)
      .sort((a, b) => Math.abs(b.gapPp) - Math.abs(a.gapPp))[0];
    if (widestProgram) {
      findings.push(
        `Most sex-segregated program: ${widestProgram.label} at ${fmtGap(widestProgram.gapPp)} (${widestProgram.interpretation.toLowerCase()}).`,
      );
    }
    const gapsByCollege = collegeEntries.filter(
      (e) => e.total >= MIN_GROUP_FOR_FINDINGS,
    );
    if (gapsByCollege.length) {
      const widestCollege = [...gapsByCollege].sort(
        (a, b) => Math.abs(b.gapPp) - Math.abs(a.gapPp),
      )[0];
      findings.push(
        `Widest college-level gap: ${widestCollege.label} at ${fmtGap(widestCollege.gapPp)} (${widestCollege.interpretation.toLowerCase()}).`,
      );
    }
    drawBullets(findings);
  }

  /* ─ Report 4: intersectional analysis ─────────────────────────────────── */
  function drawIntersectionalReport() {
    drawParagraph(
      "This cross-tabulation reads each equity group (student type) across sex. " +
        '"% Female in Group" is the within-group balance; "% of All Female Students" shows how large the group is among women, ' +
        "which together reveal where particular groups of women are concentrated.",
    );

    drawSection(
      "Sex by Equity Group / Student Type",
      buildIntersectionTable(equity.items, totals, equity.nameKey),
    );
    drawSection(
      "Sex by College / Unit",
      buildIntersectionTable(dataset.byCollege, totals, "college"),
    );
    drawSection(
      "Sex by Academic Level",
      buildIntersectionTable(dataset.byLevel, totals, "level"),
    );
    drawSection(
      "Sex by Year Level",
      buildIntersectionTable(dataset.byYearLevel, totals, "year_level"),
    );

    drawSectionHeading("Intersectional Findings");
    const equityEntries = buildGapEntries(equity.items, equity.nameKey).filter(
      (e) => e.total >= MIN_GROUP_FOR_FINDINGS,
    );
    const findings = [];
    if (equityEntries.length) {
      const largest = [...equityEntries].sort((a, b) => b.total - a.total)[0];
      findings.push(
        `Largest equity group: ${largest.label}, ${largest.total.toLocaleString()} students (${fmtPct(largest.pctFemale)} female, ${fmtGap(largest.gapPp)}).`,
      );
      const mostFemale = [...equityEntries].sort(
        (a, b) => b.pctFemale - a.pctFemale,
      )[0];
      const mostMale = [...equityEntries].sort(
        (a, b) => a.pctFemale - b.pctFemale,
      )[0];
      findings.push(
        `Most female-concentrated group: ${mostFemale.label} (${fmtPct(mostFemale.pctFemale)} female).`,
      );
      findings.push(
        `Most male-concentrated group: ${mostMale.label} (${fmtPct(mostMale.pctFemale)} female).`,
      );
      const femaleShare = totals.Female
        ? [...equityEntries].sort((a, b) => b.Female - a.Female)[0]
        : null;
      if (femaleShare) {
        findings.push(
          `Women are most numerous in ${femaleShare.label}: ${femaleShare.Female.toLocaleString()} female students, ${fmtPct(pctOf(femaleShare.Female, totals.Female))} of all female students in ${scopeLabel}.`,
        );
      }
    } else {
      findings.push("No equity-group breakdown available for this filter.");
    }
    const collegeEntries = buildGapEntries(dataset.byCollege, "college").filter(
      (e) => e.total >= MIN_GROUP_FOR_FINDINGS,
    );
    if (collegeEntries.length) {
      const widest = [...collegeEntries].sort(
        (a, b) => Math.abs(b.gapPp) - Math.abs(a.gapPp),
      )[0];
      findings.push(
        `Sex balance varies most between colleges in ${widest.label} (${fmtGap(widest.gapPp)}).`,
      );
    }
    findings.push(
      `Groups with fewer than ${MIN_GROUP_FOR_FINDINGS} students are excluded from these findings; treat every percentage on a very small group with caution.`,
    );
    drawBullets(findings);
  }
  /* ─ Report 5: comparative multi-year ──────────────────────────────────── */
  function drawMultiYearReport() {
    const years = rows(dataset.byAcademicYear);
    if (!years.length) {
      drawParagraph(
        "No academic-year history is available in the current dataset. Multi-year comparison needs term records (school years), so clear any academic-year or semester filter and try again.",
      );
      return;
    }

    drawParagraph(
      "Each row counts the students enrolled in that academic year; a student who enrolled in several years is counted in each of them, so the yearly figures overlap and are not additive.",
    );

    drawSection(
      "Enrollment by Academic Year and Sex",
      buildYearOverYearTable(years),
    );

    drawSectionHeading("Trend Findings");
    const ordered = [...years].sort((a, b) =>
      String(a?.school_year || "").localeCompare(String(b?.school_year || "")),
    );
    const findings = [];
    const first = ordered[0];
    const last = ordered[ordered.length - 1];
    const firstTotal = rowTotal(first);
    const lastTotal = rowTotal(last);
    const growth = lastTotal - firstTotal;
    const growthPct = firstTotal
      ? Math.round((growth / firstTotal) * 1000) / 10
      : 0;

    findings.push(
      `Enrollment moved from ${firstTotal.toLocaleString()} students in ${first.school_year} to ${lastTotal.toLocaleString()} in ${last.school_year} (${growth >= 0 ? "+" : ""}${growth.toLocaleString()} students, ${growth >= 0 ? "+" : ""}${growthPct}%).`,
    );

    const pctList = ordered.map((row) => ({
      year: row.school_year,
      pct:
        row.pctFemale != null ? row.pctFemale : pctOf(row.Female || 0, rowTotal(row)),
    }));
    if (pctList.length > 1) {
      const mostFemale = [...pctList].sort((a, b) => b.pct - a.pct)[0];
      const leastFemale = [...pctList].sort((a, b) => a.pct - b.pct)[0];
      findings.push(
        `Highest female share: ${mostFemale.year} at ${fmtPct(mostFemale.pct)}.`,
      );
      findings.push(
        `Lowest female share: ${leastFemale.year} at ${fmtPct(leastFemale.pct)}.`,
      );
      const shift =
        Math.round((pctList[pctList.length - 1].pct - pctList[0].pct) * 10) / 10;
      const direction =
        Math.abs(shift) <= 5
          ? "essentially stable"
          : shift > 0
            ? "moving toward more women"
            : "moving toward more men";
      findings.push(
        `The female share has shifted ${fmtGap(shift)} between ${pctList[0].year} and ${pctList[pctList.length - 1].year} (${direction}).`,
      );
    }

    let biggestJump = null;
    for (let i = 1; i < ordered.length; i += 1) {
      const delta = rowTotal(ordered[i]) - rowTotal(ordered[i - 1]);
      if (!biggestJump || Math.abs(delta) > Math.abs(biggestJump.delta)) {
        biggestJump = { year: ordered[i].school_year, delta };
      }
    }
    if (biggestJump) {
      findings.push(
        `Largest single-year change: ${biggestJump.year} (${biggestJump.delta >= 0 ? "+" : ""}${biggestJump.delta.toLocaleString()} students).`,
      );
    }
    drawBullets(findings);
  }

  if (kind === STUDENT_REPORT_KINDS.STUDENT_PROFILE) {
    drawStudentProfileReport();
  } else if (kind === STUDENT_REPORT_KINDS.ENROLLMENT_PROGRAM) {
    drawEnrollmentByProgramReport();
  } else if (kind === STUDENT_REPORT_KINDS.GENDER_GAP) {
    drawGenderGapReport();
  } else if (kind === STUDENT_REPORT_KINDS.INTERSECTIONAL) {
    drawIntersectionalReport();
  } else if (kind === STUDENT_REPORT_KINDS.MULTI_YEAR) {
    drawMultiYearReport();
  } else {
    drawStudentProfileReport();
  }

  /* ─ Page footers and continuation headers ─────────────────────────────── */
  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    if (page > 1) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(meta.title, margin, 9);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(isSample ? "Sample data" : "Live data", margin, 13);
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.2);
      doc.line(margin, 15.5, pageW - margin, 15.5);
    }
    doc.setFontSize(7.5);
    doc.setTextColor(110);
    doc.text(generatedLabel, margin, pageH - 8);
    if (isSample) {
      doc.text("Sample data - demonstration only", margin, pageH - 4.5);
    }
    doc.text(`Page ${page} of ${totalPages}`, pageW - margin, pageH - 8, {
      align: "right",
    });
    doc.setTextColor(0);
    doc.setDrawColor(0);
  }

  return doc;
}

/** Build a student report and immediately save it to the downloads folder. */
export async function downloadStudentQuickReport(kind, data, options = {}) {
  const doc = await generateStudentQuickReport(kind, data, options);
  doc.save(studentReportFilename(kind, options.isSample));
  return doc;
}
