import Profile from "@/models/profile";
import ProfileTerm from "@/models/profileTerm";
import IdentityVault from "@/models/identityVault";

/* Deletes people's profiles together with everything that only exists for
 * them: their term history (ProfileTerm) and their encrypted identity
 * (IdentityVault: name, birthday, contact, GAD data).
 *
 * Every delete route must go through here. Two of the three used to remove
 * only the profile, which left ~10,000 term rows pointing at nothing and kept
 * deleted people's vault rows stored with nothing referencing them.
 *
 * Returns counts for the audit entry. Accounts (UserAuth) are deleted by the
 * caller, which owns the guards around them (self, last Admin). */
export async function deleteProfilesCascade(profileIds) {
  const ids = (profileIds || []).filter(Boolean);
  if (!ids.length) {
    return { profiles: 0, terms: 0, vault_rows: 0 };
  }

  const vaultRefs = (
    await Profile.find({ _id: { $in: ids } }, { vaultRef: 1 }).lean()
  )
    .map((p) => p.vaultRef)
    .filter(Boolean);

  const terms = await ProfileTerm.deleteMany({ profile_id: { $in: ids } });
  const vault = vaultRefs.length
    ? await IdentityVault.deleteMany({ vaultRef: { $in: vaultRefs } })
    : { deletedCount: 0 };
  const profiles = await Profile.deleteMany({ _id: { $in: ids } });

  return {
    profiles: profiles.deletedCount || 0,
    terms: terms.deletedCount || 0,
    vault_rows: vault.deletedCount || 0,
  };
}
