import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { cacheOrSet } from "@/lib/cache";
import Project from "@/models/projects";
import Event from "@/models/event";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  M,
  QUARTER_LABELS,
  academicYearLabel,
  dateQuarter,
  drawFooter,
  drawReportTitle,
  fmtDate,
  toDate,
} from "@/lib/reportQuarters";

const REPORT_CACHE_TTL = 60 * 1000;

/* Agreed scope: projects that are ongoing or completed, and events that are
   active (ongoing) or completed. For-review projects and cancelled events are
   never listed — only counted in the summary so the totals stay honest. */
const PROJECT_STATUS_ORDER = ["completed", "ongoing"];
const EVENT_STATUS_ORDER = ["completed", "active"];

const PROJECT_STATUS_LABELS = {
  completed: "Completed",
  ongoing: "Ongoing",
};

const EVENT_STATUS_LABELS = {
  completed: "Completed",
  active: "Active (Ongoing)",
};

const STATUS_COLORS = {
  Completed: [5, 150, 105],
  Ongoing: [37, 99, 235],
  "Active (Ongoing)": [37, 99, 235],
};

const PROJECT_TYPE_ORDER = {
  "Client Focused": 0,
  "Organization Focused": 1,
  "Attributed Program": 2,
  Uncategorized: 3,
};

const headingStyle = {
  fontStyle: "bold",
  fontSize: 9,
  fillColor: [240, 240, 240],
};

function fieldValue(field) {
  if (!field) return "";
  if (typeof field === "object" && !Array.isArray(field) && "value" in field) {
    return field.value ?? "";
  }
  return field;
}

function fieldList(field) {
  const value = fieldValue(field);
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value) return [value];
  return [];
}

/* GAD activity titles with their description on the line below, so the report
   keeps the single GAD ACTIVITY column. Descriptions are index-paired with the
   titles and are skipped when a project has none. */
function projectActivity(project) {
  const titles = fieldList(project?.gad_activity);
  const descriptions = fieldList(project?.gad_activity_description);

  return (
    titles
      .map((title, idx) =>
        descriptions[idx] ? `${title}\n${descriptions[idx]}` : title,
      )
      .join("\n") || "Untitled activity"
  );
}

function projectTypeLabel(project) {
  const raw = project?.project_type;
  const value = raw && typeof raw === "object" ? raw.value : raw;
  return PROJECT_TYPE_ORDER[value] !== undefined ? value : "Uncategorized";
}

/* A project belongs to the quarter of its start date. */
function projectDate(project) {
  return toDate(project?.start_date);
}

/* An event belongs to the quarter of its start date; multi-day events fall
   back to the earliest entry of start_dates. */
function eventDate(event) {
  const direct = toDate(event?.start_date);
  if (direct) return direct;
  const list = (Array.isArray(event?.start_dates) ? event.start_dates : [])
    .map(toDate)
    .filter(Boolean);
  if (list.length === 0) return null;
  return new Date(Math.min(...list.map((date) => date.getTime())));
}

/* Last day of a multi-day event, so the table can print the whole span. */
function eventEndDate(event) {
  const direct = toDate(event?.end_date);
  if (direct) return direct;
  const list = (Array.isArray(event?.end_dates) ? event.end_dates : [])
    .map(toDate)
    .filter(Boolean);
  if (list.length === 0) return eventDate(event);
  return new Date(Math.max(...list.map((date) => date.getTime())));
}

function milestoneProgress(project) {
  const list = (
    Array.isArray(project?.milestones) ? project.milestones : []
  ).filter((milestone) => milestone && String(milestone.title || "").trim());
  const completed = list.filter((milestone) => milestone.status === "completed")
    .length;
  return {
    total: list.length,
    completed,
    percent: list.length ? Math.round((completed / list.length) * 100) : 0,
  };
}

function attendedCount(event) {
  return Array.isArray(event?.attended_users) ? event.attended_users.length : 0;
}

/* Wide column layouts (landscape legal, ~336mm usable width). */
const PROJECT_HEAD = [
  [
    { content: "#", styles: { halign: "center" } },
    { content: "REF NO.", styles: { halign: "center" } },
    { content: "GAD ACTIVITY", styles: { halign: "center" } },
    { content: "PROJECT TYPE", styles: { halign: "center" } },
    { content: "START DATE", styles: { halign: "center" } },
    { content: "END DATE", styles: { halign: "center" } },
    { content: "MILESTONE PROGRESS", styles: { halign: "center" } },
  ],
];

const PROJECT_COLUMNS = (usableWidth) => ({
  0: { cellWidth: 8, halign: "center" },
  1: { cellWidth: 30 },
  2: { cellWidth: usableWidth - 175 },
  3: { cellWidth: 45 },
  4: { cellWidth: 26, halign: "center" },
  5: { cellWidth: 26, halign: "center" },
  6: { cellWidth: 40, halign: "center" },
});

const EVENT_HEAD = [
  [
    { content: "#", styles: { halign: "center" } },
    { content: "REF NO.", styles: { halign: "center" } },
    { content: "TITLE", styles: { halign: "center" } },
    { content: "TYPE", styles: { halign: "center" } },
    { content: "VENUE", styles: { halign: "center" } },
    { content: "ORGANIZING OFFICE", styles: { halign: "center" } },
    { content: "START DATE", styles: { halign: "center" } },
    { content: "END DATE", styles: { halign: "center" } },
    { content: "ATTENDED / TARGET", styles: { halign: "center" } },
  ],
];

const EVENT_COLUMNS = (usableWidth) => ({
  0: { cellWidth: 7, halign: "center" },
  1: { cellWidth: 28 },
  2: { cellWidth: 80 },
  3: { cellWidth: 32, halign: "center" },
  4: { cellWidth: 50 },
  5: { cellWidth: 60 },
  6: { cellWidth: 24, halign: "center" },
  7: { cellWidth: 24, halign: "center" },
  8: { cellWidth: usableWidth - 305, halign: "center" },
});

/* Section heading + status sub-table, shared by the projects and events
   sections. Returns the next Y position. */
function drawSectionGroup(doc, { title, head, rows, columns, usableWidth, y }) {
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    theme: "grid",
    styles: { font: "times", cellPadding: 1.5, lineWidth: 0.1 },
    columnStyles: { 0: { cellWidth: usableWidth } },
    body: [[{ content: title, styles: headingStyle }]],
  });

  if (rows.length === 0) {
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 1,
      margin: { left: M, right: M },
      theme: "grid",
      styles: {
        font: "times",
        fontSize: 8,
        halign: "center",
        fontStyle: "italic",
        textColor: [120, 120, 120],
        cellPadding: 1.6,
        lineWidth: 0.1,
      },
      columnStyles: { 0: { cellWidth: usableWidth } },
      body: [["None in this scope."]],
    });
    return doc.lastAutoTable.finalY + 6;
  }

  autoTable(doc, {
    head,
    body: rows,
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
    columnStyles: columns,
    margin: { left: M, right: M },
  });

  return doc.lastAutoTable.finalY + 6;
}

/* Projects & events status report: the projects section and the events section,
   each split into status sub-tables, filtered by the selected quarter. */
function buildStatusReport({ projects, events, year, quarter }) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "legal" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const usableWidth = pageWidth - 2 * M;
  const scopeLabel = quarter
    ? `${QUARTER_LABELS[quarter].short} (${QUARTER_LABELS[quarter].range})`
    : "Full year";

  let y = drawReportTitle(
    doc,
    pageWidth,
    "GAD PROJECTS & EVENTS STATUS REPORT",
    year,
    `${scopeLabel} — ${academicYearLabel(year)}`,
  );

  /* Scope: ongoing/completed projects and active/completed events only. */
  const activeProjects = projects.filter((project) =>
    PROJECT_STATUS_ORDER.includes(project?.project_status),
  );
  const activeEvents = events.filter((event) =>
    EVENT_STATUS_ORDER.includes(event?.status),
  );
  const excludedProjects = projects.length - activeProjects.length;
  const excludedEvents = events.length - activeEvents.length;

  const projectRows = activeProjects.map((project) => ({
    project,
    date: projectDate(project),
  }));
  const eventRows = activeEvents.map((event) => ({
    event,
    date: eventDate(event),
  }));

  const dateInScope = (date) =>
    Boolean(date) && (!quarter || dateQuarter(date) === quarter);

  const scopedProjects = projectRows.filter((row) => dateInScope(row.date));
  const scopedEvents = eventRows.filter((row) => dateInScope(row.date));
  const undatedProjects = projectRows.filter((row) => !row.date);
  const undatedEvents = eventRows.filter((row) => !row.date);

  const countProjects = (status) =>
    scopedProjects.filter((row) => row.project.project_status === status).length;
  const countEvents = (status) =>
    scopedEvents.filter((row) => row.event.status === status).length;

  const summary = [
    [
      { content: "Scope:", styles: headingStyle },
      `${scopeLabel} — ${academicYearLabel(year)}`,
    ],
    [
      { content: "Projects:", styles: headingStyle },
      `${countProjects("ongoing")} ongoing · ${countProjects("completed")} completed${
        excludedProjects ? ` · ${excludedProjects} for-review excluded` : ""
      }`,
    ],
    [
      { content: "Events:", styles: headingStyle },
      `${countEvents("active")} active (ongoing) · ${countEvents("completed")} completed${
        excludedEvents ? ` · ${excludedEvents} cancelled excluded` : ""
      }`,
    ],
    [
      { content: "Coverage:", styles: headingStyle },
      `${scopedProjects.length} of ${activeProjects.length} ongoing/completed project${
        activeProjects.length === 1 ? "" : "s"
      } and ${scopedEvents.length} of ${activeEvents.length} active/completed event${
        activeEvents.length === 1 ? "" : "s"
      } ${quarter ? "fall in this quarter" : "have a date this academic year"}`,
    ],
    [
      { content: "Without dates:", styles: headingStyle },
      `${undatedProjects.length} project${
        undatedProjects.length === 1 ? "" : "s"
      } · ${undatedEvents.length} event${
        undatedEvents.length === 1 ? "" : "s"
      } (listed at the end)`,
    ],
  ];

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    theme: "grid",
    styles: { font: "times", fontSize: 8.5, cellPadding: 1.8, lineWidth: 0.1 },
    columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: usableWidth - 40 } },
    body: summary,
  });

  y = doc.lastAutoTable.finalY + 8;

  /* ---- PROJECTS ---- */
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    theme: "grid",
    styles: { font: "times", cellPadding: 2, lineWidth: 0.1 },
    columnStyles: { 0: { cellWidth: usableWidth } },
    body: [
      [
        {
          content: `PROJECTS — ${scopeLabel.toUpperCase()}`,
          styles: { fontStyle: "bold", fontSize: 10, fillColor: [229, 231, 235] },
        },
      ],
    ],
  });

  y = doc.lastAutoTable.finalY + 2;

  let projectIndex = 0;
  PROJECT_STATUS_ORDER.forEach((status) => {
    const rows = scopedProjects.filter(
      (row) => row.project.project_status === status,
    );
    y = drawSectionGroup(doc, {
      title: `${PROJECT_STATUS_LABELS[status].toUpperCase()} (${rows.length})`,
      head: PROJECT_HEAD,
      rows: rows.map(({ project }) => {
        projectIndex += 1;
        const progress = milestoneProgress(project);
        return [
          String(projectIndex),
          String(project.reference_number || "—"),
          projectActivity(project),
          projectTypeLabel(project),
          fmtDate(project.start_date),
          fmtDate(project.end_date),
          progress.total
            ? `${progress.percent}% (${progress.completed}/${progress.total})`
            : "No milestones",
        ];
      }),
      columns: PROJECT_COLUMNS(usableWidth),
      usableWidth,
      y,
    });
  });

  /* ---- EVENTS ---- */
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
          content: `EVENTS — ${scopeLabel.toUpperCase()}`,
          styles: { fontStyle: "bold", fontSize: 10, fillColor: [229, 231, 235] },
        },
      ],
    ],
  });

  y = doc.lastAutoTable.finalY + 2;

  let eventIndex = 0;
  EVENT_STATUS_ORDER.forEach((status) => {
    const rows = scopedEvents.filter((row) => row.event.status === status);
    y = drawSectionGroup(doc, {
      title: `${EVENT_STATUS_LABELS[status].toUpperCase()} (${rows.length})`,
      head: EVENT_HEAD,
      rows: rows.map(({ event }) => {
        eventIndex += 1;
        const target = Number(event.target_number_of_participants) || 0;
        return [
          String(eventIndex),
          String(event.reference_number || "—"),
          String(event.title || "Untitled event"),
          String(event.type_of_activity || "—"),
          String(event.venue || "—"),
          fieldList(event.organizing_office_unit).join("; ") || "—",
          fmtDate(eventDate(event)),
          fmtDate(eventEndDate(event)),
          `${attendedCount(event)} / ${target || "—"}`,
        ];
      }),
      columns: EVENT_COLUMNS(usableWidth),
      usableWidth,
      y,
    });
  });

  /* ---- WITHOUT DATES: nothing is ever silently dropped ---- */
  if (undatedProjects.length > 0 || undatedEvents.length > 0) {
    if (y > pageHeight - 40) {
      doc.addPage();
      y = 20;
    }

    const rows = [
      ...undatedProjects.map(({ project }) => {
        const label = PROJECT_STATUS_LABELS[project.project_status] || "—";
        return [
          "Project",
          String(project.reference_number || "—"),
          projectActivity(project),
          {
            content: label,
            styles: { textColor: STATUS_COLORS[label], fontStyle: "bold" },
          },
        ];
      }),
      ...undatedEvents.map(({ event }) => {
        const label = EVENT_STATUS_LABELS[event.status] || "—";
        return [
          "Event",
          String(event.reference_number || "—"),
          String(event.title || "Untitled event"),
          {
            content: label,
            styles: { textColor: STATUS_COLORS[label], fontStyle: "bold" },
          },
        ];
      }),
    ];

    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      theme: "grid",
      styles: { font: "times", cellPadding: 2, lineWidth: 0.1 },
      columnStyles: { 0: { cellWidth: usableWidth } },
      body: [
        [
          {
            content: `WITHOUT DATES (${rows.length}) — NOT IN THE TABLES ABOVE`,
            styles: headingStyle,
          },
        ],
      ],
    });

    autoTable(doc, {
      head: [
        [
          { content: "KIND", styles: { halign: "center" } },
          { content: "REF NO.", styles: { halign: "center" } },
          { content: "TITLE / ACTIVITY", styles: { halign: "center" } },
          { content: "STATUS", styles: { halign: "center" } },
        ],
      ],
      body: rows,
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
      columnStyles: {
        0: { cellWidth: 25, halign: "center" },
        1: { cellWidth: 35 },
        2: { cellWidth: usableWidth - 145 },
        3: { cellWidth: 85, halign: "center" },
      },
      margin: { left: M, right: M },
    });
  }

  drawFooter(doc, pageWidth, pageHeight);
  return Buffer.from(doc.output("arraybuffer"));
}

const ORDERED_PROJECT_TYPES = Object.keys(PROJECT_TYPE_ORDER);

export async function GET(req) {
  try {
    const { error, status } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });

    await connectDB();

    const url = new URL(req.url);
    const yearParam = url.searchParams.get("year")?.trim();
    if (!yearParam || Number.isNaN(Number(yearParam))) {
      return NextResponse.json(
        { message: "Valid academic year is required." },
        { status: 400 },
      );
    }
    const year = Number(yearParam);

    /* quarter is optional: 1-4 filters the report, "all"/absent is the whole
       academic year. */
    const quarterParam = (url.searchParams.get("quarter") || "").trim();
    let quarter = null;
    if (quarterParam && quarterParam !== "all") {
      const parsed = Number(quarterParam);
      if (![1, 2, 3, 4].includes(parsed)) {
        return NextResponse.json(
          { message: "Quarter must be 1-4 when provided." },
          { status: 400 },
        );
      }
      quarter = parsed;
    }

    const result = await cacheOrSet(
      `projects-events-report:${year}:${quarter ? `q${quarter}` : "all"}`,
      async () => {
        const projects = await Project.find({ year }).lean();
        if (!projects || projects.length === 0) {
          return {
            __empty: true,
            message: `No GAD projects found for AY ${year}.`,
          };
        }

        /* Same year-scoping convention as the readiness check: an event
           belongs to the year through the project it is linked to. */
        const events = await Event.find({
          project: { $in: projects.map((project) => project._id) },
        }).lean();

        const orderedProjects = [...projects]
          .map((project, originalIndex) => ({ project, originalIndex }))
          .sort((a, b) => {
            const byType =
              ORDERED_PROJECT_TYPES.indexOf(projectTypeLabel(a.project)) -
              ORDERED_PROJECT_TYPES.indexOf(projectTypeLabel(b.project));
            if (byType !== 0) return byType;
            return a.originalIndex - b.originalIndex;
          })
          .map((entry) => entry.project);

        return {
          buffer: buildStatusReport({
            projects: orderedProjects,
            events,
            year,
            quarter,
          }),
        };
      },
      REPORT_CACHE_TTL,
    );

    if (result?.__empty) {
      return NextResponse.json({ message: result.message }, { status: 404 });
    }

    const filename = quarter
      ? `projects-events-status-${year}-q${quarter}.pdf`
      : `projects-events-status-${year}.pdf`;

    return new NextResponse(result.buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Projects and events status report generation failed:", err);
    return NextResponse.json(
      { message: "Failed to generate the projects and events status report." },
      { status: 500 },
    );
  }
}

