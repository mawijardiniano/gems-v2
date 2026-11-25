/* Reads the first worksheet of an .xlsx upload into the same shape the CSV
   parser gives: one object per data row, keyed by the header row's text,
   every value a string. The import mapping only reads strings, so numbers
   (an employee number typed as a number) and dates (a birthday cell) are
   turned into text here. */
import ExcelJS from "exceljs";

function pad(n) {
  return String(n).padStart(2, "0");
}

/* Excel dates carry no time zone; ExcelJS returns them as UTC midnight. */
function dateText(d) {
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function cellText(value) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return dateText(value);
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string") return value.trim();
  if (typeof value === "object") {
    /* Formula: use its last computed result. */
    if ("result" in value) return cellText(value.result);
    /* Rich text: join the runs. */
    if (Array.isArray(value.richText)) {
      return value.richText.map((r) => r.text || "").join("").trim();
    }
    /* Hyperlink: the shown text. */
    if ("text" in value) return cellText(value.text);
    if ("error" in value) return "";
  }
  return String(value).trim();
}

/**
 * Returns `{ rows }` or `{ error }`. `buffer` is the uploaded file's bytes.
 */
export async function readXlsxRows(buffer) {
  /* An .xlsx is a zip archive; anything else is refused before parsing. */
  if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    return { error: "The file is not a valid .xlsx workbook." };
  }

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer);
  } catch {
    return {
      error:
        "The workbook could not be read. Save it again as .xlsx (or as .csv) and retry.",
    };
  }

  const sheet = workbook.worksheets.find((ws) => ws.state !== "hidden")
    || workbook.worksheets[0];
  if (!sheet) return { error: "The workbook has no sheets." };

  const headerRow = sheet.getRow(1);
  const headers = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, col) => {
    headers[col] = cellText(cell.value);
  });
  if (!headers.some(Boolean)) {
    return { error: "The first row of the first sheet must hold the column names." };
  }

  const rows = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const obj = {};
    let hasValue = false;
    for (let col = 1; col < headers.length; col += 1) {
      const key = headers[col];
      if (!key) continue;
      const text = cellText(row.getCell(col).value);
      obj[key] = text;
      if (text) hasValue = true;
    }
    if (hasValue) rows.push(obj);
  });

  return { rows, sheetName: sheet.name };
}
