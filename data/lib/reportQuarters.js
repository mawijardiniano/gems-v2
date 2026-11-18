/* Shared helpers for the downloadable PDF reports (jsPDF + autoTable).

   Dates are read as Manila calendar days (data/lib/appTime.js), never in the
   server's zone. Older milestone and event dates were stored at UTC midnight
   and newer ones at Manila midnight; reading UTC parts showed the newer ones a
   day early (and could move a record into the previous quarter), while the
   Manila day of both is the day that was picked. */

import { APP_UTC_OFFSET_MS, appParts } from "./appTime.js";

export const M = 10;

export const QUARTER_LABELS = {
  1: { short: "Q1", long: "1st Quarter", range: "January – March" },
  2: { short: "Q2", long: "2nd Quarter", range: "April – June" },
  3: { short: "Q3", long: "3rd Quarter", range: "July – September" },
  4: { short: "Q4", long: "4th Quarter", range: "October – December" },
};

export function toDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function fmtDate(value) {
  const date = toDate(value);
  if (!date) return "—";
  const p = appParts(date);
  const month = String(p.month).padStart(2, "0");
  const day = String(p.day).padStart(2, "0");
  return `${month}/${day}/${p.year}`;
}

/* Calendar quarter (1-4) of a date by month only — Q1 Jan-Mar ... Q4 Oct-Dec.
   The academic year spans two calendar years, so the calendar year of the date
   must never exclude a record from the selected year's report. */
export function dateQuarter(value) {
  const date = toDate(value);
  if (!date) return null;
  return Math.floor((appParts(date).month - 1) / 3) + 1;
}

/* Last day of a quarter, used to tell on-time completions from late ones. */
export function quarterEndDate(year, quarter) {
  /* 23:59:59.999 Manila on the quarter's last day. */
  return new Date(
    Date.UTC(year, quarter * 3, 0, 23, 59, 59, 999) - APP_UTC_OFFSET_MS,
  );
}

export function academicYearLabel(year) {
  return `AY ${year}-${Number(year) + 1}`;
}

export function drawReportTitle(doc, pageWidth, title, year, subtitle = null) {
  let cursorY = 14;
  doc.setFont("times", "bold");
  doc.setFontSize(13);
  doc.text(title, pageWidth / 2, cursorY, { align: "center", charSpace: 0.3 });
  cursorY += 7;
  doc.setFont("times", "normal");
  doc.setFontSize(9);
  doc.text(`FY: ${year}`, pageWidth / 2, cursorY, { align: "center" });
  if (subtitle) {
    cursorY += 5;
    doc.text(subtitle, pageWidth / 2, cursorY, { align: "center" });
  }
  return cursorY + 8;
}

export const SYSTEM_FOOTER_TEXT =
  "System-generated via GEMS";

export function drawFooter(doc, pageWidth, pageHeight) {
  /* Manila's date: on a UTC server, reports made 00:00–08:00 Manila time
     carried yesterday's date. */
  const now = appParts(new Date());
  const reportDate = `${now.month}-${now.day}-${String(now.year).slice(-2)}`;
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(229, 231, 235);
    doc.rect(0, pageHeight - 6, pageWidth, 6, "F");
    doc.setFont("times", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(0);
    doc.text(
      `Report Generated: ${reportDate}    Page ${i} of ${pageCount}`,
      pageWidth - M,
      pageHeight - 2,
      { align: "right" },
    );
    doc.text(SYSTEM_FOOTER_TEXT, M, pageHeight - 2, { align: "left" });
  }
}
