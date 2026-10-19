import IdentityVault from "@/models/identityVault";
import {
  PII_FIELDS,
  blindIndexTokens,
  calcAge,
  decryptFields,
  maskEmail,
  maskFullName,
  maskPhone,
} from "@/lib/identityVault";

/*
 * Read-side of the Identity Vault — the single door between GEMS and the
 * encrypted PII.
 *
 * Two levels of access:
 *   - `maskProfilePii`  : initials only ("M*** D***"), no birthday, no email,
 *                         no phone. Safe for every authenticated role and for
 *                         list screens, exports and dashboards.
 *   - `revealProfilePii` : the decrypted values, restricted to the roles in
 *                         CAN_VIEW_PII (Admin, GAD Focal Person). Every call
 *                         must also be audit-logged by the caller.
 *
 * Nothing else in the app is allowed to decrypt. Keeping it to one module
 * makes "who can see a name?" a single, reviewable answer.
 */

/* Roles allowed to see full PII. Admin administers accounts; the GAD Focal
   Person owns GAD reporting and needs real names for official documents.
   Deans and Coordinators see their own college but stay masked. */
export const CAN_VIEW_PII_ROLES = ["Admin", "GAD Focal Person"];

/** True when this role may see unmasked PII. Case-insensitive, null-safe. */
export function canViewPII(role) {
  if (!role) return false;
  const normalized = String(role).trim().toLowerCase();
  return CAN_VIEW_PII_ROLES.some((r) => r.toLowerCase() === normalized);
}

/* Development escape hatch (PII_REVEAL_FULL=true). Off in production so the
   masked path is the default everywhere. */
function revealForced() {
  return (
    process.env.PII_REVEAL_FULL === "true" &&
    process.env.NODE_ENV !== "production"
  );
}

/** Loads the vault row for a profile and decrypts every stored field. */
export async function loadDecryptedPii(vaultRef) {
  if (!vaultRef) return null;

  const row = await IdentityVault.findOne({ vaultRef }).lean();
  if (!row) return null;

  return decryptFields(row.fields, {
    dateFields: PII_FIELDS.dates,
    booleanFields: PII_FIELDS.booleans,
  });
}

/**
 * Masks a whole profile for list/dashboard use. Only initials, an age bracket
 * and nothing contactable — enough to identify a row on screen without
 * exposing an identity.
 *
 * The input is the *decrypted* bag, so this never runs for a caller that
 * cannot decrypt in the first place.
 */
export function maskProfilePii(pii = {}) {
  if (!pii) return null;

  return {
    displayName: maskFullName(pii.first_name, pii.last_name),
    initials: [pii.first_name, pii.last_name]
      .filter(Boolean)
      .map((part) => String(part)[0].toUpperCase())
      .join(""),
    age: calcAge(pii.birthday),
    sexAtBirth: pii.sexAtBirth || null,
    email: maskEmail(pii.email),
    mobileNumber: maskPhone(pii.mobileNumber),
    /* Non-identifying attributes still needed by GAD reports. */
    isPWD: pii.isPWD ?? null,
    isIndigenousPerson: pii.isIndigenousPerson ?? null,
    masked: true,
  };
}

/**
 * Full view for the two authorized roles. The real values are returned under
 * `personal` / `gadData` / `contact` so screens keep their existing shape and
 * no component needs rewriting.
 */
export function revealProfilePii(pii = {}) {
  if (!pii) return null;
  return {
    personal: {
      first_name: pii.first_name || null,
      middle_name: pii.middle_name || null,
      last_name: pii.last_name || null,
      birthday: pii.birthday || null,
      civil_status: pii.civil_status || null,
      religion: pii.religion || null,
      religion_other: pii.religion_other || null,
      nationality: pii.nationality || null,
      bloodType: pii.bloodType || null,
      headOfHousehold: pii.headOfHousehold || null,
    },
    gadData: {
      sexAtBirth: pii.sexAtBirth || null,
      gender_preference: pii.gender_preference || null,
      isPWD: pii.isPWD ?? null,
      pwd_type: pii.pwd_type || null,
      isIndigenousPerson: pii.isIndigenousPerson ?? null,
      socioEconomicStatus: pii.socioEconomicStatus || null,
    },
    contact: {
      email: pii.email || null,
      mobileNumber: pii.mobileNumber || null,
      permanentAddress: pii.permanentAddress || null,
      currentAddress: pii.currentAddress || null,
    },
    masked: false,
  };
}

/**
 * One call that does the whole job: decrypt, then decide masked or revealed
 * from the caller's role. Returns `null` when there is no vault row yet
 * (a profile still mid-migration), so callers can fall back to the legacy
 * fields without special-casing.
 */
export async function resolvePii({ vaultRef, role }) {
  const pii = await loadDecryptedPii(vaultRef);
  if (!pii) return null;

  if (revealForced() || canViewPII(role)) {
    return { ...revealProfilePii(pii), fullAccess: true, raw: pii };
  }
  return { ...maskProfilePii(pii), fullAccess: false, raw: null };
}

/**
 * Batch sibling of `loadDecryptedPii` — one query for a whole page of
 * profiles instead of one per row.
 *
 * List screens page 50 rows at a time; a per-row lookup would turn a single
 * request into 51 round trips. Returns a `Map` keyed by `vaultRef` holding
 * only the refs that actually have a vault row.
 */
export async function loadDecryptedPiiBatch(vaultRefs = []) {
  const refs = [...new Set((vaultRefs || []).filter(Boolean).map(String))];
  if (!refs.length) return new Map();

  const rows = await IdentityVault.find({ vaultRef: { $in: refs } }).lean();

  const out = new Map();
  for (const row of rows) {
    out.set(
      row.vaultRef,
      decryptFields(row.fields, {
        dateFields: PII_FIELDS.dates,
        booleanFields: PII_FIELDS.booleans,
      }),
    );
  }
  return out;
}

/**
 * Batch `resolvePii`: decrypts a page of profiles in one query and returns a
 * `Map<vaultRef, resolved>` where every entry was masked or revealed by the
 * same role decision. Refs without a vault row are absent, so callers fall
 * back to the legacy fields row by row.
 */
export async function resolvePiiBatch({ vaultRefs = [], role }) {
  const decrypted = await loadDecryptedPiiBatch(vaultRefs);
  const allowed = revealForced() || canViewPII(role);

  const out = new Map();
  for (const [ref, pii] of decrypted) {
    out.set(
      ref,
      allowed
        ? { ...revealProfilePii(pii), fullAccess: true, raw: pii }
        : { ...maskProfilePii(pii), fullAccess: false, raw: null },
    );
  }
  return out;
}

/**
 * Merges vault-resolved `sexAtBirth` (and any other identity field the vault
 * owns) onto a populated attendance entry, in place of the legacy
 * `personal_info_id.gadData.sexAtBirth`.
 *
 * The GPB and GAD-AR reports count participants by sex through
 * `sumActualParticipants` / `summarizeProjectEvents`, which read
 * `gadData.sexAtBirth` off the populated profile. That column is encrypted, so
 * every one of those counts silently collapsed into "unspecified" once the
 * legacy value stopped being written — a wrong headline on an official report
 * rather than an error.
 *
 * `currentStatus` is deliberately left alone: the GEMS document owns it, and
 * the caller has already populated it.
 *
 * Returns a new array; the input is not mutated. A user with no vault row keeps
 * whatever the legacy populate produced, so a partially migrated population
 * still reports the rows it can.
 */
export async function withResolvedAttendanceSex(entries = []) {
  const list = Array.isArray(entries) ? entries : [];
  if (!list.length) return list;

  /* Collect the refs first so this stays one query regardless of page size. */
  const refOf = (entry) => {
    const user = entry?.user_id || entry;
    const profile = user?.personal_info_id || user?.personal_info;
    return profile?.vaultRef || null;
  };

  const piiByRef = await loadDecryptedPiiBatch(list.map(refOf));

  return list.map((entry) => {
    const ref = refOf(entry);
    const pii = ref ? piiByRef.get(String(ref)) : null;
    if (!pii?.sexAtBirth) return entry;

    const user = entry?.user_id || entry;
    const profile = user.personal_info_id || user.personal_info;
    if (!profile) return entry;

    /* Mirrors the legacy `gadData.sexAtBirth` location the consumers read. */
    profile.gadData = { ...(profile.gadData || {}), sexAtBirth: pii.sexAtBirth };
    return entry;
  });
}

/**
 * The masked identity a list/aggregate row needs, in the shape the existing
 * screens already read (`personal.first_name`, `gadData.sexAtBirth`).
 *
 * A masked row shows initials, never the name. Gender is genuinely needed by
 * the GAD counts and is not identifying on its own, so it passes through on
 * every path; `currentStatus` does not, because the GEMS document — not the
 * vault — owns it and the caller merges it back.
 */
export function maskedRowPii(resolved) {
  if (!resolved) return null;
  return {
    personal: {
      first_name: resolved.initials?.[0] || null,
      middle_name: null,
      last_name: resolved.initials?.[1] || null,
      birthday: null,
    },
    gadData: {
      sexAtBirth: resolved.sexAtBirth || null,
      isPWD: resolved.isPWD ?? null,
      isIndigenousPerson: resolved.isIndigenousPerson ?? null,
      gender_preference: null,
    },
    contact: { email: null, mobileNumber: null },
    displayName: resolved.displayName || null,
    age: resolved.age ?? null,
    masked: true,
  };
}

/**
 * The full identity for the roles in CAN_VIEW_PII, in the same shape as
 * `maskedRowPii` so callers never branch on which one they received.
 *
 * Every field `revealProfilePii` returns has to appear here too. The roster
 * merges as `{ ...row.personal, ...chosen.personal }`, and the shaper hands the
 * broker only the GEMS-owned keys — so a field missing from THIS shape is a
 * field an authorized role silently loses, not one it inherits from the legacy
 * block. `religion_other`, `bloodType` and `headOfHousehold` were absent here
 * (and `middle_name` was returned unnormalised), which dropped them from every
 * Admin/Focal roster row the moment the merge base stopped carrying plaintext.
 */
export function revealedRowPii(resolved) {
  if (!resolved) return null;
  const personal = resolved.personal || {};
  const gadData = resolved.gadData || {};
  const contact = resolved.contact || {};

  return {
    personal: {
      first_name: personal.first_name || null,
      middle_name: personal.middle_name || null,
      last_name: personal.last_name || null,
      birthday: personal.birthday || null,
      civil_status: personal.civil_status || null,
      religion: personal.religion || null,
      religion_other: personal.religion_other || null,
      nationality: personal.nationality || null,
      bloodType: personal.bloodType || null,
      headOfHousehold: personal.headOfHousehold || null,
    },
    gadData: {
      sexAtBirth: gadData.sexAtBirth || null,
      gender_preference: gadData.gender_preference || null,
      isPWD: gadData.isPWD ?? null,
      pwd_type: gadData.pwd_type || null,
      isIndigenousPerson: gadData.isIndigenousPerson ?? null,
      socioEconomicStatus: gadData.socioEconomicStatus || null,
    },
    contact: {
      email: contact.email || null,
      mobileNumber: contact.mobileNumber || null,
      permanentAddress: contact.permanentAddress || null,
      currentAddress: contact.currentAddress || null,
    },
    displayName: resolved.displayName || null,
    age: resolved.age ?? null,
    masked: false,
  };
}

/** Picks the row shape a resolved (role-decided) result implies. */
export function rowPiiFor(resolved) {
  if (!resolved) return null;
  return resolved.fullAccess ? revealedRowPii(resolved) : maskedRowPii(resolved);
}

/**
 * Merges a resolved identity onto an existing row without letting vault
 * values overwrite live identifiers.
 *
 * The GEMS document still owns `currentStatus`, the affiliation block and
 * every student/employee number; only the PII groups (`personal`, `gadData`,
 * `contact`) come from the vault. `legacy` supplies the fallback for a profile
 * that has not been migrated yet, so the screen never blanks out mid-rollout.
 */
export function applyRowPii(row, resolved, { legacy = null } = {}) {
  if (!row) return row;

  const chosen = rowPiiFor(resolved) || legacy;
  if (!chosen) return row;

  const personal = { ...(row.personal || {}), ...(chosen.personal || {}) };

  /* `currentStatus` lives on the GEMS document, not the vault, so it is
     restored over whatever the identity shape left behind. */
  const currentStatus = row.personal?.currentStatus;
  if (currentStatus !== undefined) personal.currentStatus = currentStatus;
  if (!personal.currentStatus && legacy?.personal?.currentStatus) {
    personal.currentStatus = legacy.personal.currentStatus;
  }

  const merged = {
    ...row,
    personal,
    gadData: { ...(row.gadData || {}), ...(chosen.gadData || {}) },
  };

  if (chosen.contact) {
    merged.contact = { ...(row.contact || {}), ...chosen.contact };
  }
  if (chosen.displayName != null) merged.displayName = chosen.displayName;
  if (chosen.age != null) merged.age = chosen.age;
  merged.masked = chosen.masked ?? false;
  return merged;
}

/**
 * Turns a free-text search term into the blind-index digests to match against
 * `GemsProfile.profileSearchIndex`.
 *
 * Name search has to go through the digests: the plaintext names are
 * encrypted or gone, so a `$regex` over `personal.first_name` would return an
 * empty page with no error. A term that produces no tokens returns `null`,
 * which the caller reads as "cannot be answered from the index".
 */
export function searchIndexQuery(term) {
  const tokens = blindIndexTokens(term);
  return tokens.length ? tokens : null;
}
