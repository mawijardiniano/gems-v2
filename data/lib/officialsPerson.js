import Official from "@/models/official";
import { normalizeOfficialSex } from "@/data/lib/universityOfficialsMerge";

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
 * Returns `null` when the body names nobody, so the caller can answer 400.
 */
export async function upsertOfficialFromBody(body) {
  const name = officialNameFromBody(body);
  if (!name) return null;

  /* `sex` is optional on the body. When sent, it is written to the person —
     so it changes on every seat they hold, which is the point of storing it
     on the Official. When absent, the stored value is left alone. */
  const hasSex = body && Object.prototype.hasOwnProperty.call(body, "sex");
  const update = hasSex
    ? {
        $setOnInsert: { name },
        $set: { sex: normalizeOfficialSex(body.sex) },
      }
    : { $setOnInsert: { name } };

  return Official.findOneAndUpdate({ name }, update, {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true,
    runValidators: true,
  });
}

/** The trimmed, single-spaced person name from a request body, or "". */
export function officialNameFromBody(body) {
  return String(body?.official_text || "")
    .trim()
    .replace(/\s+/g, " ");
}
