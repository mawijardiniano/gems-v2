/* PDF builders for the GAD Projects Milestone Progress Report served by
   /api/reports/gpb-progress. Deliberately free of database and Next.js
   imports so the layout can be unit-tested and previewed from plain Node. */
import { jsPDF } from "jspdf";
import autoTableModule from "jspdf-autotable";
import {
  M,
  QUARTER_LABELS,
  academicYearLabel,
  dateQuarter,
  drawFooter,
  drawReportTitle,
  fmtDate,
  quarterEndDate,
  toDate,
} from "./reportQuarters.js";

/* jspdf-autotable ships as a UMD/CJS bundle: depending on the runtime the
   exported table function can arrive as the namespace itself, as `default`, or
   as `default.default` (Node's ESM interop), so probe for the callable one —
   the same shim the browser quick reports use. */
const autoTable =
  [
    autoTableModule?.default?.default,
    autoTableModule?.default,
    autoTableModule,
  ].find((candidate) => typeof candidate === "function") || null;

if (!autoTable) {
  throw new Error("Could not load the PDF table renderer (jspdf-autotable).");
}

function fieldValue(field) {
  if (!field) return "";
  if (typeof field === "object" && !Array.isArray(field) && "value" in field) {
    return field.value ?? "";
  }
  return field;
}

function fieldList(field) {
  const v = fieldValue(field);
  if (Array.isArray(v)) return v.filter(Boolean);
  if (v) return [v];
  return [];
}

/* GAD activity titles and their descriptions share the single GAD ACTIVITY
   column: every activity prints its title with the description on the line
   below it, so the report never grows a column the official form doesn't
   have. Descriptions are index-paired with the titles and may be missing on
   projects filed before the field existed. */
function activityLines(project) {
  const titles = fieldList(project.gad_activity);
  const descriptions = fieldList(project.gad_activity_description);

  return titles
    .map((title, idx) => {
      const description = descriptions[idx];
      return description ? `${title}\n${description}` : title;
    })
    .join("\n");
}

const PROJECT_TYPE_ORDER = {
  "Client Focused": 0,
  "Organization Focused": 1,
  "Attributed Program": 2,
  Uncategorized: 3,
};

function projectTypeLabel(project) {
  const rawType = project?.project_type;
  const value =
    rawType && typeof rawType === "object" ? rawType.value : rawType;
  if (value === "Client Focused") return "Client Focused";
  if (value === "Organization Focused") return "Organization Focused";
  if (value === "Attributed Program") return "Attributed Program";
  return "Uncategorized";
}

const PROJECT_STATUSES = ["for-review", "ongoing", "completed"];

function projectStatus(project) {
  return PROJECT_STATUSES.includes(project?.project_status)
    ? project.project_status
    : "for-review";
}

function statusLabel(status) {
  if (status === "completed") return "Completed";
  if (status === "ongoing") return "Ongoing";
  return "For Review";
}

/* Milestones use their own enum (pending/ongoing/completed) — "pending" must
   never fall through to the project-status "For Review" label. */
function milestoneStatusLabel(status) {
  if (status === "completed") return "Completed";
  if (status === "ongoing") return "Ongoing";
  return "Pending";
}

/* Milestones are only counted when they carry a title — same rule as the
   monitoring page, so the report can never disagree with the on-screen table. */
function getMilestones(project) {
  return (Array.isArray(project?.milestones) ? project.milestones : []).filter(
    (m) => m && String(m.title || "").trim(),
  );
}

function countMilestoneList(list) {
  const completed = list.filter((m) => m.status === "completed").length;
  const ongoing = list.filter((m) => m.status === "ongoing").length;
  const pending = list.filter((m) => m.status === "pending").length;
  return {
    total: list.length,
    completed,
    ongoing,
    pending,
    percent: list.length ? Math.round((completed / list.length) * 100) : 0,
  };
}

function countMilestones(project) {
  return countMilestoneList(getMilestones(project));
}

/* A milestone belongs to the quarter of its target date; when no target was
   set we fall back to the actual date so the milestone is still reported. */
function milestoneDate(milestone) {
  return toDate(milestone?.target_date) || toDate(milestone?.actual_date);
}

function actualMilestoneDate(milestone) {
  return toDate(milestone?.actual_date);
}

/* A milestone belongs to the calendar quarter of its date (target date first,
   actual date as fallback). Projects are already scoped to one academic year —
   AY {year}-{year+1}, which spans two calendar years — so a milestone dated
   Jan-May of year+1 still counts as Q1/Q2 instead of being dropped. */
function milestoneQuarter(milestone) {
  return dateQuarter(milestoneDate(milestone));
}

function milestonesForQuarter(project, quarter) {
  return getMilestones(project).filter(
    (milestone) => milestoneQuarter(milestone) === quarter,
  );
}

/* Each milestone is judged against the quarter end of its own calendar year,
   because the selected academic year spans two of them. */
function milestoneDueDate(milestone) {
  const date = milestoneDate(milestone);
  const quarter = dateQuarter(date);
  if (!date || !quarter) return null;
  return quarterEndDate(date.getUTCFullYear(), quarter);
}

const MILESTONE_STATUS_COLORS = {
  Completed: [5, 150, 105],
  Ongoing: [37, 99, 235],
  Pending: [107, 114, 128],
  /* Project statuses share the same color language; "For Review" is amber. */
  "For Review": [180, 83, 9],
};

/* ── Project summary band ───────────────────────────────────────────────────
   The project header used to be two full-width rows of running text
   ("REF — activity", then "Status: … Progress: …"), which read like a
   sentence. The band below splits that into labelled cells and a milestone
   stat row, so the numbers are readable at a glance. Shared by the per-project
   and quarterly reports. */

/**
 * Draws the project header band and the milestone stat row.
 * `extraRows` adds further label/value pairs under the activity (the quarterly
 * report uses it for the project type and progress scope). Returns the Y
 * position below the band.
 */
function drawProjectSummary(doc, project, counts, usableWidth, y, extraRows = []) {
  const status = statusLabel(projectStatus(project));
  const activity = activityLines(project) || "Untitled activity";

  const labelCell = (content) => ({
    content,
    styles: { fillColor: [240, 240, 240], fontStyle: "bold", fontSize: 7.5 },
  });

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    theme: "grid",
    styles: { font: "times", cellPadding: 2, lineWidth: 0.1 },
    columnStyles: {
      0: { cellWidth: 34 },
      1: { cellWidth: usableWidth - 34 },
    },
    body: [
      [
        labelCell("REFERENCE NO."),
        {
          content: String(project.reference_number || "—"),
          styles: { fontStyle: "bold", fontSize: 9 },
        },
      ],
      [
        labelCell("GAD ACTIVITY"),
        { content: activity, styles: { fontSize: 8.5 } },
      ],
      ...extraRows.map(([label, value]) => [
        labelCell(label),
        { content: value, styles: { fontSize: 8.5 } },
      ]),
    ],
  });

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 1,
    margin: { left: M, right: M },
    theme: "grid",
    styles: {
      font: "times",
      fontSize: 8.5,
      cellPadding: 1.8,
      halign: "center",
      lineWidth: 0.1,
    },
    headStyles: {
      font: "times",
      fontSize: 7,
      fontStyle: "bold",
      fillColor: [240, 240, 240],
      textColor: 0,
    },
    head: [
      [
        { content: "STATUS", styles: { halign: "center" } },
        { content: "PROGRESS", styles: { halign: "center" } },
        { content: "COMPLETED", styles: { halign: "center" } },
        { content: "ONGOING", styles: { halign: "center" } },
        { content: "PENDING", styles: { halign: "center" } },
        { content: "MILESTONES", styles: { halign: "center" } },
      ],
    ],
    body: [
      [
        {
          content: status,
          styles: {
            fontStyle: "bold",
            textColor: MILESTONE_STATUS_COLORS[status] || [107, 114, 128],
          },
        },
        { content: `${counts.percent}%`, styles: { fontStyle: "bold" } },
        String(counts.completed),
        String(counts.ongoing),
        String(counts.pending),
        String(counts.total),
      ],
    ],
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 24 },
      2: { cellWidth: 27 },
      3: { cellWidth: 27 },
      4: { cellWidth: 27 },
      5: { cellWidth: usableWidth - 135 },
    },
  });

  return doc.lastAutoTable.finalY + 4;
}

/* Order of the status sub-tables in the per-quarter breakdown report. */
const MILESTONE_STATUS_ORDER = ["completed", "ongoing", "pending"];

const BREAKDOWN_HEAD = [
  [
    { content: "#", styles: { halign: "center" } },
    { content: "REF NO.", styles: { halign: "center" } },
    { content: "GAD ACTIVITY", styles: { halign: "center" } },
    { content: "MILESTONE", styles: { halign: "center" } },
    { content: "TARGET DATE", styles: { halign: "center" } },
    { content: "ACTUAL DATE", styles: { halign: "center" } },
    { content: "PROOFS", styles: { halign: "center" } },
  ],
];

/* Wide column layout for the breakdown tables (landscape legal, ~336mm). */
const BREAKDOWN_COLUMNS = (usableWidth) => ({
  0: { cellWidth: 8, halign: "center" },
  1: { cellWidth: 30 },
  2: { cellWidth: 70 },
  3: { cellWidth: usableWidth - 178 },
  4: { cellWidth: 26, halign: "center" },
  5: { cellWidth: 26, halign: "center" },
  6: { cellWidth: 18, halign: "center" },
});

/* Draws one status sub-table (e.g. "COMPLETED (4)") and returns the next Y
   position together with the milestone counter for the running numbering. */
function drawBreakdownStatusGroup(doc, label, rows, usableWidth, y, startIndex) {
  let counter = startIndex;

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    theme: "grid",
    styles: { font: "times", cellPadding: 1, lineWidth: 0.1 },
    columnStyles: { 0: { cellWidth: usableWidth } },
    body: [
      [
        {
          content: `${label.toUpperCase()} (${rows.length})`,
          styles: {
            fontStyle: "bold",
            fontSize: 8,
            textColor: MILESTONE_STATUS_COLORS[label],
            fillColor: [250, 250, 250],
          },
        },
      ],
    ],
  });

  autoTable(doc, {
    head: BREAKDOWN_HEAD,
    body: rows.map(({ project, milestone }) => {
      counter += 1;
      return [
        String(counter),
        String(project.reference_number || "—"),
        activityLines(project) || "—",
        String(milestone.title || ""),
        fmtDate(milestone.target_date),
        fmtDate(milestone.actual_date),
        String((Array.isArray(milestone.proofs) ? milestone.proofs : []).length),
      ];
    }),
    startY: doc.lastAutoTable.finalY + 1,
    theme: "grid",
    styles: {
      font: "times",
      fontSize: 7.5,
      cellPadding: 1.5,
      valign: "top",
      lineWidth: 0.1,
    },
    headStyles: {
      font: "times",
      fontSize: 7,
      fontStyle: "bold",
      fillColor: [240, 240, 240],
      textColor: 0,
    },
    columnStyles: BREAKDOWN_COLUMNS(usableWidth),
    margin: { left: M, right: M },
  });

  return { y: doc.lastAutoTable.finalY + 4, counter };
}

/* Milestones with neither a target nor an actual date — they belong to no
   quarter, so both quarterly reports list them separately instead of hiding
   work that was encoded on the project. */
function collectUndatedMilestones(projects) {
  const entries = projects
    .map((project) => ({
      project,
      list: getMilestones(project).filter(
        (milestone) => !milestoneDate(milestone),
      ),
    }))
    .filter((entry) => entry.list.length > 0);

  return {
    entries,
    count: entries.reduce((acc, entry) => acc + entry.list.length, 0),
  };
}

function drawUndatedMilestones(doc, entries, count, usableWidth, y, scopeLabel) {
  const pageHeight = doc.internal.pageSize.getHeight();

  if (y > pageHeight - 40) {
    doc.addPage();
    y = 20;
  }

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    theme: "grid",
    styles: { font: "times", cellPadding: 2, lineWidth: 0.1 },
    columnStyles: { 0: { cellWidth: usableWidth } },
    body: [
      [
        {
          content: `MILESTONES WITHOUT DATES (${count}) — not included in the ${scopeLabel} figures above`,
          styles: {
            fontStyle: "bold",
            fontSize: 9,
            fillColor: [240, 240, 240],
          },
        },
      ],
    ],
  });

  autoTable(doc, {
    head: [
      [
        { content: "PROJECT", styles: { halign: "center" } },
        { content: "MILESTONE", styles: { halign: "center" } },
        { content: "STATUS", styles: { halign: "center" } },
      ],
    ],
    body: entries.flatMap(({ project, list }) =>
      list.map((milestone) => {
        const label = milestoneStatusLabel(milestone.status);
        return [
          String(project.reference_number || "—"),
          String(milestone.title || ""),
          {
            content: label,
            styles: {
              textColor: MILESTONE_STATUS_COLORS[label],
              fontStyle: "bold",
            },
          },
        ];
      }),
    ),
    startY: doc.lastAutoTable.finalY + 1,
    theme: "grid",
    styles: {
      font: "times",
      fontSize: 8,
      cellPadding: 1.6,
      valign: "middle",
      lineWidth: 0.1,
    },
    headStyles: {
      font: "times",
      fontSize: 7.5,
      fontStyle: "bold",
      fillColor: [240, 240, 240],
      textColor: 0,
    },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: usableWidth - 90 },
      2: { cellWidth: 50, halign: "center" },
    },
    margin: { left: M, right: M },
  });
}

const labelStyle = { fillColor: [240, 240, 240], fontStyle: "bold" };
const gridStyle = {
  font: "times",
  fontSize: 8.5,
  cellPadding: 1.8,
  lineWidth: 0.1,
};

function buildOverallReport(projects, year) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "legal" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const usableWidth = pageWidth - 2 * M;

  const cursorY = drawReportTitle(
    doc,
    pageWidth,
    "GAD PROJECTS MILESTONE PROGRESS REPORT",
    year,
  );

  const totals = projects.reduce(
    (acc, project) => {
      const c = countMilestones(project);
      acc.total += c.total;
      acc.completed += c.completed;
      acc.ongoing += c.ongoing;
      acc.pending += c.pending;
      return acc;
    },
    { total: 0, completed: 0, ongoing: 0, pending: 0 },
  );
  totals.percent = totals.total
    ? Math.round((totals.completed / totals.total) * 100)
    : 0;

  autoTable(doc, {
    startY: cursorY,
    margin: { left: M, right: M },
    theme: "grid",
    styles: gridStyle,
    columnStyles: {
      0: { cellWidth: 55 },
      1: { cellWidth: usableWidth - 55 },
    },
    body: [
      [
        { content: "Projects Covered:", styles: labelStyle },
        `${projects.length} project${projects.length !== 1 ? "s" : ""} · ${totals.total} milestones tracked`,
      ],
      [
        { content: "Milestones:", styles: labelStyle },
        `${totals.completed} completed · ${totals.ongoing} ongoing · ${totals.pending} pending`,
      ],
      [
        { content: "Overall Progress:", styles: labelStyle },
        `${totals.percent}%  (completed ÷ total milestones)`,
      ],
    ],
  });

  const body = [];
  let lastType = null;
  projects.forEach((project, index) => {
    const c = countMilestones(project);
    const typeLabel = projectTypeLabel(project);
    if (typeLabel !== lastType) {
      const count = projects.filter(
        (p) => projectTypeLabel(p) === typeLabel,
      ).length;
      body.push([
        {
          content: `${typeLabel.toUpperCase()}  (${count} project${count !== 1 ? "s" : ""})`,
          colSpan: 9,
          styles: { halign: "center", fontStyle: "bold" },
        },
      ]);
      lastType = typeLabel;
    }

    body.push([
      String(index + 1),
      String(project.reference_number || "—"),
      activityLines(project) || "—",
      statusLabel(projectStatus(project)),
      String(c.total),
      String(c.completed),
      String(c.ongoing),
      String(c.pending),
      `${c.percent}%`,
    ]);
  });

  body.push([
    {
      content: "TOTAL",
      colSpan: 4,
      styles: { halign: "right", fontStyle: "bold", fillColor: [248, 248, 248] },
    },
    {
      content: String(totals.total),
      styles: { halign: "center", fontStyle: "bold", fillColor: [248, 248, 248] },
    },
    {
      content: String(totals.completed),
      styles: { halign: "center", fontStyle: "bold", fillColor: [248, 248, 248] },
    },
    {
      content: String(totals.ongoing),
      styles: { halign: "center", fontStyle: "bold", fillColor: [248, 248, 248] },
    },
    {
      content: String(totals.pending),
      styles: { halign: "center", fontStyle: "bold", fillColor: [248, 248, 248] },
    },
    {
      content: `${totals.percent}%`,
      styles: { halign: "center", fontStyle: "bold", fillColor: [248, 248, 248] },
    },
  ]);

  autoTable(doc, {
    head: [
      [
        { content: "#", styles: { halign: "center" } },
        { content: "REF NO.", styles: { halign: "center" } },
        { content: "GAD ACTIVITY", styles: { halign: "center" } },
        { content: "PROJECT STATUS", styles: { halign: "center" } },
        { content: "TOTAL", styles: { halign: "center" } },
        { content: "COMPLETED", styles: { halign: "center" } },
        { content: "ONGOING", styles: { halign: "center" } },
        { content: "PENDING", styles: { halign: "center" } },
        { content: "PROGRESS", styles: { halign: "center" } },
      ],
    ],
    body,
    startY: doc.lastAutoTable.finalY + 6,
    theme: "grid",
    styles: {
      font: "times",
      fontSize: 7.5,
      cellPadding: 1.5,
      valign: "top",
      lineWidth: 0.1,
    },
    headStyles: {
      font: "times",
      fontSize: 7,
      fontStyle: "bold",
      fillColor: [240, 240, 240],
      textColor: 0,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 28 },
      2: { cellWidth: usableWidth - 156 },
      3: { cellWidth: 26, halign: "center" },
      4: { cellWidth: 16, halign: "right" },
      5: { cellWidth: 20, halign: "right" },
      6: { cellWidth: 18, halign: "right" },
      7: { cellWidth: 18, halign: "right" },
      8: { cellWidth: 20, halign: "right" },
    },
    margin: { left: M, right: M },
  });

  drawFooter(doc, pageWidth, pageHeight);
  return Buffer.from(doc.output("arraybuffer"));
}

/* Quarterly milestone progress report: every milestone is grouped into the
   quarter of its target date (actual date when no target is set), so each
   milestone appears in exactly one quarter of the fiscal year. */
function buildQuarterlyReport(projects, year, quarter) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "legal" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const usableWidth = pageWidth - 2 * M;
  const meta = QUARTER_LABELS[quarter];

  let y = drawReportTitle(
    doc,
    pageWidth,
    "GAD PROJECTS MILESTONE PROGRESS REPORT",
    year,
    `${meta.long} (${meta.range}) — ${academicYearLabel(year)}`,
  );

  const sections = projects
    .map((project) => ({
      project,
      list: milestonesForQuarter(project, quarter),
    }))
    .filter((section) => section.list.length > 0);

  const scoped = sections.flatMap((section) => section.list);
  const stats = countMilestoneList(scoped);

  const completedWithDate = scoped.filter(
    (milestone) =>
      milestone.status === "completed" && actualMilestoneDate(milestone),
  );
  const onTime = completedWithDate.filter(
    (milestone) =>
      actualMilestoneDate(milestone).getTime() <=
      milestoneDueDate(milestone).getTime(),
  ).length;
  const late = completedWithDate.length - onTime;
  const missingActual = scoped.filter(
    (milestone) =>
      milestone.status === "completed" && !actualMilestoneDate(milestone),
  ).length;

  /* Milestones with neither a target nor an actual date belong to no quarter —
     they are listed at the end so nothing encoded on the project disappears. */
  const { entries: undated, count: undatedCount } =
    collectUndatedMilestones(projects);

  const excluded = projects.reduce(
    (acc, project) =>
      acc +
      getMilestones(project).length -
      milestonesForQuarter(project, quarter).length,
    0,
  );

  const summary = [
    [
      { content: `${meta.short} Milestones:`, styles: labelStyle },
      `${stats.total} milestone${stats.total === 1 ? "" : "s"} targeted · ${stats.completed} completed · ${stats.ongoing} ongoing · ${stats.pending} pending`,
    ],
    [
      { content: "Quarter Progress:", styles: labelStyle },
      `${stats.percent}%  (completed ÷ milestones targeted in ${meta.short})`,
    ],
    [
      { content: "Delivery:", styles: labelStyle },
      `${onTime} on time · ${late} late · ${missingActual} completed without an actual date`,
    ],
    [
      { content: "On-time rule:", styles: labelStyle },
      "measured against the last day of each milestone's own target quarter",
    ],
    [
      { content: "Coverage:", styles: labelStyle },
      `${sections.length} of ${projects.length} project${projects.length === 1 ? "" : "s"} have milestones targeted in ${meta.short}`,
    ],
  ];

  if (excluded > 0) {
    summary.push([
      { content: "Not counted here:", styles: labelStyle },
      `${excluded} milestone${excluded === 1 ? "" : "s"} targeted in other quarters${undatedCount ? `, plus ${undatedCount} with no date (listed at the end)` : ""}`,
    ]);
  }

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    theme: "grid",
    styles: gridStyle,
    columnStyles: { 0: { cellWidth: 55 }, 1: { cellWidth: usableWidth - 55 } },
    body: summary,
  });

  y = doc.lastAutoTable.finalY + 8;

  if (sections.length === 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      theme: "grid",
      styles: {
        ...gridStyle,
        halign: "center",
        fontStyle: "italic",
        textColor: [120, 120, 120],
      },
      columnStyles: { 0: { cellWidth: usableWidth } },
      body: [
        [
          `No milestones are targeted in ${meta.short} (${meta.range}), FY ${year}.`,
        ],
      ],
    });
  }

  sections.forEach(({ project, list }) => {
    y = drawQuarterProjectSection(doc, project, list, meta, usableWidth, y);
  });

  /* Undated milestones get their own listing so no encoded work is hidden. */
  if (undatedCount > 0) {
    drawUndatedMilestones(doc, undated, undatedCount, usableWidth, y, meta.short);
  }

  drawFooter(doc, pageWidth, pageHeight);
  return Buffer.from(doc.output("arraybuffer"));
}

/* Per-quarter breakdown: one block per quarter (Q1-Q4) listing every milestone
   of the academic year inside its status sub-table, so ongoing and completed
   work is readable quarter by quarter in a single download. */
function buildQuarterBreakdownReport(projects, year) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "legal" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const usableWidth = pageWidth - 2 * M;

  let y = drawReportTitle(
    doc,
    pageWidth,
    "GAD PROJECTS MILESTONE PROGRESS REPORT",
    year,
    `Per-quarter breakdown — ${academicYearLabel(year)}`,
  );

  const { entries: undated, count: undatedCount } =
    collectUndatedMilestones(projects);

  const quarters = [1, 2, 3, 4].map((quarter) => {
    const perProject = projects
      .map((project) => ({
        project,
        list: milestonesForQuarter(project, quarter),
      }))
      .filter((entry) => entry.list.length > 0);

    return {
      quarter,
      meta: QUARTER_LABELS[quarter],
      stats: countMilestoneList(perProject.flatMap((entry) => entry.list)),
      groups: MILESTONE_STATUS_ORDER.map((status) => ({
        status,
        label: milestoneStatusLabel(status),
        rows: perProject.flatMap((entry) =>
          entry.list
            .filter((milestone) => (milestone.status || "pending") === status)
            .map((milestone) => ({ project: entry.project, milestone })),
        ),
      })).filter((group) => group.rows.length > 0),
    };
  });

  const totals = countMilestoneList(
    quarters.flatMap((section) =>
      section.groups.flatMap((group) => group.rows.map((row) => row.milestone)),
    ),
  );

  const boldCell = { fillColor: [248, 248, 248], fontStyle: "bold" };

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    theme: "grid",
    styles: { font: "times", cellPadding: 1.5, lineWidth: 0.1 },
    columnStyles: { 0: { cellWidth: usableWidth } },
    body: [
      [
        {
          content: "QUARTER SUMMARY",
          styles: { fontStyle: "bold", fontSize: 9, fillColor: [240, 240, 240] },
        },
      ],
    ],
  });

  const summaryBody = quarters.map((section) => [
    `${section.meta.short} (${section.meta.range})`,
    String(section.stats.total),
    String(section.stats.completed),
    String(section.stats.ongoing),
    String(section.stats.pending),
    `${section.stats.percent}%`,
  ]);

  summaryBody.push([
    { content: "TOTAL", styles: boldCell },
    { content: String(totals.total), styles: { ...boldCell, halign: "center" } },
    {
      content: String(totals.completed),
      styles: { ...boldCell, halign: "center" },
    },
    { content: String(totals.ongoing), styles: { ...boldCell, halign: "center" } },
    { content: String(totals.pending), styles: { ...boldCell, halign: "center" } },
    { content: `${totals.percent}%`, styles: { ...boldCell, halign: "center" } },
  ]);

  if (undatedCount > 0) {
    summaryBody.push([
      {
        content: `${undatedCount} milestone${undatedCount === 1 ? "" : "s"} without a date ${undatedCount === 1 ? "is" : "are"} listed at the end and not counted above.`,
        colSpan: 6,
        styles: { fontStyle: "italic", textColor: [110, 110, 110] },
      },
    ]);
  }

  autoTable(doc, {
    head: [
      [
        { content: "QUARTER", styles: { halign: "center" } },
        { content: "TARGETED", styles: { halign: "center" } },
        { content: "COMPLETED", styles: { halign: "center" } },
        { content: "ONGOING", styles: { halign: "center" } },
        { content: "PENDING", styles: { halign: "center" } },
        { content: "PROGRESS", styles: { halign: "center" } },
      ],
    ],
    body: summaryBody,
    startY: doc.lastAutoTable.finalY + 1,
    theme: "grid",
    styles: {
      font: "times",
      fontSize: 8,
      cellPadding: 1.6,
      valign: "middle",
      lineWidth: 0.1,
    },
    headStyles: {
      font: "times",
      fontSize: 7.5,
      fontStyle: "bold",
      fillColor: [240, 240, 240],
      textColor: 0,
    },
    columnStyles: {
      0: { cellWidth: 110 },
      1: { cellWidth: 45, halign: "center" },
      2: { cellWidth: 45, halign: "center" },
      3: { cellWidth: 45, halign: "center" },
      4: { cellWidth: 45, halign: "center" },
      5: { cellWidth: usableWidth - 290, halign: "center" },
    },
    margin: { left: M, right: M },
  });

  y = doc.lastAutoTable.finalY + 8;

  quarters.forEach((section) => {
    y = drawQuarterBreakdownSection(doc, section, usableWidth, y);
  });

  if (undatedCount > 0) {
    drawUndatedMilestones(doc, undated, undatedCount, usableWidth, y, "per-quarter");
  }

  drawFooter(doc, pageWidth, doc.internal.pageSize.getHeight());
  return Buffer.from(doc.output("arraybuffer"));
}

function buildPerProjectReport(projects, year) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "legal" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const usableWidth = pageWidth - 2 * M;

  let y = drawReportTitle(
    doc,
    pageWidth,
    "GAD PROJECTS MILESTONE PROGRESS REPORT (PER PROJECT)",
    year,
  );

  projects.forEach((project, projectIndex) => {
    const c = countMilestones(project);
    const list = getMilestones(project);
    const estimatedHeight = 40 + Math.min(list.length, 6) * 7;
    if (projectIndex > 0 && y > pageHeight - estimatedHeight - 20) {
      doc.addPage();
      y = 20;
    }

    y = drawProjectSummary(doc, project, c, usableWidth, y);

    const rows = list.length
      ? list.map((milestone, index) => {
          const label = milestoneStatusLabel(milestone.status);
          return [
            String(index + 1),
            String(milestone.title || ""),
            fmtDate(milestone.target_date),
            fmtDate(milestone.actual_date),
            {
              content: label,
              styles: {
                textColor: MILESTONE_STATUS_COLORS[label],
                fontStyle: "bold",
              },
            },
            String((Array.isArray(milestone.proofs) ? milestone.proofs : []).length),
          ];
        })
      : [
          [
            {
              content: "No milestones encoded yet",
              colSpan: 6,
              styles: {
                halign: "center",
                fontStyle: "italic",
                textColor: [120, 120, 120],
              },
            },
          ],
        ];

    autoTable(doc, {
      head: [
        [
          { content: "#", styles: { halign: "center" } },
          { content: "MILESTONE", styles: { halign: "center" } },
          { content: "TARGET DATE", styles: { halign: "center" } },
          { content: "ACTUAL DATE", styles: { halign: "center" } },
          { content: "STATUS", styles: { halign: "center" } },
          { content: "PROOFS", styles: { halign: "center" } },
        ],
      ],
      body: rows,
      startY: y,
      theme: "grid",
      styles: {
        font: "times",
        fontSize: 8,
        cellPadding: 1.6,
        valign: "middle",
        lineWidth: 0.1,
      },
      headStyles: {
        font: "times",
        fontSize: 7.5,
        fontStyle: "bold",
        fillColor: [240, 240, 240],
        textColor: 0,
      },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: usableWidth - 120 },
        2: { cellWidth: 30, halign: "center" },
        3: { cellWidth: 30, halign: "center" },
        4: { cellWidth: 25, halign: "center" },
        5: { cellWidth: 25, halign: "center" },
      },
      margin: { left: M, right: M },
    });

    y = doc.lastAutoTable.finalY + 10;
  });

  drawFooter(doc, pageWidth, pageHeight);
  return Buffer.from(doc.output("arraybuffer"));
}

/* Project header + milestone table for one project inside the quarterly
   report. Returns the Y position below the table. */
function drawQuarterProjectSection(doc, project, list, meta, usableWidth, y) {
  const c = countMilestoneList(list);
  const pageHeight = doc.internal.pageSize.getHeight();

  if (y > pageHeight - 60) {
    doc.addPage();
    y = 20;
  }

  /* The band's PROGRESS column is scoped to this quarter's milestones — the
     scope row spells that out so it cannot be read as the whole project. */
  y = drawProjectSummary(doc, project, c, usableWidth, y, [
    ["PROJECT TYPE", projectTypeLabel(project)],
    ["PROGRESS SCOPE", `${meta.short} milestones (this quarter)`],
  ]);

  autoTable(doc, {
    head: [
      [
        { content: "#", styles: { halign: "center" } },
        { content: "MILESTONE", styles: { halign: "center" } },
        { content: "TARGET DATE", styles: { halign: "center" } },
        { content: "ACTUAL DATE", styles: { halign: "center" } },
        { content: "STATUS", styles: { halign: "center" } },
        { content: "PROOFS", styles: { halign: "center" } },
      ],
    ],
    body: list.map((milestone, index) => {
      const label = milestoneStatusLabel(milestone.status);
      return [
        String(index + 1),
        String(milestone.title || ""),
        fmtDate(milestone.target_date),
        fmtDate(milestone.actual_date),
        {
          content: label,
          styles: {
            textColor: MILESTONE_STATUS_COLORS[label],
            fontStyle: "bold",
          },
        },
        String((Array.isArray(milestone.proofs) ? milestone.proofs : []).length),
      ];
    }),
    startY: y,
    theme: "grid",
    styles: {
      font: "times",
      fontSize: 8,
      cellPadding: 1.6,
      valign: "middle",
      lineWidth: 0.1,
    },
    headStyles: {
      font: "times",
      fontSize: 7.5,
      fontStyle: "bold",
      fillColor: [240, 240, 240],
      textColor: 0,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: usableWidth - 120 },
      2: { cellWidth: 30, halign: "center" },
      3: { cellWidth: 30, halign: "center" },
      4: { cellWidth: 25, halign: "center" },
      5: { cellWidth: 25, halign: "center" },
    },
    margin: { left: M, right: M },
  });

  return doc.lastAutoTable.finalY + 10;
}

/* One quarter block of the breakdown report: heading plus the status
   sub-tables (completed / ongoing / pending). Returns the next Y position. */
function drawQuarterBreakdownSection(doc, section, usableWidth, y) {
  const pageHeight = doc.internal.pageSize.getHeight();

  if (y > pageHeight - 45) {
    doc.addPage();
    y = 20;
  }

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    theme: "grid",
    styles: { font: "times", cellPadding: 1.5, lineWidth: 0.1 },
    columnStyles: { 0: { cellWidth: usableWidth } },
    body: [
      [
        {
          content: `${section.meta.long.toUpperCase()} (${section.meta.range.toUpperCase()}) — ${section.stats.total} milestone${section.stats.total === 1 ? "" : "s"} targeted · ${section.stats.completed} completed · ${section.stats.ongoing} ongoing · ${section.stats.pending} pending · ${section.stats.percent}% progress`,
          styles: { fontStyle: "bold", fontSize: 9, fillColor: [240, 240, 240] },
        },
      ],
    ],
  });

  let cursor = doc.lastAutoTable.finalY + 1;

  if (section.groups.length === 0) {
    autoTable(doc, {
      startY: cursor,
      margin: { left: M, right: M },
      theme: "grid",
      styles: {
        ...gridStyle,
        halign: "center",
        fontStyle: "italic",
        textColor: [120, 120, 120],
      },
      columnStyles: { 0: { cellWidth: usableWidth } },
      body: [[`No milestones are targeted in ${section.meta.short}.`]],
    });
    return doc.lastAutoTable.finalY + 8;
  }

  let counter = 0;
  section.groups.forEach((group) => {
    const result = drawBreakdownStatusGroup(
      doc,
      group.label,
      group.rows,
      usableWidth,
      cursor,
      counter,
    );
    cursor = result.y;
    counter = result.counter;
  });

  return cursor + 6;
}

/* Groups projects the way every report lists them: by project type, then by
   the order they arrived from the database. */
export function orderProjectsByType(projects) {
  return [...projects]
    .map((project, originalIndex) => ({ project, originalIndex }))
    .sort((a, b) => {
      const byType =
        PROJECT_TYPE_ORDER[projectTypeLabel(a.project)] -
        PROJECT_TYPE_ORDER[projectTypeLabel(b.project)];
      if (byType !== 0) return byType;
      return a.originalIndex - b.originalIndex;
    })
    .map((entry) => entry.project);
}

export {
  buildOverallReport,
  buildPerProjectReport,
  buildQuarterBreakdownReport,
  buildQuarterlyReport,
};
