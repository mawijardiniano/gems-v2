
export const USER_POPULATE_BASE = {
  model: "UserAuth",
  select: "username role personal_info_id",
  populate: {
    path: "personal_info_id",
    model: "GemsProfile",
    select:
      "vaultRef personal.first_name personal.last_name personal.birthday personal.currentStatus affiliation.person_type gadData.sexAtBirth affiliation.academic_information college course year_level affiliation.employment_information office", // Only needed fields
  },
};

/**
 * Overlays the vault identity onto a populated `personal_info_id`.
 *
 * `USER_POPULATE_BASE` still selects the legacy `personal.first_name`,
 * `personal.last_name`, `personal.birthday` and `gadData.sexAtBirth` columns so
 * screens keep the shape they read today — but those columns go empty once the
 * legacy strip lands, and every name would silently turn blank. This reads the
 * decrypted values from the vault and writes them back over the same paths, so
 * consumers need no change. `affiliation` (including `person_type`) and
 * `personal.currentStatus` are GEMS-owned and always survive the overlay.
 *
 * Accepts one populated document or an array of them; returns the same shape.
 * Never throws: a profile with no vault row keeps whatever it had, and a vault
 * failure leaves the list rendered rather than blanking the response.
 */
export async function hydrateUserPopulate(rows) {
  const list = Array.isArray(rows) ? rows : [rows];
  /* A populated user document carries `personal_info_id` directly; a subdocument
     like `attended_users[]` carries it one level down under `user_id`. Both
     shapes are handled so callers pass whatever the populate produced. */
  const infoOf = (row) =>
    row?.personal_info_id || row?.user_id?.personal_info_id || null;

  const refs = list.map((row) => infoOf(row)?.vaultRef).filter(Boolean);

  if (refs.length === 0) return rows;

  let piiByRef;
  try {
    /* Imported lazily so this module stays safe to pull into code paths that
       never touch the vault. */
    const { loadDecryptedPiiBatch } = await import("./profileBroker.js");
    piiByRef = await loadDecryptedPiiBatch(refs);
  } catch (err) {
    console.error("hydrateUserPopulate vault read failed:", err);
    return rows;
  }

  for (const row of list) {
    const info = infoOf(row);
    if (!info?.vaultRef) continue;
    const pii = piiByRef.get(String(info.vaultRef));
    if (!pii) continue;

    const personal = { ...(info.personal || {}) };
    /* Only fill a path the vault actually holds, so a partial vault row cannot
       erase a legacy value that is still there mid-migration. */
    if (pii.first_name) personal.first_name = pii.first_name;
    if (pii.last_name) personal.last_name = pii.last_name;
    if (pii.middle_name) personal.middle_name = pii.middle_name;
    if (pii.birthday) personal.birthday = pii.birthday;
    info.personal = personal;

    if (pii.sexAtBirth) {
      info.gadData = { ...(info.gadData || {}), sexAtBirth: pii.sexAtBirth };
    }
  }

  return rows;
}

/**
 * Overlays the vault name onto populated university-official documents.
 *
 * `UNIVERSITY_OFFICIALS_POPULATE` reaches the profile through
 * `name.personal_info_id`, so this walks that path. `name_text` is a typed
 * label and not vault-owned, so a seat that has one is left alone; only seats
 * pointing at a user account are hydrated. The name is written to
 * `name.personal_info_id.personal`, which is exactly where `makeFilterHelpers`
 * and `getOfficialPersonName` read it.
 */
export async function hydrateUniversityOfficialNames(officials) {
  const list = Array.isArray(officials) ? officials : [officials];
  const refs = list
    .map((doc) => doc?.name?.personal_info_id?.vaultRef)
    .filter(Boolean);

  if (refs.length === 0) return officials;

  let piiByRef;
  try {
    const { loadDecryptedPiiBatch } = await import("./profileBroker.js");
    piiByRef = await loadDecryptedPiiBatch(refs);
  } catch (err) {
    console.error("hydrateUniversityOfficialNames vault read failed:", err);
    return officials;
  }

  for (const doc of list) {
    const profile = doc?.name?.personal_info_id;
    if (!profile?.vaultRef) continue;

    const pii = piiByRef.get(String(profile.vaultRef));
    if (!pii) continue;

    const personal = { ...(profile.personal || {}) };
    if (pii.first_name) personal.first_name = pii.first_name;
    if (pii.last_name) personal.last_name = pii.last_name;
    profile.personal = personal;
  }

  return officials;
}
