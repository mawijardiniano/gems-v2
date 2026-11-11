/**
 * App-wide text-size preference.
 *
 * The scale is applied to `<html>`'s font size by `hooks/useTextScale.js`,
 * which `components/layout/DashboardNavbar.jsx` mounts. Tailwind's text and
 * spacing utilities are both rem-based (`--spacing` is `0.25rem`), so raising
 * the root size scales type and layout together — the chrome grows with the
 * page instead of overflowing it.
 *
 * Because the hook is only mounted by the seven authenticated role shells,
 * the landing page and login are never resized; `<html>` is restored on
 * unmount.
 *
 * Ceiling is 150%: the fixed sidebar is 20rem wide, which at 150% would eat
 * two thirds of a 768px tablet, so nothing larger is offered.
 */

export const TEXT_SCALE_STORAGE_KEY = "gems:textScale";

export const TEXT_SCALE_PRESETS = [
  { id: "standard", label: "Standard", percent: 100 },
  { id: "large", label: "Large", percent: 112.5 },
  { id: "larger", label: "Larger", percent: 125 },
  { id: "largest", label: "Largest", percent: 150 },
];

export const DEFAULT_TEXT_SCALE_ID = "standard";

export const MAX_TEXT_SCALE_PERCENT = 150;

/** The preset whose scale matches `percent` (default preset when unknown). */
export function resolveTextScale(id) {
  return (
    TEXT_SCALE_PRESETS.find((preset) => preset.id === id) ??
    TEXT_SCALE_PRESETS.find((preset) => preset.id === DEFAULT_TEXT_SCALE_ID)
  );
}

/** Whether `id` names a known preset. */
export function isTextScaleId(id) {
  return TEXT_SCALE_PRESETS.some((preset) => preset.id === id);
}

/** CSS value for a preset percentage, e.g. 112.5 -> "112.5%". */
export function textScaleFontSize(percent) {
  const value = Number(percent);
  if (!Number.isFinite(value) || value <= 0) {
    return `${TEXT_SCALE_PRESETS[0].percent}%`;
  }
  return `${value}%`;
}

/** Stored preset id, or "" when nothing valid has been saved yet. */
export function readStoredTextScale() {
  if (typeof window === "undefined") return "";
  try {
    const stored = window.localStorage.getItem(TEXT_SCALE_STORAGE_KEY);
    return isTextScaleId(stored) ? stored : "";
  } catch {
    return "";
  }
}

/** Persist the chosen preset id; ignores environments without storage. */
export function writeStoredTextScale(id) {
  if (typeof window === "undefined") return;
  if (!isTextScaleId(id)) return;
  try {
    window.localStorage.setItem(TEXT_SCALE_STORAGE_KEY, id);
  } catch {
    // Private mode / quota: the menu still works for this session.
  }
}

/**
 * Applies a preset to the given root element and returns the previous inline
 * font-size so the caller can restore it.
 *
 * Split out of `hooks/useTextScale.js` so the DOM behaviour is testable without
 * a browser. Passing a fake root keeps it free of `document` references.
 */
export function applyTextScaleTo(root, id) {
  if (!root || !root.style) return "";
  const previous = root.style.fontSize ?? "";
  root.style.fontSize = textScaleFontSize(resolveTextScale(id).percent);
  return previous;
}

/** Short label for the navbar trigger, e.g. "150%". */
export function textScaleTriggerLabel(percent) {
  return textScaleFontSize(percent);
}
