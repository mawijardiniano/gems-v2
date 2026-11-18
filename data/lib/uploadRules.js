/* Which file types each upload folder accepts, shared by /api/upload (which
   enforces them) and the forms (which check before uploading, so a wrong
   file is refused at once instead of after the whole transfer). Pure. */

export const IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
export const PDF_EXTS = [".pdf"];
export const DOC_EXTS = [".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"];

export const UPLOAD_FOLDER_RULES = {
  "events/posters": IMAGE_EXTS,
  "reports/photos": IMAGE_EXTS,
  "reports/memorandum": [...IMAGE_EXTS, ...PDF_EXTS],
  "reports/activity-design": [...IMAGE_EXTS, ...PDF_EXTS],
  "reports/attendance": [...IMAGE_EXTS, ...PDF_EXTS],
  "reports/other-attachments": [...IMAGE_EXTS, ...PDF_EXTS, ...DOC_EXTS],
  "status/scanned": [...IMAGE_EXTS, ...PDF_EXTS],
  "expenditure-evidence": [".pdf", ".jpg", ".jpeg", ".png"],
  /* Proof files attached to completed project milestones. */
  "milestone-proof": [".pdf", ".jpg", ".jpeg", ".png"],
};

/** The server's per-file limit. */
export const MAX_UPLOAD_FILE_BYTES = 25 * 1024 * 1024;

/** ".pdf" for "Report.PDF"; "" when there is none. */
export function extensionOf(name) {
  const value = String(name || "");
  const idx = value.lastIndexOf(".");
  return idx === -1 ? "" : value.slice(idx).toLowerCase();
}

/** "PDF, JPG or PNG" for [".pdf", ".jpg", ".jpeg", ".png"]. */
export function describeExtensions(exts) {
  const names = [
    ...new Set(
      (exts || []).map((e) => (e === ".jpeg" ? "JPG" : e.slice(1).toUpperCase())),
    ),
  ];
  if (names.length <= 1) return names[0] || "";
  return `${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}`;
}
