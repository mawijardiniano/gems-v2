// Single source of truth for username normalization.
// UPDATE ALL rule:
// - Student: trim() + UPPERCASE, keep `-` in IDs (e.g. 24b0128 -> 24B0128, 2024-00001 stays)
// - Employee: trim() + strip [-_. space], keep Aa-Zz case (e.g. DeLuna-MalinaoEunice -> DeLunaMalinaoEunice)
// - Full emails (contain @) are never stripped - returned as-is.
// - Staff roles (GAD Coordinator / Dean / Admin / etc) use the Employee strip rule.

export function normalizeStudentUsername(value) {
  if (value == null) return "";
  return String(value).trim().toUpperCase();
}

export function normalizeEmployeeUsername(value) {
  if (value == null) return "";
  return String(value)
    .trim()
    .replace(/[-_.\s]/g, "");
}

export function isEmailUsername(value) {
  return String(value || "").includes("@");
}

// Student-looking IDs like 25b1895 / 24b0128 / 2024-00001 -> treat as Student
// even when GemsProfile.personal.currentStatus is missing.
export function looksLikeStudentId(value) {
  const v = String(value || "").trim();
  return /^\d+[a-zA-Z]\d/.test(v) || /^\d{4}-\d+/.test(v);
}

export function resolveUsernameKind(value, currentStatus) {
  if (isEmailUsername(value)) return "email";
  // Student IDs always uppercase, even if profile status says Employee/missing.
  if (looksLikeStudentId(value)) return "student";
  if (currentStatus === "Student") return "student";
  return "employee";
}

// Dispatcher used by backfill: Student -> upper, Employee/staff -> strip.
export function normalizeUsernameByStatus(value, currentStatus) {
  if (isEmailUsername(value)) return String(value).trim();
  if (resolveUsernameKind(value, currentStatus) === "student")
    return normalizeStudentUsername(value);
  return normalizeEmployeeUsername(value);
}

// Case-insensitive exact-match filter for uniqueness checks.
// Avoids `24B0128` duplicating existing `24b0128` (unique index is case-sensitive).
export function usernameEqualsFilter(username) {
  const escaped = String(username || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return { username: { $regex: new RegExp(`^${escaped}$`, "i") } };
}
