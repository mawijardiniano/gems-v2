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

   The checks load everything they need for all rows in a few bulk queries
   (one per collection per chunk of rows) rather than several queries per
   row, which made a 210-row undo take 89 s. planUndo() only reads;
   applyUndo() loads fresh data, decides, then deletes in bulk. */
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
/* Ids per $in query. */
const CHUNK = 1000;

const ms = (d) => new Date(d || 0).getTime();
const key = (id) => String(id);

function chunks(list) {
  const out = [];
  for (let i = 0; i < list.length; i += CHUNK) out.push(list.slice(i, i + CHUNK));
  return out;
}

/* Runs `query(ids)` per chunk and concatenates the results. */
async function inChunks(ids, query) {
  const results = await Promise.all(chunks(ids).map((part) => query(part)));
  return results.flat();
}

/**
 * Everything the checks need for these rows, loaded in bulk: profiles,
 * their terms, their accounts, and which accounts or profiles are linked
 * to an event, a project or an official.
 */
async function loadContext(records) {
  const created = records.filter((r) => r.migration_result?.action === "created");
  const profileIds = created.map((r) => r.migration_result.profile_id).filter(Boolean);
  const addedTermIds = records
    .filter(
      (r) =>
        r.migration_result?.action !== "created" &&
        r.migration_result?.term_created === true &&
        r.migration_result?.profile_term_id,
    )
    .map((r) => r.migration_result.profile_term_id);

  const [profiles, terms, accounts, addedTerms] = await Promise.all([
    inChunks(profileIds, (ids) =>
      GemsProfile.find({ _id: { $in: ids } })
        .select("createdAt updatedAt gemsPublicId")
        .lean(),
    ),
    inChunks(profileIds, (ids) =>
      ProfileTerm.find({ profile_id: { $in: ids } })
        .select("profile_id createdAt updatedAt")
        .lean(),
    ),
    inChunks(profileIds, (ids) =>
      UserAuth.find({ personal_info_id: { $in: ids } })
        .select("personal_info_id createdAt lastLogin passwordChangedAt")
        .lean(),
    ),
    inChunks(addedTermIds, (ids) =>
      ProfileTerm.find({ _id: { $in: ids } })
        .select("createdAt updatedAt")
        .lean(),
    ),
  ]);

  const accountIds = accounts.map((a) => a._id);
  const gemsIds = profiles.map((p) => p.gemsPublicId).filter(Boolean);
  const [attended, guests, projects, officials] = await Promise.all([
    inChunks(accountIds, (ids) =>
      Event.find({ "attended_users.user_id": { $in: ids } })
        .select("attended_users.user_id")
        .lean(),
    ),
    inChunks(accountIds, (ids) =>
      EventGuest.distinct("user_id", { user_id: { $in: ids } }),
    ),
    inChunks(accountIds, (ids) =>
      ResearchExtensionProject.find({
        $or: [{ project_leader: { $in: ids } }, { team_members: { $in: ids } }],
      })
        .select("project_leader team_members")
        .lean(),
    ),
    inChunks(gemsIds, (ids) =>
      Official.distinct("profileRef", { profileRef: { $in: ids } }),
    ),
  ]);

  const usedAccounts = new Set(guests.map(key));
  for (const e of attended) {
    for (const a of e.attended_users || []) if (a.user_id) usedAccounts.add(key(a.user_id));
  }
  for (const p of projects) {
    if (p.project_leader) usedAccounts.add(key(p.project_leader));
    for (const m of p.team_members || []) usedAccounts.add(key(m));
  }

  const termsByProfile = new Map();
  for (const t of terms) {
    const k = key(t.profile_id);
    if (!termsByProfile.has(k)) termsByProfile.set(k, []);
    termsByProfile.get(k).push(t);
  }

  return {
    profiles: new Map(profiles.map((p) => [key(p._id), p])),
    termsByProfile,
    accounts: new Map(accounts.map((a) => [key(a.personal_info_id), a])),
    usedAccounts,
    usedGemsIds: new Set(officials.map(String)),
    addedTerms: new Map(addedTerms.map((t) => [key(t._id), t])),
  };
}

/* Why a created person cannot be removed (null when they can), from the
   loaded context. */
function keepReason(record, ctx) {
  const result = record.migration_result || {};
  const profile = ctx.profiles.get(key(result.profile_id));
  if (!profile) return { reason: "already_removed" };

  const created = ms(profile.createdAt);
  if (ms(profile.updatedAt) > created + SAME_WRITE_MS) {
    return { reason: "changed_since", profile };
  }

  const terms = ctx.termsByProfile.get(key(profile._id)) || [];
  if (
    terms.length > 1 ||
    terms.some(
      (t) =>
        key(t._id) !== key(result.profile_term_id) ||
        ms(t.updatedAt) > created + IMPORT_WINDOW_MS,
    )
  ) {
    return { reason: "other_terms", profile };
  }

  const account = ctx.accounts.get(key(profile._id));
  if (account) {
    const made = ms(account.createdAt);
    if (made < created - SAME_WRITE_MS || made > created + IMPORT_WINDOW_MS) {
      return { reason: "account_not_from_import", profile };
    }
    if (account.lastLogin || account.passwordChangedAt) {
      return { reason: "signed_in", profile };
    }
  }

  if (
    (account && ctx.usedAccounts.has(key(account._id))) ||
    (profile.gemsPublicId && ctx.usedGemsIds.has(profile.gemsPublicId))
  ) {
    return { reason: "in_use", profile };
  }
  return { reason: null, profile, account };
}

/* The term this row added to an existing person, if it can be removed. */
function removableTerm(record, ctx) {
  const result = record.migration_result || {};
  if (result.term_created !== true || !result.profile_term_id) return null;
  const term = ctx.addedTerms.get(key(result.profile_term_id));
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

async function migratedRecords(batchId) {
  return StagingRecord.find({ batch_id: batchId, status: "migrated" })
    .select("row_number migration_result")
    .sort({ row_number: 1 })
    .lean();
}

/* Sorts each row into remove / keep / updated (+ removable term). */
function decide(records, ctx) {
  const plan = { remove: [], keep: [], updated: [], terms: [] };
  for (const record of records) {
    const result = record.migration_result || {};
    const row = {
      record_id: record._id,
      row_number: record.row_number,
      profile_id: result.profile_id || null,
    };
    if (result.action === "created") {
      const check = keepReason(record, ctx);
      if (check.reason) plan.keep.push({ ...row, reason: check.reason });
      else
        plan.remove.push({
          ...row,
          gems_id: check.profile.gemsPublicId || null,
          account_id: check.account?._id || null,
        });
    } else {
      plan.updated.push(row);
      const term = removableTerm(record, ctx);
      if (term) plan.terms.push({ ...row, term_id: term._id });
    }
  }
  return plan;
}

/**
 * What undo would do now, without changing anything.
 * @returns { remove: [row], keep: [row + reason], updated: [row],
 *   terms: [row] } where row is { record_id, row_number, profile_id }
 */
export async function planUndo(batchId) {
  const records = await migratedRecords(batchId);
  return decide(records, await loadContext(records));
}

/**
 * Carries out the undo: loads fresh data, decides every row, then deletes
 * in bulk (profiles with their terms and vault rows, accounts, added terms)
 * and marks the rows.
 * @returns counts and the ids removed, for the audit entry.
 */
export async function applyUndo(batchId) {
  const records = await migratedRecords(batchId);
  const plan = decide(records, await loadContext(records));
  const now = new Date();

  const profileIds = plan.remove.map((r) => r.profile_id);
  const accountIds = plan.remove.map((r) => r.account_id).filter(Boolean);
  const termIds = plan.terms.map((r) => r.term_id);

  let vaultRows = 0;
  for (const part of chunks(profileIds)) {
    vaultRows += (await deleteProfilesCascade(part)).vault_rows;
  }
  for (const part of chunks(accountIds)) {
    await UserAuth.deleteMany({ _id: { $in: part } });
  }
  for (const part of chunks(termIds)) {
    await ProfileTerm.deleteMany({ _id: { $in: part } });
  }

  const marks = [
    ...plan.remove.map((r) => ({
      updateOne: {
        filter: { _id: r.record_id },
        update: {
          $set: {
            status: "undone",
            "migration_result.undone_at": now,
            "migration_result.message":
              "Import undone: the person and login account this row created were removed.",
          },
        },
      },
    })),
    ...plan.terms.map((r) => ({
      updateOne: {
        filter: { _id: r.record_id },
        update: {
          $set: {
            "migration_result.undone_at": now,
            "migration_result.message":
              "Import undone: the term this row added was removed. Changes this row made to the person were not reverted.",
          },
        },
      },
    })),
  ];
  for (const part of chunks(marks)) {
    await StagingRecord.bulkWrite(part, { ordered: false });
  }

  return {
    removed_profiles: plan.remove.map((r) => ({
      profile_id: key(r.profile_id),
      gems_id: r.gems_id,
    })),
    removed_accounts: accountIds.map(key),
    removed_terms: termIds.map(key),
    kept: plan.keep.map((r) => ({ row_number: r.row_number, reason: r.reason })),
    updated_rows: plan.updated.length,
    vault_rows: vaultRows,
  };
}
