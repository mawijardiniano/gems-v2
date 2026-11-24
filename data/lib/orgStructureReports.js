/* PDF builders for the organizational-structure reports: leadership by sex
   (University Officials) and GFPS composition. Pure — they take plain rows
   and return a PDF buffer — so tests can build them without a server. */

import { jsPDF } from "jspdf";
import autoTableImport from "jspdf-autotable";

/* The bundler hands back the function; plain Node (tests) hands back the
   CommonJS module object with it under `default`. */
const autoTable =
  typeof autoTableImport === "function" ? autoTableImport : autoTableImport.default;
import { M, drawFooter } from "./reportQuarters.js";
import {
  OFFICIAL_SEX_LABELS,
  countOfficialsBySex,
  normalizeOfficialSex,
} from "./universityOfficialsMerge.js";

/** "AY 2026-2027" for 2026. */
export const ayFromYear = (year) => `${Number(year)}-${Number(year) + 1}`;

const STATUS_LABELS = {
  substantive: "Substantive",
  acting: "Acting",
  concurrent: "Concurrent",
  interim: "Interim",
};

/* GFPS sections in memorandum order. */
export const GFPS_REPORT_SECTIONS = [
  { key: "chairOrHeadOfAgency", label: "Chair / Head of Agency", single: true },
  { key: "executiveCommittee", label: "Executive Committee" },
  { key: "technicalWorkingGroup", label: "Technical Working Group" },
  { key: "secretariat", label: "Secretariat" },
];

/** Share of women among holders whose sex is recorded; "—" when none is. */
export function womenShare(counts) {
  const known = counts.female + counts.male;
  return known ? `${Math.round((counts.female / known) * 100)}%` : "—";
}

const sexLabel = (value) => {
  const sex = normalizeOfficialSex(value);
  return sex === "unspecified" ? "Not set" : OFFICIAL_SEX_LABELS[sex];
};

const tableStyles = {
  theme: "grid",
  styles: { font: "times", fontSize: 8.5, cellPadding: 1.6, lineWidth: 0.1, valign: "top" },
  headStyles: { font: "times", fontStyle: "bold", fillColor: [240, 240, 240], textColor: 0 },
  margin: { left: M, right: M },
};

function drawTitle(doc, pageWidth, title, subtitleLines) {
  let y = 14;
  doc.setFont("times", "bold");
  doc.setFontSize(13);
  doc.text(title, pageWidth / 2, y, { align: "center", charSpace: 0.3 });
  doc.setFont("times", "normal");
  doc.setFontSize(9);
  for (const line of subtitleLines.filter(Boolean)) {
    y += 5;
    doc.text(line, pageWidth / 2, y, { align: "center", maxWidth: pageWidth - 2 * M });
  }
  return y + 8;
}

function drawHeading(doc, text, y) {
  doc.setFont("times", "bold");
  doc.setFontSize(10);
  doc.text(text, M, y);
  return y + 2;
}

/* Footnote under a counts table: how "% women" is computed. */
function drawNote(doc, text, y) {
  doc.setFont("times", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(90);
  doc.text(text, M, y);
  doc.setTextColor(0);
  return y + 6;
}

/**
 * Leadership by sex: who holds the University Officials seats on the day the
 * academic year opened, counted per office, then listed seat by seat.
 *
 * @param {{ year: number, rows: Array<{ header, name, official_text, sex, status }> }} input
 *   `rows` are roster rows (data/lib/officialsTermsQuery.js toRosterRow).
 * @returns {ArrayBuffer}
 */
export function buildLeadershipPdf({ year, rows }) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const list = Array.isArray(rows) ? rows : [];

  let y = drawTitle(doc, pageWidth, "LEADERSHIP BY SEX — UNIVERSITY OFFICIALS", [
    `AY ${ayFromYear(year)}`,
    "Seat holders when the academic year opened (1 August)",
  ]);

  const headers = [...new Set(list.map((r) => r.header))];
  const total = countOfficialsBySex(list);
  const summary = headers.map((header) => {
    const c = countOfficialsBySex(list.filter((r) => r.header === header));
    return [header, c.female, c.male, c.unspecified, c.total, womenShare(c)];
  });

  y = drawHeading(doc, "Summary by office", y);
  autoTable(doc, {
    ...tableStyles,
    startY: y,
    head: [["Office", "Female", "Male", "Not set", "Total", "% women"]],
    body: summary.length ? summary : [[{ content: "No officials recorded for this year.", colSpan: 6, styles: { halign: "center", fontStyle: "italic" } }]],
    foot: summary.length
      ? [["Total", total.female, total.male, total.unspecified, total.total, womenShare(total)]]
      : undefined,
    footStyles: { font: "times", fontStyle: "bold", fillColor: [229, 231, 235], textColor: 0 },
    columnStyles: { 1: { halign: "center" }, 2: { halign: "center" }, 3: { halign: "center" }, 4: { halign: "center" }, 5: { halign: "center" } },
  });
  y = drawNote(doc, "% women is taken over seats whose holder's sex is recorded; \"Not set\" seats are excluded from it.", doc.lastAutoTable.finalY + 4);

  if (list.length) {
    y = drawHeading(doc, "Seats", y + 2);
    autoTable(doc, {
      ...tableStyles,
      startY: y,
      head: [["Office", "Seat", "Name", "Sex", "Status"]],
      body: list.map((r) => [
        r.header,
        r.name,
        r.official_text || "—",
        sexLabel(r.sex),
        STATUS_LABELS[r.status] || "Substantive",
      ]),
      columnStyles: { 3: { halign: "center", cellWidth: 18 }, 4: { cellWidth: 24 } },
    });
  }

  drawFooter(doc, pageWidth, pageHeight);
  return doc.output("arraybuffer");
}

/**
 * GFPS composition: the year's constituting issuance, member counts by sex
 * per section, and the member list. Vacant memo seats are listed but not
 * counted by sex.
 *
 * @param {{ year: number, gfps: object|null }} input  a lean GFPS document
 * @returns {ArrayBuffer}
 */
export function buildGfpsCompositionPdf({ year, gfps }) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const g = gfps || {};

  const fmt = (value) => {
    if (!value) return "";
    const d = new Date(value);
    return Number.isNaN(d.getTime())
      ? ""
      : d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
  };
  const iss = g.issuance || {};
  const issuanceParts = [
    iss.number,
    iss.date ? `dated ${fmt(iss.date)}` : "",
    iss.effectivity ? `effective ${fmt(iss.effectivity)}` : "",
  ].filter(Boolean);

  let y = drawTitle(doc, pageWidth, "GFPS COMPOSITION REPORT", [
    `AY ${ayFromYear(year)}`,
    issuanceParts.length ? `Per ${issuanceParts.join(", ")}` : "No GFPS issuance recorded for this year",
  ]);

  const sections = GFPS_REPORT_SECTIONS.map((sec) => {
    const raw = sec.single ? (g[sec.key] ? [g[sec.key]] : []) : sec.key === "secretariat" ? g.secretariat || [] : g[sec.key]?.members || [];
    const members = raw.filter((m) => String(m?.official_text || "").trim() || String(m?.position_title || "").trim());
    const named = members.filter((m) => String(m?.official_text || "").trim());
    return { ...sec, members, named, counts: countOfficialsBySex(named), vacant: members.length - named.length };
  });
  const allNamed = sections.flatMap((s) => s.named);
  const total = countOfficialsBySex(allNamed);
  const vacantTotal = sections.reduce((n, s) => n + s.vacant, 0);

  y = drawHeading(doc, "Summary by section", y);
  autoTable(doc, {
    ...tableStyles,
    startY: y,
    head: [["Section", "Female", "Male", "Not set", "Members", "Vacant seats", "% women"]],
    body: sections.map((s) => [s.label, s.counts.female, s.counts.male, s.counts.unspecified, s.counts.total, s.vacant, womenShare(s.counts)]),
    foot: [["Total", total.female, total.male, total.unspecified, total.total, vacantTotal, womenShare(total)]],
    footStyles: { font: "times", fontStyle: "bold", fillColor: [229, 231, 235], textColor: 0 },
    columnStyles: Object.fromEntries([1, 2, 3, 4, 5, 6].map((i) => [i, { halign: "center" }])),
  });
  y = drawNote(doc, "Counts cover named members; vacant memorandum seats are counted separately. A person in two sections is counted in each.", doc.lastAutoTable.finalY + 4);

  const memberRows = sections.flatMap((s) =>
    s.members.map((m) => [
      s.label,
      String(m.position_title || "").trim() || (m.role === "chair" ? "Chair" : "—"),
      String(m.official_text || "").trim() || "(Vacant)",
      String(m.official_text || "").trim() ? sexLabel(m.sex) : "",
      m.role === "chair" ? "Chair" : m.role === "member" ? "Member" : "",
    ]),
  );
  y = drawHeading(doc, "Members", y + 2);
  autoTable(doc, {
    ...tableStyles,
    startY: y,
    head: [["Section", "Position / seat", "Name", "Sex", "Role"]],
    body: memberRows.length ? memberRows : [[{ content: "No members recorded for this year.", colSpan: 5, styles: { halign: "center", fontStyle: "italic" } }]],
    columnStyles: { 3: { halign: "center", cellWidth: 18 }, 4: { cellWidth: 18 } },
  });

  drawFooter(doc, pageWidth, pageHeight);
  return doc.output("arraybuffer");
}
