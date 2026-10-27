/* Decides where a GFPS save is sent.
 *
 * Kept in `lib/` rather than beside the component so it can be executed by
 * `node --test`: the gfps page modules import through the `@/` alias, which the
 * test runner cannot resolve, and asserting on source text is what let the bug
 * this function exists to prevent reach production.
 *
 * The bug: the page chose its URL from `editingSection` alone and interpolated
 * `gfps._id` into it unconditionally. "Add Member" is a create, so it took the
 * POST branch — but a year with no document yet loads as `gfps = {}`, and the
 * edit branch would have produced `PUT /api/gfps/undefined`. In practice a
 * first save on a fresh year reached a path with no POST handler, was answered
 * 405, and wrote nothing: the member simply never appeared.
 *
 * So the id is checked here as well. Editing is a PUT only when there is a real
 * document id to address; without one there is nothing to update, and POST is
 * the only endpoint that can create the document.
 */
export const resolveSaveRequest = ({ editingSection, gfpsId, academicYear }) => {
  const id = String(gfpsId ?? "").trim();
  const canUpdate = Boolean(editingSection) && Boolean(id);

  return canUpdate
    ? { method: "PUT", url: `/api/gfps/${id}`, academic_year: academicYear }
    : { method: "POST", url: "/api/gfps", academic_year: academicYear };
};
