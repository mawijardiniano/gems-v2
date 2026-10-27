/**
 * GFPS member helpers.
 *
 * The officials roster used to be a source of members: a picker listed its
 * seats and a picked seat was carried as a pointer. That route is gone — a
 * committee is encoded by hand — so the roster group/lookup helpers went with
 * it, and what remains is the manual-entry path plus the key helpers the modal
 * uses to tell a typed row from a roster key.
 */

/* ------------------------------------------------------------------ */
/* Manual entries                                                       */
/* ------------------------------------------------------------------ */

/* Manual member rows carry a synthetic key so they stay distinct from each
   other in the modal's selection list: a freshly added row has no name yet, so
   its name cannot identify it. */
export const MANUAL_KEY_PREFIX = "manual:";
let manualSeq = 0;
export const nextManualKey = () => `${MANUAL_KEY_PREFIX}${++manualSeq}`;

export const isManualKey = (key) =>
  typeof key === "string" && key.startsWith(MANUAL_KEY_PREFIX);

/**
 * Builds the member row a manual (typed) entry contributes to the payload.
 *
 * `official_text` is the source of truth for the person and is what gets
 * stored; there is no roster link, so nothing here depends on the officials
 * data being complete. `position_title` is the seat, which the memo may have
 * defined before anyone was appointed to it — hence either may be blank, but
 * the caller refuses a row where both are blank.
 *
 * The row is exactly those two fields. It used to also carry the chart header
 * it was picked under and the name split on the "Dela Cruz, Juan" comma; the
 * picker is gone, the header was never rendered, and the split parts were never
 * read because every display path prints `official_text` first.
 */
export const manualMemberNames = (name, positionTitle = "") => ({
  position_title: String(positionTitle || "").trim(),
  official_text: String(name || "").trim(),
});
