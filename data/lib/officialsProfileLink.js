import Profile from "@/models/profile";
import { loadDecryptedPiiBatch } from "@/data/lib/profileBroker";
import { normalizeOfficialSex } from "@/data/lib/universityOfficialsMerge";

/**
 * The optional link from an Official (a plain-text person on the org chart)
 * to an employee profile.
 *
 * The link is the profile's `gemsPublicId` — a random display token with no
 * personal data in it. The official keeps its own copied name and sex, so the
 * chart never depends on the vault: a deleted or changed profile only turns
 * the link "broken" or "differs", it never blanks a seat.
 *
 * The token is only ever compared server-side. Roster rows carry `linked` and
 * `linkStatus`, never the token itself, because the roster is readable by
 * every signed-in viewer.
 */

/** Loads the employee profile a link may point at, or null. */
export async function findLinkableProfile(gemsPublicId) {
  const token = String(gemsPublicId || "").trim();
  if (!token) return null;
  return Profile.findOne(
    { gemsPublicId: token, "affiliation.person_type": "Employee" },
    { gemsPublicId: 1, vaultRef: 1 },
  ).lean();
}

/**
 * Name and sex for a set of public ids, from the vault, in one read.
 * Only the four fields needed are decrypted.
 *
 * @returns {Promise<Map<string, { name: string, sex: string }>>}
 */
export async function identitiesByPublicId(publicIds) {
  const ids = [...new Set((publicIds || []).filter(Boolean).map(String))];
  const out = new Map();
  if (!ids.length) return out;

  const profiles = await Profile.find(
    { gemsPublicId: { $in: ids }, "affiliation.person_type": "Employee" },
    { gemsPublicId: 1, vaultRef: 1 },
  ).lean();
  const pii = await loadDecryptedPiiBatch(
    profiles.map((p) => p.vaultRef),
    { fields: ["first_name", "middle_name", "last_name", "sexAtBirth"] },
  );

  for (const p of profiles) {
    const row = pii.get(String(p.vaultRef));
    if (!row) continue;
    const name = [row.first_name, row.middle_name, row.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();
    out.set(p.gemsPublicId, { name, sex: normalizeOfficialSex(row.sexAtBirth) });
  }
  return out;
}

const words = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[.,]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

/**
 * "ok" | "differs" | "broken" for one linked official, or null if unlinked.
 *
 * The name matches when every word of the profile's name appears in the
 * official's name, so a title the editor added ("Dr.", "Engr.") is not
 * reported as a difference. Sex differs only when the profile has one
 * recorded and it is not what the official carries.
 */
export function linkStatusFor(official, identity) {
  if (!official?.profileRef) return null;
  if (!identity) return "broken";
  const have = new Set(words(official.name));
  const nameOk = words(identity.name).every((w) => have.has(w));
  const sexOk =
    identity.sex === "unspecified" ||
    normalizeOfficialSex(official.sex) === identity.sex;
  return nameOk && sexOk ? "ok" : "differs";
}
