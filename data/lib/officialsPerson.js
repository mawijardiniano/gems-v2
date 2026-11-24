import Official from "@/models/official";
import { normalizeOfficialSex } from "@/data/lib/universityOfficialsMerge";
import { findLinkableProfile } from "@/data/lib/officialsProfileLink";

/**
 * The person half of an officials write: turns a request body's
 * `official_text` into the `Official` document that a term points at.
 *
 * Shared by assign (POST) and edit (PATCH) so both resolve a person the same
 * way. The name is either typed by hand or filled in from the person search
 * (/api/university-officials/person-search), which hands the picker the real
 * name. The old picker sent a user-account id instead, and the server could
 * only turn that into the account's username — so a picked official was saved
 * as e.g. "msantos2". Account ids are no longer accepted.
 *
 * Officials are keyed by name — the unique index on Official enforces it — so
 * `findOneAndUpdate` + `upsert` reuses the existing person when the same name
 * is typed again instead of throwing E11000.
 *
 * Optional body fields, each left untouched on the person when absent:
 * - `sex`: written to the person, so it applies to every seat they hold.
 * - `profileRef`: a profile's gemsPublicId links the person to that employee
 *   (checked: it must exist and be an employee, and not be linked to another
 *   official); `null` or "" unlinks.
 *
 * @returns {Promise<{ official?: object, error?: string, status?: number }>}
 *   `official` on success; otherwise an error and HTTP status for the caller.
 */
export async function upsertOfficialFromBody(body) {
  const name = officialNameFromBody(body);
  if (!name) {
    return {
      error: "Missing official (search a person or type a name)",
      status: 400,
    };
  }

  const has = (key) =>
    Boolean(body) && Object.prototype.hasOwnProperty.call(body, key);
  const $set = {};

  if (has("sex")) $set.sex = normalizeOfficialSex(body.sex);

  if (has("profileRef")) {
    const token = String(body.profileRef || "").trim();
    if (!token) {
      $set.profileRef = null;
    } else {
      const profile = await findLinkableProfile(token);
      if (!profile) {
        return {
          error: "That employee profile was not found; search the person again.",
          status: 400,
        };
      }
      const holder = await Official.findOne(
        { profileRef: profile.gemsPublicId, name: { $ne: name } },
        { name: 1 },
      ).lean();
      if (holder) {
        return {
          error: `This employee is already linked to the official "${holder.name}". Unlink it there first.`,
          status: 409,
        };
      }
      $set.profileRef = profile.gemsPublicId;
    }
  }

  const update = Object.keys($set).length
    ? { $setOnInsert: { name }, $set }
    : { $setOnInsert: { name } };

  const official = await Official.findOneAndUpdate({ name }, update, {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true,
    runValidators: true,
  });
  return { official };
}

/** The trimmed, single-spaced person name from a request body, or "". */
export function officialNameFromBody(body) {
  return String(body?.official_text || "")
    .trim()
    .replace(/\s+/g, " ");
}
