import { isAcceptableKey } from "./eventFileKeys.js";

/* Storage keys on a project come from the client as `{ url, key }` and are
   deleted by the server when the project is deleted. Unchecked, a caller could
   point a project at someone else's file (a report photo, a poster) and have
   the server delete it. Same rule as events: a key must be the caller's own
   upload in the right folder, or already be on the record. */

export const EVIDENCE_FOLDER = "expenditure-evidence";
export const PROOF_FOLDER = "milestone-proof";

const keysOf = (files) =>
  (Array.isArray(files) ? files : []).map((f) => f?.key).filter(Boolean);

/** Every storage key a project (GAD, Academic or R&E) references. */
export function collectProjectFileKeys(project) {
  return [
    ...keysOf(project?.expenditure_evidence),
    ...(Array.isArray(project?.milestones) ? project.milestones : []).flatMap(
      (m) => keysOf(m?.proofs),
    ),
  ];
}

/**
 * The first evidence or milestone-proof key in `body` the caller may not
 * store, or null when every key is acceptable.
 * @param {object} body  request body (expenditure_evidence, milestones)
 * @param {{ userId: string, existing?: object }} opts
 */
export function findForeignProjectKey(body, { userId, existing = null }) {
  const existingKeys = new Set(collectProjectFileKeys(existing));
  const check = (key, folder) =>
    isAcceptableKey(key, { folder, userId, existingKeys }) ? null : key;

  for (const key of keysOf(body?.expenditure_evidence)) {
    const bad = check(key, EVIDENCE_FOLDER);
    if (bad) return bad;
  }
  for (const milestone of Array.isArray(body?.milestones) ? body.milestones : []) {
    for (const key of keysOf(milestone?.proofs)) {
      const bad = check(key, PROOF_FOLDER);
      if (bad) return bad;
    }
  }
  return null;
}
