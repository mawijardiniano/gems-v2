import mongoose from "mongoose";
import Official from "@/models/official";

/**
 * The person half of an officials write: turns a request body's
 * `{ official, official_text }` into the `Official` document that a term
 * points at.
 *
 * Shared by assign (POST) and edit (PATCH) so both resolve a person the same
 * way. `official_text` (a typed name) wins; `official` (a user-account id) is
 * the picker's fallback and contributes its username until the person search
 * replaces it.
 *
 * Officials are keyed by name — the unique index on Official enforces it — so
 * `findOneAndUpdate` + `upsert` reuses the existing person when the same name
 * is typed again instead of throwing E11000.
 *
 * Returns `null` when the body names nobody, so the caller can answer 400.
 */
export async function upsertOfficialFromBody(body) {
  const personText = String(body?.official_text || "").trim();
  const personId =
    body?.official && mongoose.isValidObjectId(body.official)
      ? body.official
      : null;

  const name = personText || (personId ? await nameForUser(personId) : "");
  if (!name) return null;

  return Official.findOneAndUpdate(
    { name },
    { $setOnInsert: { name } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

/**
 * The label for a picked user account. Last resort: it is the username, the
 * one identifier guaranteed on a UserAuth document.
 */
async function nameForUser(userId) {
  const UserAuth = mongoose.models.UserAuth;
  if (!UserAuth) return "";
  const user = await UserAuth.findById(userId).select("username").lean();
  return user?.username || "";
}
