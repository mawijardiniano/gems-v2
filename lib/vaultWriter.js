import IdentityVault from "@/models/identityVault";
import {
  PII_FIELDS,
  buildSearchIndex,
  encryptFields,
  generatePublicId,
  generateVaultRef,
} from "@/lib/identityVault";

/* Re-exported so the API routes need one import for the write side: the
   extractor belongs to the vault's field contract, which lives in
   lib/identityVault.js, but callers reach for it next to `savePii`. */
export { extractPiiFromProfile } from "@/lib/identityVault";

/*
 * Write-side of the Identity Vault.
 *
 * The GEMS record keeps identifiers only; every PII value the caller passes
 * in is encrypted here and stored on the matching IdentityVault document.
 *
 * `vaultRef` is the link: a random UUID on the GEMS profile and the same
 * value on the Vault row. It is deliberately not an ObjectId so it cannot be
 * guessed from a leaked GEMS document.
 *
 * Only the fields in `pii` are touched, so a partial profile update (say,
 * editing just the mobile number) leaves every other vaulted field intact.
 */

function toFieldMap(encrypted) {
  return new Map(Object.entries(encrypted || {}));
}

/* Existing encrypted envelopes, re-used so a partial write keeps untouched
   fields. Only the raw envelopes move — nothing is decrypted here. */
function existingEnvelopes(existing) {
  if (!existing || !existing.fields) return {};
  const entries =
    existing.fields instanceof Map
      ? existing.fields.entries()
      : Object.entries(existing.fields);
  return Object.fromEntries(entries);
}

/**
 * Persists the encrypted PII and reports the GEMS-side patch.
 *
 * `pii` is the incoming change; `mergedWith` supplies the values already on
 * the document so a partial update (say, editing only the mobile number)
 * keeps every other field intact. Errors surface to the caller — a silent
 * failure would leave the caller believing PII was secured when it was not.
 */
export async function savePii({
  profileId = null,
  vaultRef = null,
  pii = {},
  mergedWith = null,
  ownerType = "profile",
  source = "live",
}) {
  const ref = vaultRef || generateVaultRef();
  const existing = await IdentityVault.findOne({ vaultRef: ref }).lean();

  const merged = { ...(mergedWith || {}), ...pii };
  const encrypted = encryptFields(merged, {
    dateFields: PII_FIELDS.dates,
    booleanFields: PII_FIELDS.booleans,
  });

  const fields = toFieldMap({
    ...existingEnvelopes(existing),
    ...encrypted,
  });

  const doc = await IdentityVault.findOneAndUpdate(
    { vaultRef: ref },
    {
      $set: { fields, owner_type: ownerType, source },
      $setOnInsert: { vaultRef: ref, migrated_from: profileId },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).lean();

  return {
    vaultRef: ref,
    vaultId: doc?._id || null,
    patch: {
      vaultRef: ref,
      profileSearchIndex: buildSearchIndex(merged),
    },
  };
}

/**
 * Assigns the identifiers a fresh profile needs: a public display ID and a
 * Vault link. Retries on the (astronomically unlikely) collision so the
 * caller never has to handle a duplicate-key error.
 */
export async function assignIdentifiers(Profile) {
  let gemsPublicId = generatePublicId();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const clash = await Profile.exists({ gemsPublicId });
    if (!clash) break;
    gemsPublicId = generatePublicId();
  }

  return { gemsPublicId, vaultRef: generateVaultRef() };
}
