/* Shared helpers for the downloadable PDF reports (jsPDF + autoTable).

   Quarter logic reads the UTC calendar parts on purpose: milestone and event
   dates are stored at UTC midnight (the forms send date-only values), so a
   server that is not on UTC would otherwise shift a record into the
   neighbouring quarter or render it one day early. */

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
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${month}/${day}/${date.getUTCFullYear()}`;
}

/* Calendar quarter (1-4) of a date by month only — Q1 Jan-Mar ... Q4 Oct-Dec.
   The academic year spans two calendar years, so the calendar year of the date
   must never exclude a record from the selected year's report. */
export function dateQuarter(value) {
  const date = toDate(value);
  if (!date) return null;
  return Math.floor(date.getUTCMonth() / 3) + 1;
}

/* Last day of a quarter, used to tell on-time completions from late ones. */
export function quarterEndDate(year, quarter) {
  return new Date(Date.UTC(year, quarter * 3, 0, 23, 59, 59, 999));
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
  const now = new Date();
  const reportDate = `${now.getMonth() + 1}-${now.getDate()}-${String(
    now.getFullYear(),
  ).slice(-2)}`;
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
