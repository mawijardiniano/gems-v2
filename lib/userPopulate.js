
export const USER_POPULATE_BASE = {
  model: "UserAuth",
  select: "username role personal_info_id",
  populate: {
    path: "personal_info_id",
    model: "GemsProfile",
    /* Project real schema paths only. The legacy `personal.first_name` /
       `personal.last_name` / `personal.birthday` and `gadData.sexAtBirth`
       columns were removed from GemsProfile once every row was verified to
       round-trip through the vault, so selecting them made Mongoose drop the
       joined profile entirely — taking `vaultRef` with it and making every
       name unresolvable. `hydrateUserPopulate` rebuilds `personal.*` on the
       plain object from the decrypted vault identity, so the response shape
       is unchanged. */
    select:
      "vaultRef affiliation.person_type affiliation.academic_information affiliation.employment_information", // Only needed fields
  },
};

/**
 * Overlays the vault identity onto a populated `personal_info_id`.
 *
 * `USER_POPULATE_BASE` selects only real GemsProfile paths: the legacy
 * `personal.first_name`, `personal.last_name`, `personal.birthday` and
 * `gadData.sexAtBirth` columns no longer exist, and the name to show comes from
 * the vault. This reads the decrypted values and writes them onto the same
 * paths consumers already read, so no caller needs to change.
 *
 * The write target is a plain object, never the live Mongoose subdocument: its
 * schema has no `personal` path, so assigning `profile.personal = ...` on the
 * document itself silently does nothing. See `toPlainOfficial` below.
 *
 * Accepts one populated document or an array of them; returns the same shape.
 * Never throws: a profile with no vault row keeps whatever it had, and a vault
 * failure leaves the list rendered rather than blanking the response.
 */
export async function hydrateUserPopulate(rows, role) {
  const list = Array.isArray(rows) ? rows : [rows];
  /* A populated user document carries `personal_info_id` directly; a subdocument
     like `attended_users[]` carries it one level down under `user_id`. Both
     shapes are handled so callers pass whatever the populate produced. */
  /* Three shapes reach this function:
       - a populated user document:              `personal_info_id`
       - an `attended_users[]` subdocument:      `user_id.personal_info_id`
       - an Event row with a populated creator:  `created_by.personal_info_id`
     Missing any of them leaves that path unhydrated *and* unscubbed, which is
     exactly how a `vaultRef` escaped through `GET /api/events`. */
  const infoOf = (row) =>
    row?.personal_info_id ||
    row?.user_id?.personal_info_id ||
    row?.created_by?.personal_info_id ||
    null;

  /* `vaultRef` is the key into the vault, so it is removed from every row on
     every path out of this function - including the no-role and vault-failure
     paths - before anything is returned to a caller. */
  const scrub = () => {
    for (const row of list) {
      const info = infoOf(row);
      if (info) delete info.vaultRef;
    }
    return rows;
  };

  /* Decrypting is the privileged step, so it happens only for a role that is
     allowed to see PII in the first place. Without this gate any caller of any
     endpoint that populates a user - including anonymous ones reaching an event
     through `optionalAuth` - could read a decrypted identity out of the
     response. Callers that pass no role get no decryption. */
  const { canViewPII } = await import("./profileBroker.js");
  if (!canViewPII(role)) return scrub();

  const refs = list.map((row) => infoOf(row)?.vaultRef).filter(Boolean);

  /* Nothing to resolve: still scrub the pointer before returning. */
  if (refs.length === 0) return scrub();

  let piiByRef;
  try {
    /* Imported lazily so this module stays safe to pull into code paths that
       never touch the vault. */
    const { loadDecryptedPiiBatch } = await import("./profileBroker.js");
    piiByRef = await loadDecryptedPiiBatch(refs);
  } catch (err) {
    console.error("hydrateUserPopulate vault read failed:", err);
    /* A vault failure leaves the list rendered rather than blanking it. */
    return scrub();
  }

  for (const row of list) {
    const info = infoOf(row);
    if (!info) continue;

    const pii = piiByRef.get(String(info.vaultRef));

    /* `vaultRef` was selected only to resolve the identity; drop it now that it
       has been used so the pointer never reaches the browser. */
    delete info.vaultRef;

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

/* Roles allowed to see unmasked PII, mirroring `CAN_VIEW_PII_ROLES` in
   `lib/profileBroker.js`. Duplicated as a small local constant because the
   scrubber below is synchronous (it runs while serializing a response) and
   cannot `await` the broker's dynamic import. */
const PII_ROLES = ["admin", "gad focal person"];

function canViewPIISync(role) {
  if (!role) return false;
  return PII_ROLES.includes(String(role).trim().toLowerCase());
}

/**
 * Removes the vault pointer from hydrated university-official documents.
 *
 * `vaultRef` is selected so the identity can be resolved, but it is the key into
 * the vault and must never reach the browser. The hydrator writes the decrypted
 * name onto `name.personal_info_id.personal`, so dropping the ref afterwards
 * costs the consumer nothing.
 *
 * Handles both shapes this route family produces: plain objects from `.lean()`
 * and Mongoose documents from a plain `.find()`, where `personal_info_id` is a
 * populated subdocument and a bare `delete` would not survive `toJSON()`.
 * Returns a JSON-safe plain value in both cases.
 *
 * `role` is the caller's role; when it may not see PII the name-derived
 * `username` is removed too, otherwise the "masked" roster would still leak the
 * surname the role is being denied.
 */
export function stripOfficialVaultRefs(officials, role) {
  const canSeePii =
    role === undefined ? true : canViewPIISync(role);
  const scrubOne = (doc) => {
    if (!doc) return doc;

    /* `toObject({ depopulate: false })` keeps the populated `personal_info_id`
       that `hydrateUniversityOfficialNames` just wrote onto. A plain
       `toObject()` re-serializes from Mongoose's internal document state and
       would discard that hydrated name, and a bare `delete` on a Mongoose
       subdocument does not survive `toJSON()` - so the ref is removed on the
       serialized copy instead. `virtuals: true` preserves the `id` field the
       clients read. */
    const plain =
      typeof doc.toObject === "function"
        ? doc.toObject({ virtuals: true, depopulate: false })
        : { ...doc };

    /* A populated `personal_info_id` may still be a live document reference;
       convert it so the delete below operates on a plain object. */
    const profile = plain.official?.personal_info_id;
    if (profile && typeof profile === "object" && typeof profile.toObject === "function") {
      plain.official.personal_info_id = profile.toObject({ virtuals: true });
    }
    if (plain.official?.personal_info_id && typeof plain.official.personal_info_id === "object") {
      delete plain.official.personal_info_id.vaultRef;
      /* Loading the whole profile document (needed so `personal` has a path to
         hydrate into) also brings these server-side bookkeeping fields. Neither
         is a client concern: the ref into the vault, and the migration state
         that `profile/[id]` exposes through the `vaulted` boolean. */
      delete plain.official.personal_info_id.migrationStatus;
      delete plain.official.personal_info_id.profileSearchIndex;
    }

    /* The account username is normally derived from the person's name
       (`RodelasJulie`), so a caller who may not see PII would otherwise read the
       surname straight off the "masked" roster. Consumers key the seat off
       `name` or `official.personal_info_id._id`, so dropping it is safe. */
    if (!canSeePii && plain.official && typeof plain.official === "object") {
      delete plain.official.username;
    }
    return plain;
  };

  return Array.isArray(officials)
    ? officials.map(scrubOne)
    : scrubOne(officials);
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
export async function hydrateUniversityOfficialNames(officials, role) {
  const isArray = Array.isArray(officials);
  const list = isArray ? officials : [officials];

  /* Same privileged gate as `hydrateUserPopulate`: the officials roster is
     readable by any authenticated user, so decryption is restricted to the
     roles that may see PII at all. */
  const { canViewPII } = await import("./profileBroker.js");
  if (!canViewPII(role)) return officials;

  /* Work on plain objects from the start. The populated `personal_info_id` is a
     live Mongoose subdocument whose schema has no `personal` path (the column is
     gone from the database), so assigning `profile.personal = ...` succeeds in
     memory but is dropped by `toObject()`. Serializing first means the overlay is
     written where it will actually be read, whatever shape the caller passed. */
  const plainList = list.map((doc) => {
    if (!doc || typeof doc !== "object") return doc;
    const plain =
      typeof doc.toObject === "function"
        ? doc.toObject({ virtuals: true, depopulate: false })
        : doc;
    const profile = plain?.official?.personal_info_id;
    if (profile && typeof profile.toObject === "function") {
      plain.official.personal_info_id = profile.toObject({ virtuals: true });
    }
    return plain;
  });

  const refs = plainList
    .map((doc) => doc?.official?.personal_info_id?.vaultRef)
    .filter(Boolean);

  if (refs.length === 0) return isArray ? plainList : plainList[0];

  let piiByRef;
  try {
    const { loadDecryptedPiiBatch } = await import("./profileBroker.js");
    piiByRef = await loadDecryptedPiiBatch(refs);
  } catch (err) {
    console.error("hydrateUniversityOfficialNames vault read failed:", err);
    /* Names stay unresolved rather than failing the whole roster. */
    return isArray ? plainList : plainList[0];
  }

  for (const doc of plainList) {
    const profile = doc?.official?.personal_info_id;
    if (!profile?.vaultRef) continue;

    const pii = piiByRef.get(String(profile.vaultRef));
    if (!pii) continue;

    const personal = { ...(profile.personal || {}) };
    if (pii.first_name) personal.first_name = pii.first_name;
    if (pii.last_name) personal.last_name = pii.last_name;
    profile.personal = personal;
  }

  return isArray ? plainList : plainList[0];
}
