/* File references on events and accomplishment reports arrive from the client
   as `{ url, key }`. The key is later passed to `deleteFileFromBucket` when the
   file is replaced or the event is deleted, so an unchecked key would let a
   caller point a record at somebody else's object and have the server delete
   it. `/api/upload` always writes `<folder>/<uploaderId>/<name>`, which is what
   is checked here. */

export const REPORT_FILE_FIELDS = [
  "office_memorandum",
  "activity_design",
  "attendance_sheet",
];
export const REPORT_FILE_LISTS = ["photos", "other_attachments"];

export const REPORT_FOLDERS = {
  office_memorandum: "reports/memorandum",
  activity_design: "reports/activity-design",
  attendance_sheet: "reports/attendance",
  photos: "reports/photos",
  other_attachments: "reports/other-attachments",
};

export const POSTER_FOLDER = "events/posters";

/**
 * Every storage key referenced by an accomplishment report.
 * @param {object|null|undefined} report
 * @returns {string[]}
 */
export function collectReportFileKeys(report) {
  const keys = [];
  for (const field of REPORT_FILE_FIELDS) {
    if (report?.[field]?.key) keys.push(report[field].key);
  }
  for (const field of REPORT_FILE_LISTS) {
    if (Array.isArray(report?.[field])) {
      report[field].forEach((f) => f?.key && keys.push(f.key));
    }
  }
  return keys;
}

/**
 * True when `key` may be stored on a record by `userId`: either it was
 * uploaded by that user into `folder`, or it is already on the record
 * (`existingKeys`), so legacy and co-editor files survive an edit.
 */
export function isAcceptableKey(key, { folder, userId, existingKeys }) {
  if (!key) return true; // an empty slot is always fine
  const k = String(key);
  if (existingKeys?.has(k)) return true;
  if (k.startsWith("/") || k.split("/").includes("..")) return false;
  return k.startsWith(`${folder}/${String(userId)}/`);
}

/**
 * Returns the first report file key the caller may not store, or null.
 * @param {object} body            request body with the report file fields
 * @param {object} opts
 * @param {string} opts.userId     caller id
 * @param {object|null} [opts.existing] report already on record (for edits)
 */
export function findForeignReportKey(body, { userId, existing = null }) {
  const existingKeys = new Set(collectReportFileKeys(existing));
  for (const field of REPORT_FILE_FIELDS) {
    const key = body?.[field]?.key;
    if (
      !isAcceptableKey(key, {
        folder: REPORT_FOLDERS[field],
        userId,
        existingKeys,
      })
    )
      return key;
  }
  for (const field of REPORT_FILE_LISTS) {
    const list = body?.[field];
    if (list === undefined || list === null) continue;
    if (!Array.isArray(list)) return `${field} must be a list`;
    for (const item of list) {
      if (
        !isAcceptableKey(item?.key, {
          folder: REPORT_FOLDERS[field],
          userId,
          existingKeys,
        })
      )
        return item.key;
    }
  }
  return null;
}

/** True when the poster key may be stored on an event by `userId`. */
export function isAcceptablePosterKey(key, { userId, existingKey = "" }) {
  return isAcceptableKey(key, {
    folder: POSTER_FOLDER,
    userId,
    existingKeys: new Set(existingKey ? [String(existingKey)] : []),
  });
}
