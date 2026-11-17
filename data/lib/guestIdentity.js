/* What makes two guest rows "the same check-in" for one event.

   Guest rows used to be unique on (event_id, full_name), so the second of two
   different people who share a name could never check in: the form told them
   they had "already submitted". The row identity is now `dedupe_key`:

     - a manually encoded row belongs to an account:   "account:<user id>"
     - a QR row is what the guest typed, normalised:
         "qr:<name>|<contact digits>|<participant type>|<department>"

   Resubmitting the same details is still recognised as the same check-in, while
   two people with the same name but a different contact number, participant
   type or department get separate rows for the organizer to validate. Pure, so
   the routes, the model and the migration script share one definition. */

/** Lowercase, single-spaced, trimmed. */
export const normalizeName = (value) =>
  String(value ?? "")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

/** Digits only, so "0917 123 4567" and "09171234567" match. */
export const normalizeContact = (value) => String(value ?? "").replace(/\D+/g, "");

/**
 * The identity key of a guest row.
 * @param {object} row  { user_id?, full_name, contact?, participant_type?, department_office_org? }
 * @returns {string|null} null when there is not enough to identify the row
 */
export function guestDedupeKey(row) {
  if (!row) return null;
  if (row.user_id) return `account:${String(row.user_id)}`;
  const name = normalizeName(row.full_name);
  if (!name) return null;
  return [
    `qr:${name}`,
    normalizeContact(row.contact),
    normalizeName(row.participant_type),
    normalizeName(row.department_office_org),
  ].join("|");
}

/**
 * Whether a QR walk-in row can be taken over by the account an organizer is
 * manually encoding: only when it is plainly the same person. Exactly one
 * unlinked row may carry that name, and its sex at birth must agree; a second
 * same-name walk-in, or a mismatch, means a new row is recorded instead of
 * overwriting somebody else's check-in.
 *
 * @param {object[]} candidates guest rows in the event with that name
 * @param {{ sex?: string }} person the account being encoded
 * @returns {object|null} the row to adopt, or null
 */
export function pickAdoptableWalkIn(candidates, person) {
  const unlinked = (Array.isArray(candidates) ? candidates : []).filter(
    (row) => row && !row.user_id,
  );
  if (unlinked.length !== 1) return null;
  const [row] = unlinked;
  if (person?.sex && row.sex && row.sex !== person.sex) return null;
  return row;
}
