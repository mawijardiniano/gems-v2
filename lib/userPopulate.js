
export const USER_POPULATE_BASE = {
  model: "UserAuth",
  select: "username role personal_info_id",
  populate: {
    path: "personal_info_id",
    model: "GemsProfile",
    select:
      "personal.first_name personal.last_name personal.birthday personal.currentStatus gadData.sexAtBirth affiliation.academic_information college course year_level affiliation.employment_information office", // Only needed fields
  },
};
