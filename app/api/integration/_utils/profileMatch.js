/* Matching import rows to existing profiles, and preparing their PII for
   the Identity Vault. Kept apart from mapping.js, which stays free of
   database and vault imports. */
import {
  blindIndex,
  extractPiiFromProfile,
  PII_FIELDS,
} from "@/data/lib/identityVault";
import { loadDecryptedPiiBatch } from "@/data/lib/profileBroker";
import {
  equalValues,
  isEmptyValue,
} from "@/app/api/integration/_utils/mapping";

export async function findExistingProfileForRecord(record, GemsProfile) {
  const identity = record.identity || {};
  const mapped = record.mapped_payload || {};

  if (identity.student_id) {
    const byStudent = await GemsProfile.findOne({
      "affiliation.academic_information.student_id": identity.student_id,
    });
    if (byStudent) return { profile: byStudent, matchedOn: "student_id" };
  }

  if (identity.employee_id) {
    const byEmployee = await GemsProfile.findOne({
      "affiliation.employment_information.employee_id": identity.employee_id,
    });
    if (byEmployee) return { profile: byEmployee, matchedOn: "employee_id" };
  }

  /* Email, names and birthday live encrypted in the Identity Vault. Email and
     names are found through the HMAC blind index on the profile (which
     lowercases, so matching ignores case); the birthday has to be decrypted
     on the few name candidates to compare. */
  /* Records staged before email matching was restored carry no
     identity.email; fall back to the mapped payload. */
  const email =
    identity.email ||
    String(mapped?.contact?.email || "")
      .trim()
      .toLowerCase();
  const emailDigest = email ? blindIndex(email) : null;
  if (emailDigest) {
    const byEmail = await GemsProfile.findOne({
      profileSearchIndex: emailDigest,
    });
    if (byEmail) return { profile: byEmail, matchedOn: "email" };
  }

  const firstDigest = blindIndex(mapped?.personal?.first_name);
  const lastDigest = blindIndex(mapped?.personal?.last_name);
  const birthday = mapped?.personal?.birthday
    ? new Date(mapped.personal.birthday)
    : null;

  if (
    firstDigest &&
    lastDigest &&
    birthday &&
    !Number.isNaN(birthday.getTime())
  ) {
    const candidates = await GemsProfile.find({
      profileSearchIndex: { $all: [firstDigest, lastDigest] },
      vaultRef: { $exists: true, $ne: null },
    }).limit(20);
    if (candidates.length) {
      const piiByRef = await loadDecryptedPiiBatch(
        candidates.map((p) => p.vaultRef),
        { fields: ["birthday"] },
      );
      const match = candidates.find((p) =>
        sameDay(piiByRef.get(String(p.vaultRef))?.birthday, birthday),
      );
      if (match) return { profile: match, matchedOn: "name_birthday" };
    }
  }

  return null;
}

/* Birthdays may have been stored as local midnight (+08:00) or UTC
   midnight, so "same day" allows anything under 24 hours apart. */
function sameDay(a, b) {
  if (!a || !b) return false;
  const da = a instanceof Date ? a : new Date(a);
  const db = b instanceof Date ? b : new Date(b);
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return false;
  return Math.abs(da.getTime() - db.getTime()) < 24 * 60 * 60 * 1000;
}

const PII_DATE_FIELDS = new Set(PII_FIELDS.dates);

/**
 * The PII an import row carries, flattened into the vault's field bag, with
 * empty values removed (a blank cell never overwrites a stored value) and
 * the birthday turned into a Date.
 */
export function extractIncomingPii(mapped) {
  const out = {};
  for (const [key, value] of Object.entries(extractPiiFromProfile(mapped))) {
    if (isEmptyValue(value)) continue;
    if (PII_DATE_FIELDS.has(key)) {
      const d = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(d.getTime())) continue;
      out[key] = d;
    } else {
      out[key] = value;
    }
  }
  return out;
}

/**
 * Compares incoming PII with what the vault already holds. Returns only the
 * fields that differ, and a change list that names those fields without their
 * values, so the migration result never carries a copy of the plaintext.
 */
export function diffPii(existingPii = {}, incomingPii = {}) {
  const changedPii = {};
  const changes = [];
  for (const [key, value] of Object.entries(incomingPii)) {
    if (equalValues(existingPii?.[key], value)) continue;
    changedPii[key] = value;
    changes.push({ field: `pii.${key}`, from: null, to: null });
  }
  return { changedPii, changes };
}
