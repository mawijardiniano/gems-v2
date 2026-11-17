import mongoose from "mongoose";
import UserAuth from "@/models/user";
import GemsProfile from "@/models/profile";
import ProfileTerm from "@/models/profileTerm";


export async function runAnalyticsAggregation({
  collegeFilter,
  courseFilter,
  schoolYear,
  semester,
}) {
  let termProfileIds = null;
  if (schoolYear || semester) {
    const termFilter = {};
    if (schoolYear) termFilter.school_year = schoolYear;
    if (semester) termFilter.semester = semester;

    const matchingTerms = await ProfileTerm.find(termFilter, {
      profile_id: 1,
    }).lean();

    termProfileIds = new Set(matchingTerms.map((t) => String(t.profile_id)));
  }

  const pipeline = [];

  if (termProfileIds) {
    const termProfileObjectIds = [...termProfileIds]
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    pipeline.push({
      $match: { personal_info_id: { $in: termProfileObjectIds } },
    });
  }

  const lookupPipeline = [];
  const profileMatch = {};
  if (collegeFilter) {
    profileMatch.$or = [
      { "affiliation.academic_information.college": collegeFilter },
      { "affiliation.employment_information.office": collegeFilter },
    ];
  }
  if (courseFilter) {
    profileMatch["affiliation.academic_information.course"] = courseFilter;
  }
  if (Object.keys(profileMatch).length > 0) {
    lookupPipeline.push({ $match: profileMatch });
  }

  pipeline.push({
    $lookup: {
      from: GemsProfile.collection.name,
      let: { pid: "$personal_info_id" },
      pipeline: [
        { $match: { $expr: { $eq: ["$_id", "$$pid"] } } },
        ...lookupPipeline,
      ],
      as: "personal_info_id",
    },
  });

  pipeline.push({
    $unwind: { path: "$personal_info_id", preserveNullAndEmptyArrays: true },
  });

  const rows = await UserAuth.aggregate(pipeline);

  /* Sex at birth is what the whole report is disaggregated by, and it lives in
     the vault. The `$lookup` above still returns the legacy `gadData` column,
     which goes empty once the strip lands — the report would then bucket every
     single person as "Unspecified" rather than fail, which is exactly the kind
     of wrong-but-quiet result this migration has to prevent. Overlaying the
     decrypted value here fixes every caller (summary and both report types)
     through one chokepoint. */
  await hydrateAnalyticsSex(rows);

  return rows;
}

/**
 * Writes the vault's `sexAtBirth` back onto each aggregated row's profile so
 * downstream filters and tallies read the real value.
 *
 * Kept in this module rather than imported from `userPopulate` because it reads
 * the aggregate's own row shape (profile nested under `personal_info_id`), and
 * it only ever touches `gadData`. Non-throwing: a vault failure degrades to the
 * legacy value that may still be present mid-migration.
 */
async function hydrateAnalyticsSex(rows) {
  const refs = rows
    .map((row) => row?.personal_info_id?.vaultRef)
    .filter(Boolean);
  if (!refs.length) return;

  let piiByRef;
  try {
    const { loadDecryptedPiiBatch } = await import("./profileBroker.js");
    piiByRef = await loadDecryptedPiiBatch(refs);
  } catch (err) {
    console.error("hydrateAnalyticsSex vault read failed:", err);
    return;
  }

  for (const row of rows) {
    const profile = row?.personal_info_id;
    if (!profile?.vaultRef) continue;
    const pii = piiByRef.get(String(profile.vaultRef));
    if (!pii?.sexAtBirth) continue;
    profile.gadData = { ...(profile.gadData || {}), sexAtBirth: pii.sexAtBirth };
  }
}