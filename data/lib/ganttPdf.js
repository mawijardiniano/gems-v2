/*
 * PDF builder for the project Gantt chart (header + activities table + Jan–Dec
 * timeline). Deliberately free of database and Next.js imports so the layout
 * can be unit-tested and previewed from plain Node, matching lib/gpbProgressPdf.
 *
 * The timeline is drawn with vector rectangles positioned from the same
 * `timelineLayout()` percentages the on-screen chart uses, so the download can
 * never disagree with the page.
 */
import { calcDurationDays, timelineLayout, timelineYears, toInputDate } from "./gantt.js";

/* Re-exported so a consumer can reason about chart years without a second
   import; the layout itself still lives in lib/gantt.js next to the table. */
export { activityYears, timelineYears } from "./gantt.js";

/* Plan fields are stored wrapped as `{ value }` in MongoDB; unwrap both shapes. */
export function fieldValue(field) {
  if (!field) return "";
  if (typeof field === "object" && !Array.isArray(field) && "value" in field) {
    return field.value ?? "";
  }
  return field;
}

export function fieldList(field) {
  const value = fieldValue(field);
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value) return [value];
  return [];
}

/*
 * GAD projects carry no `title`: the project name lives in `gad_activity`
 * (index-paired with `gad_activity_description`), so a chart that only read
 * `title` printed "(untitled project)". RE/Academic projects do have a title,
 * hence the order below. Every extra GAD activity beyond the first is folded
 * into a "(+N more)" marker to keep the header on one or two lines.
 */
export function resolveProjectTitle(project) {
  const own = String(fieldValue(project?.title) ?? "").trim();
  if (own) return own;

  const activities = fieldList(project?.gad_activity)
    .map((item) => String(item ?? "").trim())
    .filter(Boolean);
  if (activities.length > 0) {
    const [first, ...rest] = activities;
    return rest.length > 0 ? `${first} (+${rest.length} more)` : first;
  }

  const name = String(project?.name ?? "").trim();
  return name || "(untitled project)";
}

/** `Gantt-GPB-2031-002-2025.pdf`; falls back to the project name then "project". */
export function ganttPdfFilename(project, year) {
  const name = resolveProjectTitle(project);
  const token =
    String(project?.reference_number ?? "").trim() ||
    /* An unnamed project must not stamp "(untitled project)" into the file. */
    (name === "(untitled project)" ? "" : name) ||
    "project";
  const safe = token
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return `Gantt-${safe || "project"}-${year || "chart"}.pdf`;
}

export const fmtGanttDate = (value) => {
  const iso = toInputDate(value);
  if (!iso) return "-";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

/** Year shown on the timeline: first activity start, else project start/year. */
export function pickGanttYear(project, activities) {
  const first = (activities || []).find((a) => toInputDate(a.start_date));
  const iso =
    (first && toInputDate(first.start_date)) || toInputDate(project?.start_date);
  if (iso) return Number(iso.slice(0, 4));
  return Number(project?.year) || new Date().getFullYear();
}

/** Earliest start / latest end across the activities (either may be missing). */
export function activitySpan(activities) {
  const starts = (activities || [])
    .map((a) => toInputDate(a.start_date))
    .filter(Boolean);
  const ends = (activities || [])
    .map((a) => toInputDate(a.end_date))
    .filter(Boolean);
  if (starts.length === 0 && ends.length === 0) return null;
  return {
    start: starts.length > 0 ? starts.sort()[0] : "",
    end: ends.length > 0 ? ends.sort().at(-1) : "",
  };
}

/** Only rows that carry an activity name are charted — same rule as the page. */
export function ganttRows(project) {
  return Array.isArray(project?.gantt_activities)
    ? project.gantt_activities.filter(
        (a) => a && String(a.activity || "").trim(),
      )
    : [];
}

/*
 * jspdf-autotable ships as a UMD/CJS bundle: depending on the runtime the
 * exported table function can arrive as the namespace itself, as `default`, or
 * as `default.default` (Node's ESM interop), so probe for the callable one —
 * the same shim lib/gpbProgressPdf uses.
 */
export function resolveAutoTable(module) {
  return (
    [module?.default?.default, module?.default, module].find(
      (candidate) => typeof candidate === "function",
    ) || null
  );
}

/** Landscape A4 page metrics shared by every section of the chart. */
export const PAGE = { margin: 10 };

const HEADER_TOP = 12;

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** University letterhead, centred, with the logo on the left third. */
function drawLetterhead(pdf, logoDataUrl) {
  const pageWidth = pdf.internal.pageSize.getWidth();

  if (logoDataUrl) {
    try {
      const logoWidth = 20;
      const logoX = (pageWidth / 3 - logoWidth) / 2;
      pdf.addImage(logoDataUrl, "PNG", logoX, HEADER_TOP, logoWidth, 20);
    } catch {
      /* A broken logo must never stop the report from being produced. */
    }
  }

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.text("MARINDUQUE STATE UNIVERSITY", pageWidth / 2, HEADER_TOP + 7, {
    align: "center",
  });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.text("Gender and Development Unit", pageWidth / 2, HEADER_TOP + 13, {
    align: "center",
  });

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text("PROJECT GANTT CHART", pageWidth / 2, HEADER_TOP + 20, {
    align: "center",
  });

  const lineY = HEADER_TOP + 24;
  pdf.setDrawColor(17, 24, 39);
  pdf.setLineWidth(0.6);
  pdf.line(PAGE.margin, lineY, pageWidth - PAGE.margin, lineY);
  return lineY + 6;
}

/** "Label: value" line with the value wrapped to the page width. */
function drawMetaLine(pdf, y, label, value) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const x = PAGE.margin + 1;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text(label, x, y);
  const labelWidth = pdf.getTextWidth(label);

  pdf.setFont("helvetica", "normal");
  const valueX = x + labelWidth + 1.5;
  const wrapped = pdf.splitTextToSize(
    String(value || "-"),
    pageWidth - PAGE.margin - valueX,
  );
  pdf.text(wrapped, valueX, y);
  return y + 4.6 * Math.max(wrapped.length, 1);
}



/**
 * Main layout: letterhead, meta block, activities table, then the Jan–Dec
 * timeline. `jsPDF` is injected so this file stays importable from plain Node
 * (the caller resolves the real class through a dynamic import).
 */
export function buildGanttPdf({
  jsPDF,
  project,
  activities,
  autoTable,
  logoDataUrl,
}) {
  if (typeof jsPDF !== "function") {
    throw new Error("jsPDF was not provided to buildGanttPdf().");
  }
  if (typeof autoTable !== "function") {
    throw new Error("Could not load the PDF table renderer (jspdf-autotable).");
  }
  /* An empty chart would produce a header with no rows — refuse instead. */
  const rows = Array.isArray(activities) ? activities : ganttRows(project);
  if (rows.length === 0) {
    throw new Error("No Gantt activities to export.");
  }

  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const title = resolveProjectTitle(project);
  const reference = String(project?.reference_number ?? "").trim();
  const year = pickGanttYear(project, rows);
  const years = timelineYears(rows, year);
  const offices = fieldList(project?.responsible_office).join(", ");
  const span = activitySpan(rows);
  const printedAt = new Date().toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  let y = drawLetterhead(pdf, logoDataUrl);
  y = drawMetaLine(pdf, y, "Project:", title);
  y = drawMetaLine(
    pdf,
    y,
    "Reference No. / Year:",
    `${reference || "-"}   |   ${year}`,
  );
  y = drawMetaLine(pdf, y, "Responsible Office:", offices);
  y = drawMetaLine(
    pdf,
    y,
    "Period Covered:",
    `${
      span
        ? `${fmtGanttDate(span.start)} to ${fmtGanttDate(span.end)}`
        : "-"
    }   |   Activities: ${rows.length}   |   Generated: ${printedAt}`,
  );
  /* The timeline is drawn per calendar year so a project that crosses New Year
     is charted across both instead of being clipped at Dec 31. */
  if (years.length > 1) {
    y = drawMetaLine(
      pdf,
      y,
      "Timeline Years:",
      `${years[0]} - ${years[years.length - 1]}`,
    );
  }

  autoTable(pdf, {
    startY: y + 2,
    head: [
      [
        "#",
        "Activity / Deliverable",
        "Start Date",
        "End Date",
        "Days",
        "Person Responsible",
      ],
    ],
    body: rows.map((row, index) => [
      String(index + 1),
      String(row.activity || ""),
      fmtGanttDate(row.start_date),
      fmtGanttDate(row.end_date),
      String(calcDurationDays(row.start_date, row.end_date) || "-"),
      String(row.person_responsible || "-"),
    ]),
    theme: "grid",
    styles: {
      fontSize: 8,
      cellPadding: 1.6,
      lineColor: [156, 163, 175],
      lineWidth: 0.15,
      textColor: [17, 24, 39],
      valign: "middle",
    },
    headStyles: {
      fillColor: [229, 231, 235],
      textColor: [17, 24, 39],
      fontStyle: "bold",
      halign: "center",
    },
    columnStyles: {
      /* Widths total the 277mm A4-landscape content width so jspdf-autotable
         never has to stretch a column and warn about overflowing content. */
      0: { halign: "center", cellWidth: 10 },
      1: { cellWidth: 100 },
      2: { halign: "center", cellWidth: 31 },
      3: { halign: "center", cellWidth: 31 },
      4: { halign: "center", cellWidth: 16 },
      5: { cellWidth: 89 },
    },
    margin: { left: PAGE.margin, right: PAGE.margin },
  });

  const cursorY = (pdf.lastAutoTable && pdf.lastAutoTable.finalY) || y;
  drawTimeline(pdf, {
    rows,
    years,
    cursorY,
    pageWidth,
    pageHeight,
    printedAt,
  });

  return pdf;
}

/*
 * The Jan-Dec timeline. Each activity gets one lane split into twelve real
 * month columns, and the bar is a filled rectangle placed from the
 * `timelineLayout()` percentages. A project that crosses New Year gets one
 * block per year and a small arrow on the bar edge that continues, so a Q3
 * start that runs into the next year is never silently cut at Dec 31.
 */
function drawTimeline(
  pdf,
  { rows, years, cursorY, pageWidth, pageHeight, printedAt },
) {
  const labelWidth = 62;
  const timelineWidth = pageWidth - PAGE.margin * 2;
  const laneWidth = timelineWidth - labelWidth;
  const monthWidth = laneWidth / 12;
  const laneHeight = 6.4;
  const headHeight = 6;
  const left = PAGE.margin;
  const laneLeft = left + labelWidth;

  /* One title + grid block per year, stacked down the page. */
  years.forEach((year, blockIndex) => {
    const blockHeight = headHeight + laneHeight * rows.length;
    let y = blockIndex === 0 ? cursorY + 6 : cursorY;
    if (blockIndex > 0) y += 8;

    /* A block that cannot fit is pushed to a fresh page. */
    if (y + blockHeight + 10 > pageHeight - 8) {
      pdf.addPage();
      y = 16;
    }

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(55, 65, 81);
    pdf.text(`${year} TIMELINE (JANUARY - DECEMBER)`, left, y);
    y += 3;

    /* Header band: the activity label cell then the twelve month columns. */
    pdf.setDrawColor(156, 163, 175);
    pdf.setLineWidth(0.15);
    pdf.setFillColor(243, 244, 246);
    pdf.rect(left, y, labelWidth, headHeight, "FD");
    pdf.setFontSize(7.5);
    pdf.text("ACTIVITY", left + 2, y + headHeight - 2);

    for (let m = 0; m < 12; m++) {
      const x = laneLeft + m * monthWidth;
      pdf.rect(x, y, monthWidth, headHeight, "FD");
      pdf.text(MONTH_LABELS[m], x + monthWidth / 2, y + headHeight - 2, {
        align: "center",
      });
    }

    let laneY = y + headHeight;
    const layout = timelineLayout(rows, year);

    rows.forEach((row, index) => {
      const bar = layout[index];

      pdf.setDrawColor(203, 213, 225);
      pdf.setLineWidth(0.1);
      pdf.setTextColor(17, 24, 39);

      pdf.setFillColor(255, 255, 255);
      pdf.rect(left, laneY, labelWidth, laneHeight, "FD");
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.5);
      const label = `${index + 1}. ${String(row.activity || "")}`;
      pdf.text(label, left + 2, laneY + laneHeight - 2.2, {
        maxWidth: labelWidth - 4,
      });

      /* Month grid first, so the bar prints over the divider lines. */
      for (let m = 0; m < 12; m++) {
        pdf.rect(laneLeft + m * monthWidth, laneY, monthWidth, laneHeight, "D");
      }

      if (bar) {
        const barX = laneLeft + (bar.left / 100) * laneWidth;
        const barW = Math.max((bar.width / 100) * laneWidth, 1.2);
        pdf.setFillColor(31, 41, 55);
        pdf.rect(barX, laneY + 1.5, barW, laneHeight - 3, "F");

        /* Mark a bar that spills out of this year so it is not read as ended. */
        if (bar.continuesAfter) {
          pdf.setFillColor(31, 41, 55);
          pdf.triangle(
            laneLeft + laneWidth,
            laneY + 1.5,
            laneLeft + laneWidth,
            laneY + laneHeight - 1.5,
            laneLeft + laneWidth + 2.6,
            laneY + laneHeight / 2,
            "F",
          );
        }
        if (bar.continuesBefore) {
          pdf.setFillColor(31, 41, 55);
          pdf.triangle(
            laneLeft,
            laneY + 1.5,
            laneLeft,
            laneY + laneHeight - 1.5,
            laneLeft - 2.6,
            laneY + laneHeight / 2,
            "F",
          );
        }
      } else {
        pdf.setFont("helvetica", "italic");
        pdf.setFontSize(6.5);
        pdf.setTextColor(156, 163, 175);
        pdf.text(`not active in ${year}`, laneLeft + 2, laneY + laneHeight - 2.2);
      }

      laneY += laneHeight;
    });

    /* Frame the whole block so the lanes read as one grid on paper. */
    pdf.setDrawColor(107, 114, 128);
    pdf.setLineWidth(0.25);
    pdf.rect(left, y, timelineWidth, blockHeight, "D");

    cursorY = laneY;
  });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  pdf.setTextColor(107, 114, 128);
  pdf.text(`Generated via GEMS - ${printedAt}`, pageWidth / 2, pageHeight - 5, {
    align: "center",
  });
}
