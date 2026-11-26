/* Undoing a migrated batch. What an import added can be taken back only
   while nothing else depends on it:

   - A person the batch created is removed (profile, term, encrypted
     identity, login account) only if the profile was not changed after the
     import, it has no other term, its account never signed in, and the
     account or profile is not linked to an event, a project or an official.
   - A term the batch added to an existing person is removed if it was not
     changed afterwards (only rows imported after term_created was recorded).
   - Changes to existing people are not reverted: their earlier values were
     never stored (the vault keeps no history), so those rows are listed for
     a person to check by hand.

   planUndo() only reads; applyUndo() re-checks every row as it deletes. */
import GemsProfile from "@/models/profile";
import ProfileTerm from "@/models/profileTerm";
import StagingRecord from "@/models/stagingRecord";
import UserAuth from "@/models/user";
import Event from "@/models/event";
import EventGuest from "@/models/eventGuest";
import ResearchExtensionProject from "@/models/researchExtensionProject";
import Official from "@/models/official";
import { deleteProfilesCascade } from "@/data/lib/profileDelete";

/* Everything one row's import wrote happens within seconds; a later
   change shows up as a timestamp past this window. */
const IMPORT_WINDOW_MS = 10 * 60 * 1000;
const SAME_WRITE_MS = 5 * 1000;

const ms = (d) => new Date(d || 0).getTime();

/* Why a created person cannot be removed, or null when they can. */
async function keepReason(record) {
  const result = record.migration_result || {};
  const profile = await GemsProfile.findById(result.profile_id)
    .select("createdAt updatedAt gemsPublicId")
    .lean();
  if (!profile) return { reason: "already_removed" };

  const created = ms(profile.createdAt);
  if (ms(profile.updatedAt) > created + SAME_WRITE_MS) {
    return { reason: "changed_since", profile };
  }

  const terms = await ProfileTerm.find({ profile_id: profile._id })
    .select("createdAt updatedAt")
    .lean();
  if (
    terms.length > 1 ||
    terms.some(
      (t) =>
        String(t._id) !== String(result.profile_term_id) ||
        ms(t.updatedAt) > created + IMPORT_WINDOW_MS,
    )
  ) {
    return { reason: "other_terms", profile };
  }

  const account = await UserAuth.findOne({ personal_info_id: profile._id })
    .select("createdAt lastLogin passwordChangedAt")
    .lean();
  if (account) {
    const made = ms(account.createdAt);
    if (made < created - SAME_WRITE_MS || made > created + IMPORT_WINDOW_MS) {
      return { reason: "account_not_from_import", profile };
    }
    if (account.lastLogin || account.passwordChangedAt) {
      return { reason: "signed_in", profile };
    }
  }

  const accountId = account?._id;
  const [attended, guest, project, official] = await Promise.all([
    accountId ? Event.exists({ "attended_users.user_id": accountId }) : null,
    accountId ? EventGuest.exists({ user_id: accountId }) : null,
    accountId
      ? ResearchExtensionProject.exists({
          $or: [{ project_leader: accountId }, { team_members: accountId }],
        })
      : null,
    profile.gemsPublicId
      ? Official.exists({ profileRef: profile.gemsPublicId })
      : null,
  ]);
  if (attended || guest || project || official) {
    return { reason: "in_use", profile };
  }
  return { reason: null, profile, account };
}

/* A term this batch added to an existing person, if it can be removed. */
async function removableTerm(record) {
  const result = record.migration_result || {};
  if (result.term_created !== true || !result.profile_term_id) return null;
  const term = await ProfileTerm.findById(result.profile_term_id)
    .select("createdAt updatedAt profile_id")
    .lean();
  if (!term) return null;
  if (ms(term.updatedAt) > ms(term.createdAt) + SAME_WRITE_MS) return null;
  return term;
}

export const KEEP_REASON_TEXT = {
  changed_since: "The person was changed after the import.",
  other_terms: "The person has another term (a later import or an edit).",
  account_not_from_import: "The login account was not created by this import.",
  signed_in: "The person has signed in or changed their password.",
  in_use: "The person is linked to an event, a project or an official.",
  already_removed: "The person was already removed.",
};

/**
 * What undo would do now, without changing anything.
 * @returns { remove: [row], keep: [row + reason], updated: [row],
 *   terms: [row] } where row is { record_id, row_number, profile_id }
 */
export async function planUndo(batchId) {
  const records = await StagingRecord.find({
    batch_id: batchId,
    status: "migrated",
  })
    .select("row_number migration_result")
    .sort({ row_number: 1 })
    .lean();

  const plan = { remove: [], keep: [], updated: [], terms: [] };
  for (const record of records) {
    const result = record.migration_result || {};
    const row = {
      record_id: record._id,
      row_number: record.row_number,
      profile_id: result.profile_id || null,
    };
    if (result.action === "created") {
      const check = await keepReason(record);
      if (check.reason) plan.keep.push({ ...row, reason: check.reason });
      else plan.remove.push({ ...row, gems_id: check.profile.gemsPublicId || null });
    } else {
      plan.updated.push(row);
      if (await removableTerm(record)) plan.terms.push(row);
    }
  }
  return plan;
}

/**
 * Carries out the undo. Each row is checked again just before its delete.
 * @returns counts and the ids removed, for the audit entry.
 */
export async function applyUndo(batchId) {
  const records = await StagingRecord.find({
    batch_id: batchId,
    status: "migrated",
  });
  const out = {
    removed_profiles: [],
    removed_accounts: [],
    removed_terms: [],
    kept: [],
    updated_rows: 0,
    vault_rows: 0,
  };
  const now = new Date();

  for (const record of records) {
    const result = record.migration_result || {};
    if (result.action === "created") {
      const check = await keepReason(record);
      if (check.reason) {
        out.kept.push({ row_number: record.row_number, reason: check.reason });
        continue;
      }
      const removed = await deleteProfilesCascade([check.profile._id]);
      out.vault_rows += removed.vault_rows;
      out.removed_profiles.push({
        profile_id: String(check.profile._id),
        gems_id: check.profile.gemsPublicId || null,
      });
      if (check.account) {
        await UserAuth.deleteOne({ _id: check.account._id });
        out.removed_accounts.push(String(check.account._id));
      }
      record.status = "undone";
      record.migration_result.undone_at = now;
      record.migration_result.message =
        "Import undone: the person and login account this row created were removed.";
      await record.save();
    } else {
      out.updated_rows += 1;
      const term = await removableTerm(record);
      if (term) {
        await ProfileTerm.deleteOne({ _id: term._id });
        out.removed_terms.push(String(term._id));
        record.migration_result.undone_at = now;
        record.migration_result.message =
          "Import undone: the term this row added was removed. Changes this row made to the person were not reverted.";
        await record.save();
      }
    }
  }
  return out;
}
