/* Shared constants/helpers for the Knowledge Resources feature.
   Safe to import from both server routes and client components. */

export const KNOWLEDGE_CATEGORIES = [
  "Training Material",
  "Manual",
  "Research",
  "Other",
];

/* Roles that can view and upload knowledge resources. */
export const KNOWLEDGE_ROLES = [
  "gad focal person",
  "gad coordinator",
  "dean",
  "planning director",
  "suc president",
];

/* Roles that may delete a document they did not upload. */
export const DELETE_ANY_ROLES = ["suc president", "planning director"];

export const S3_FOLDER = "knowledge-resources";
export const MAX_FILE_SIZE = 25 * 1024 * 1024;

const IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
const PDF_EXTS = [".pdf"];
const DOC_EXTS = [".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"];
const TEXT_EXTS = [".txt", ".csv"];

export const KNOWLEDGE_ALLOWED_EXTS = [
  ...PDF_EXTS,
  ...DOC_EXTS,
  ...IMAGE_EXTS,
  ...TEXT_EXTS,
];

export const BLOCKED_MIME_TYPES = [
  "text/html",
  "application/xhtml+xml",
  "image/svg+xml",
];

export function getFileExtension(name) {
  const idx = String(name || "").lastIndexOf(".");
  return idx === -1 ? "" : name.slice(idx).toLowerCase();
}

export function sanitizeFileName(name) {
  const base = String(name || "file").replace(/[^a-zA-Z0-9._-]+/g, "-");
  return base.slice(-120) || "file";
}

export function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* Returns an error string when the file is not accepted, otherwise null. */
export function validateKnowledgeFile(file) {
  const ext = getFileExtension(file?.name);
  if (!ext || !KNOWLEDGE_ALLOWED_EXTS.includes(ext)) {
    return `File type not allowed (allowed: ${KNOWLEDGE_ALLOWED_EXTS.join(
      ", "
    )})`;
  }
  if (file.size > MAX_FILE_SIZE) {
    return "File exceeds the maximum allowed size (25MB)";
  }
  if (BLOCKED_MIME_TYPES.includes(file.type)) {
    return "File type not allowed";
  }
  return null;
}
