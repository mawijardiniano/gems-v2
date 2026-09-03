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

  return UserAuth.aggregate(pipeline);
}