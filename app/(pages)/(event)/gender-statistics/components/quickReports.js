/* Quick Reports for the Gender Statistics pages.

   The server-side endpoint (/api/analytics/sex-disaggregated-data/report) only
   reads live MongoDB records, so it cannot report on the client-side sample
   datasets (data/sample-*.json). The reports here are therefore rendered in the
   browser — from whatever breakdown is currently on screen — with the same
   jsPDF/jspdf-autotable stack the existing client print helpers use.

   Everything is derived from the data object that the page already has, so the
   helpers work for both the sample dataset and the live API response (they share
   the same shape: totals + byCategory / byPositionLevel / byAcademicRank /
   byAppointment / byOffice / demographics). No network or database access. */

export const REPORT_KINDS = {
  PROFILES: "personnel-profile",
  POSITION_LEVEL: "position-level",
  GENDER_GAP: "gender-gap",
};

const KIND_SLUGS = {
  [REPORT_KINDS.PROFILES]: "faculty-administrative-personnel-profile",
  [REPORT_KINDS.POSITION_LEVEL]: "personnel-by-position-level",
  [REPORT_KINDS.GENDER_GAP]: "gender-gap-analysis-faculty-personnel",
};

const REPORT_META = {
  [REPORT_KINDS.PROFILES]: {
    title: "Faculty and Administrative Personnel Profile",
    label: "Faculty & Admin Personnel Profile",
  },
  [REPORT_KINDS.POSITION_LEVEL]: {
    title: "Personnel by Position Level and Sex",
    label: "Personnel by Position Level",
  },
  [REPORT_KINDS.GENDER_GAP]: {
    title: "Gender Gap Analysis (Faculty and Personnel)",
    label: "Gender Gap Analysis",
  },
};

/* Quick-report buttons offered on the gender statistics pages, in display
   order. One entry per report kind, labelled from REPORT_META so the card and
   the PDF title never drift apart. */
export const QUICK_REPORT_OPTIONS = [
  REPORT_KINDS.PROFILES,
  REPORT_KINDS.POSITION_LEVEL,
  REPORT_KINDS.GENDER_GAP,
].map((kind) => ({
  kind,
  title: REPORT_META[kind].title,
  label: `${REPORT_META[kind].label} (PDF)`,
}));

/* Parity bands, in percentage points, used to label each group. */
const PARITY_BAND = 5;
const LEANING_BAND = 20;

function rowTotal(row) {
  if (typeof row?.total === "number") return row.total;
  return (row?.Female || 0) + (row?.Male || 0) + (row?.Other || 0);
}

/** Percentage rounded to one decimal (0 when the group is empty). */
export function pctOf(part, whole) {
  return whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0;
}

export function fmtPct(value) {
  return `${value}%`;
}

/** Signed percentage-point label, e.g. "+12.4 pp" / "-3 pp". */
export function fmtGap(gapPp) {
  const sign = gapPp > 0 ? "+" : "";
  return `${sign}${gapPp} pp`;
}

/** Plain-language label for a % Female − % Male gap. */
export function interpretGap(gapPp, total) {
  if (!total) return "No data";
  const magnitude = Math.abs(gapPp);
  const femaleLed = gapPp > 0;
  if (magnitude <= PARITY_BAND) return "Near parity";
  if (magnitude <= LEANING_BAND) return femaleLed ? "Female-leaning" : "Male-leaning";
  return femaleLed ? "Female-dominated" : "Male-dominated";
}
/* ── Table builders ────────────────────────────────────────────────────────── */

function hasItems(items) {
  return Array.isArray(items) && items.length > 0;
}

/** Sex-disaggregated body rows (with a computed Total row) for a breakdown. */
export function buildSexTable(items, nameKey, nameHeader = "Category") {
  const safe = hasItems(items) ? items : [];
  const head = [nameHeader, "Female", "Male", "Other", "Total", "% Female"];
  const body = safe.map((row) => {
    const total = rowTotal(row);
    return [
      row?.[nameKey] ?? "Unspecified",
      row?.Female || 0,
      row?.Male || 0,
      row?.Other || 0,
      total,
      fmtPct(row?.pctFemale != null ? row.pctFemale : pctOf(row?.Female || 0, total)),
    ];
  });

  if (body.length) {
    const totals = safe.reduce(
      (acc, row) => ({
        Female: acc.Female + (row?.Female || 0),
        Male: acc.Male + (row?.Male || 0),
        Other: acc.Other + (row?.Other || 0),
        total: acc.total + rowTotal(row),
      }),
      { Female: 0, Male: 0, Other: 0, total: 0 },
    );
    body.push([
      "Total",
      totals.Female,
      totals.Male,
      totals.Other,
      totals.total,
      fmtPct(pctOf(totals.Female, totals.total)),
    ]);
  }

  return { head, body };
}

/** Sex summary (Female / Male / Non-binary / Total) from a totals object. */
export function buildSexSummaryTable(totals = {}) {
  const total = totals.total || 0;
  const female = totals.Female || 0;
  const male = totals.Male || 0;
  const other = totals.Other || 0;
  return {
    head: ["Personnel Group", "Count", "% of Total"],
    body: [
      [
        "Female",
        female,
        fmtPct(totals.pctFemale != null ? totals.pctFemale : pctOf(female, total)),
      ],
      [
        "Male",
        male,
        fmtPct(totals.pctMale != null ? totals.pctMale : pctOf(male, total)),
      ],
      [
        "Non-binary / Other",
        other,
        fmtPct(totals.pctOther != null ? totals.pctOther : pctOf(other, total)),
      ],
      ["Total", total, "100%"],
    ],
  };
}

/** One gender-gap entry per breakdown row (used by tables and findings). */
export function buildGapEntries(items, nameKey) {
  const safe = hasItems(items) ? items : [];
  return safe.map((row) => {
    const total = rowTotal(row);
    const female = row?.Female || 0;
    const male = row?.Male || 0;
    const pctFemale = row?.pctFemale != null ? row.pctFemale : pctOf(female, total);
    const pctMale = pctOf(male, total);
    /* Round the gap so 50/50 groups read as 0 pp, not a stray 0.1 pp. */
    const gapPp = total ? Math.round((pctFemale - pctMale) * 10) / 10 : 0;
    return {
      label: row?.[nameKey] ?? "Unspecified",
      Female: female,
      Male: male,
      Other: row?.Other || 0,
      total,
      pctFemale,
      pctMale,
      gapPp,
      interpretation: interpretGap(gapPp, total),
    };
  });
}

export function gapTableFromEntries(entries, nameHeader = "Category") {
  return {
    head: [
      nameHeader,
      "Female",
      "% Female",
      "Male",
      "% Male",
      "Gap (pp)",
      "Interpretation",
    ],
    body: entries.map((e) => [
      e.label,
      e.Female,
      fmtPct(e.pctFemale),
      e.Male,
      fmtPct(e.pctMale),
      fmtGap(e.gapPp),
      e.interpretation,
    ]),
  };
}

/** Gaps are noisy in very small groups, so findings ignore groups under this. */
export const MIN_GROUP_FOR_FINDINGS = 5;

export function buildGapFindings(entries = [], context = {}) {
  const {
    overallPctFemale = 0,
    overallTotal = 0,
    scopeLabel = "this dataset",
    categories = [],
  } = context;

  if (!entries.length) {
    return ["No breakdown data is available for a gender gap analysis."];
  }

  const findings = [];
  findings.push(
    `Overall, women make up ${fmtPct(overallPctFemale)} of the ${overallTotal.toLocaleString()} personnel in ${scopeLabel} (parity is 50%).`,
  );

  const substantive = entries.filter((e) => e.total >= MIN_GROUP_FOR_FINDINGS);
  if (substantive.length) {
    const widest = [...substantive].sort(
      (a, b) => Math.abs(b.gapPp) - Math.abs(a.gapPp),
    )[0];
    const closest = [...substantive].sort(
      (a, b) => Math.abs(a.gapPp) - Math.abs(b.gapPp),
    )[0];
    const femaleLed = substantive.filter((e) => e.gapPp > 0).length;
    const maleLed = substantive.filter((e) => e.gapPp < 0).length;

    findings.push(
      `Widest gap: ${widest.label} at ${fmtGap(widest.gapPp)} (${widest.interpretation.toLowerCase()}).`,
    );
    findings.push(`Closest to parity: ${closest.label} at ${fmtGap(closest.gapPp)}.`);
    findings.push(
      `Of the ${substantive.length} groups with ${MIN_GROUP_FOR_FINDINGS}+ personnel, ${femaleLed} lean female and ${maleLed} lean male.`,
    );
  }

  const faculty = categories.find((e) => /^faculty/i.test(e.label));
  const admin = categories.find((e) =>
    /administrat|non-?teaching|support staff/i.test(e.label),
  );
  if (faculty && admin) {
    const difference = Math.round((faculty.gapPp - admin.gapPp) * 10) / 10;
    const comparison =
      difference === 0
        ? "at the same female-to-male balance as"
        : difference > 0
          ? `${difference} pp more female-weighted than`
          : `${Math.abs(difference)} pp less female-weighted than`;
    findings.push(
      `Faculty (${fmtGap(faculty.gapPp)}) are ${comparison} administrative personnel (${fmtGap(admin.gapPp)}).`,
    );
  }

  return findings;
}

/* ─ PDF rendering ─────────────────────────────────────────────────────────── */

export function quickReportMeta(kind) {
  return (
    REPORT_META[kind] || {
      title: "Gender Statistics Quick Report",
      label: "Quick Report",
    }
  );
}

export function quickReportFilename(kind, isSample = false) {
  const stamp = new Date().toISOString().slice(0, 10);
  const slug = KIND_SLUGS[kind] || "quick-report";
  return `${slug}${isSample ? "-sample" : ""}-${stamp}.pdf`;
}

/* jsPDF needs a data URL, so the university logo is rasterised through a canvas
   (same approach as the existing attendance-sheet print helper). Shared with the
   student quick reports (./quickReportsStudents.js). */
export function loadLogo() {
  if (typeof window === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext("2d").drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = "/getThemePhoto.png";
  });
}

/**
 * jspdf-autotable ships as a UMD/CJS bundle: depending on the runtime the
 * exported table function can arrive as the namespace itself, as `default`, or
 * as `default.default` (Node's ESM interop), so probe for the callable one.
 */
export function resolveAutoTable(autoTableModule) {
  return (
    [autoTableModule?.default?.default, autoTableModule?.default, autoTableModule].find(
      (candidate) => typeof candidate === "function",
    ) || null
  );
}

/**
 * Build a quick-report PDF from the data already rendered on the page.
 * Returns the jsPDF document so the caller can preview or save it.
 */
export async function generateQuickReport(kind, data, options = {}) {
  const dataset = data || {};
  const isSample = Boolean(options.isSample);
  const meta = quickReportMeta(kind);
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
    ? "Sample dataset (synthetic employee records - demonstration data)"
    : "Live employee records";
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
      /* Logo is decorative — fall back to the text-only header. */
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
        if (rowLabel.toLowerCase() === "total") {
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

  /* ─ Report 1: faculty and administrative personnel profile ─────────────── */
  function drawProfilesReport() {
    drawSectionHeading("Personnel Summary");
    drawTable(buildSexSummaryTable(totals));

    drawSection(
      "Personnel Category and Sex",
      buildSexTable(dataset.byCategory, "category", "Personnel Category"),
    );
    drawSection(
      "Faculty by Academic Rank and Sex",
      buildSexTable(dataset.byAcademicRank, "rank", "Academic Rank"),
    );
    drawSection(
      "Personnel by Appointment Status and Sex",
      buildSexTable(dataset.byAppointment, "status", "Appointment Status"),
    );
    drawSection(
      "Personnel by College / Office and Sex",
      buildSexTable(dataset.byOffice, "office", "College / Office"),
    );
    drawSection(
      "Demographic Profile (Institutional Data)",
      buildSexTable(dataset.demographics, "label", "Demographic Group"),
    );
  }

  /* ─ Report 2: personnel by position level ─────────────────────────────── */
  function drawPositionLevelReport() {
    const levels = buildGapEntries(dataset.byPositionLevel, "level");
    const leadership = levels.filter((e) =>
      /president|vice president|director|dean|chair/i.test(e.label),
    );
    const leadershipTotal = leadership.reduce((sum, e) => sum + e.total, 0);
    const leadershipFemale = leadership.reduce((sum, e) => sum + e.Female, 0);

    drawSectionHeading("Personnel Summary");
    drawTable(buildSexSummaryTable(totals));

    drawSection(
      "Personnel by Position Level and Sex",
      buildSexTable(dataset.byPositionLevel, "level", "Position Level"),
    );

    drawSectionHeading("Observations");
    const observations = [];
    if (leadershipTotal) {
      observations.push(
        `Leadership positions (president, vice presidents, directors, deans, department chairs) account for ${leadershipTotal.toLocaleString()} personnel, ${fmtPct(
          pctOf(leadershipFemale, leadershipTotal),
        )} of them women.`,
      );
    }
    if (levels.length) {
      const largest = [...levels].sort((a, b) => b.total - a.total)[0];
      observations.push(
        `Largest position level: ${largest.label} with ${largest.total.toLocaleString()} personnel (${fmtPct(largest.pctFemale)} female).`,
      );
      const widest = [...levels]
        .filter((e) => e.total >= MIN_GROUP_FOR_FINDINGS)
        .sort((a, b) => Math.abs(b.gapPp) - Math.abs(a.gapPp))[0];
      if (widest) {
        observations.push(
          `Widest sex gap: ${widest.label} at ${fmtGap(widest.gapPp)} (${widest.interpretation.toLowerCase()}).`,
        );
      }
      observations.push(
        `University-wide, women hold ${fmtPct(
          pctOf(totals.Female || 0, totals.total || 0),
        )} of all personnel positions.`,
      );
    }
    drawBullets(
      observations.length ? observations : ["No breakdown data available."],
    );
  }

  /* ─ Report 3: gender gap analysis ─────────────────────────────────────── */
  function drawGenderGapReport() {
    const categoryEntries = buildGapEntries(dataset.byCategory, "category");
    const levelEntries = buildGapEntries(dataset.byPositionLevel, "level");
    const rankEntries = buildGapEntries(dataset.byAcademicRank, "rank");
    const officeEntries = buildGapEntries(dataset.byOffice, "office")
      .filter((e) => e.total >= MIN_GROUP_FOR_FINDINGS)
      .sort((a, b) => b.gapPp - a.gapPp);

    drawParagraph(
      "The gender gap is measured in percentage points (pp) as % Female minus % Male. " +
        `A positive value means women are the larger group; a gap within ${PARITY_BAND} pp is treated as near parity. ` +
        `Groups with fewer than ${MIN_GROUP_FOR_FINDINGS} personnel are listed but excluded from the findings below, since small groups swing wildly.`,
    );

    drawSection(
      "Gender Gap by Personnel Category",
      gapTableFromEntries(categoryEntries, "Personnel Category"),
    );
    drawSection(
      "Gender Gap by Position Level",
      gapTableFromEntries(levelEntries, "Position Level"),
    );
    drawSection(
      "Gender Gap by Academic Rank (Faculty)",
      gapTableFromEntries(rankEntries, "Academic Rank"),
    );
    drawSection(
      `Gender Gap by College / Office (${MIN_GROUP_FOR_FINDINGS}+ personnel, widest female gap first)`,
      gapTableFromEntries(officeEntries, "College / Office"),
    );

    drawSectionHeading("Key Findings");
    drawBullets(
      buildGapFindings(categoryEntries, {
        overallPctFemale:
          totals.pctFemale != null
            ? totals.pctFemale
            : pctOf(totals.Female || 0, totals.total || 0),
        overallTotal: totals.total || 0,
        scopeLabel,
        categories: categoryEntries,
      }),
    );
  }

  if (kind === REPORT_KINDS.PROFILES) {
    drawProfilesReport();
  } else if (kind === REPORT_KINDS.POSITION_LEVEL) {
    drawPositionLevelReport();
  } else {
    drawGenderGapReport();
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

/** Build the report and immediately save it to the user's downloads folder. */
export async function downloadQuickReport(kind, data, options = {}) {
  const doc = await generateQuickReport(kind, data, options);
  doc.save(quickReportFilename(kind, options.isSample));
  return doc;
}
